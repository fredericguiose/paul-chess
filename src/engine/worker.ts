/**
 * Pilotage UCI de Stockfish WASM.
 *
 * Porté de la classe `Engine` de `scripts/engine-profile.mjs`, éprouvée sur 4827
 * positions : même contrat (`send`, `until`, `init`, `evaluate`), même découpage
 * manuel du tampon sur `\n`, même bornage des mats à ±`CLAMP_EVAL`.
 *
 * ⚠️ Décision d'architecture — pas de worker imbriqué.
 * `public/engine/stockfish-18-lite-single.js` **est déjà** un script de Web Worker :
 * chargé dans un contexte worker, il installe son propre `onmessage` et renvoie
 * chaque ligne UCI par `postMessage`. Le calcul WASM tourne donc hors du fil
 * principal dès qu'on fait `new Worker(CHEMIN_STOCKFISH)`. Envelopper ça dans un
 * second worker (`worker.ts` compilé par Vite) supposerait un worker imbriqué —
 * support historiquement fragile sur Safari mobile, et le jeu tourne sur un
 * téléphone un seul soir. Ce module possède donc le worker Stockfish et fait le
 * pilotage ; le travail restant côté fil principal est du découpage de lignes.
 *
 * Aucun import React, aucun import three.js, aucun accès au DOM.
 */

import { CLAMP_EVAL, type Centipions, type EvaluationBot } from '../types'

/** Servi en statique depuis `public/engine/`. Le loader trouve son `.wasm` seul. */
export const CHEMIN_STOCKFISH = '/engine/stockfish-18-lite-single.js'

/**
 * Réglages mesurés pour le mobile (skill `paul-chess-engine`). Mono-thread : aucun
 * `SharedArrayBuffer`, donc aucun en-tête COOP/COEP à configurer.
 * `Hash 16` et non 512 : 512 est réservé aux scripts d'analyse hors-ligne.
 */
const THREADS = 1
const HASH_MO = 16

/** 10-12 suffit : à `Threads 1` le coût est le démarrage, pas la recherche. */
export const PROFONDEUR = 10

/** Nombre de coups candidats demandés en MultiPV pour la faute et le garde-fou. */
export const MULTIPV_MAX = 16

/** Le téléchargement des 7,3 Mo peut être long sur un réseau guyanais. */
const DELAI_DEMARRAGE_MS = 180_000
/** Une recherche qui dépasse ça : le moteur est mort, on passe au coup de secours. */
const DELAI_RECHERCHE_MS = 30_000

export type EtatPilote = 'arrete' | 'chargement' | 'pret' | 'reflexion' | 'erreur'

/** Un coup candidat, tel que renvoyé par MultiPV. */
export interface CandidatCoup {
  /** Notation UCI (`e2e4`, `e7e8q`). */
  uci: string
  /**
   * Évaluation **après** ce coup, en centipions **du point de vue du camp qui doit
   * jouer à la racine** — donc du point de vue du bot quand c'est à lui.
   */
  cp: Centipions
  /** Rang MultiPV, 0 = meilleur coup. */
  rang: number
}

const borner = (cp: number): Centipions =>
  Math.max(-CLAMP_EVAL, Math.min(CLAMP_EVAL, cp))

/** Convertit `score cp|mate N` en centipions bornés. Un mat brut ferait exploser tous les seuils. */
const scoreVersCp = (type: string, valeur: number): Centipions =>
  type === 'mate' ? (valeur > 0 ? CLAMP_EVAL : -CLAMP_EVAL) : borner(valeur)

class ErreurMoteur extends Error {}

/** Une instance Stockfish pilotée en UCI. Un seul ordre de recherche à la fois. */
export class PiloteUci {
  private worker: Worker | null = null
  private tampon = ''
  private attente: ((ligne: string) => void) | null = null
  /** Sérialise les ordres : `until` n'a qu'un seul écouteur. */
  private file: Promise<unknown> = Promise.resolve()
  private multipvCourant = 1
  private etatInterne: EtatPilote = 'arrete'
  private surEtat: ((etat: EtatPilote) => void) | null = null

  get etat(): EtatPilote {
    return this.etatInterne
  }

  /** Un seul observateur : `moteur.ts` rediffuse. */
  observer(cb: ((etat: EtatPilote) => void) | null): void {
    this.surEtat = cb
  }

  private setEtat(etat: EtatPilote): void {
    if (this.etatInterne === etat) return
    this.etatInterne = etat
    this.surEtat?.(etat)
  }

  send(cmd: string): void {
    if (!this.worker) throw new ErreurMoteur('moteur non démarré')
    this.worker.postMessage(cmd)
  }

  /**
   * Attend une ligne satisfaisant `test`, en accumulant tout ce qui précède
   * (les lignes `info` portent les scores MultiPV).
   */
  until(test: (ligne: string) => boolean, delaiMs: number): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      const lignes: string[] = []
      const minuteur = setTimeout(() => {
        this.attente = null
        this.setEtat('erreur')
        reject(new ErreurMoteur(`aucune réponse UCI en ${delaiMs} ms`))
      }, delaiMs)
      this.attente = (ligne) => {
        lignes.push(ligne)
        if (!test(ligne)) return
        clearTimeout(minuteur)
        this.attente = null
        resolve(lignes)
      }
    })
  }

  /**
   * ⚠️ Le tampon stdout se découpe sur `\n` **à la main** : un seul message peut
   * contenir plusieurs lignes, ou une ligne coupée en deux.
   */
  private recevoir(donnee: unknown): void {
    if (typeof donnee !== 'string') return
    // On accumule le fragment TEL QUEL. Surtout ne pas compléter par un `\n` :
    // un message peut être une ligne coupée en deux, et « uci » + « ok » deviendrait
    // deux lignes cassées au lieu de `uciok`. Ce qui reste après la dernière
    // coupure demeure dans le tampon jusqu'au fragment suivant.
    this.tampon += donnee
    let nl: number
    while ((nl = this.tampon.indexOf('\n')) !== -1) {
      const ligne = this.tampon.slice(0, nl).trim()
      this.tampon = this.tampon.slice(nl + 1)
      if (ligne) this.attente?.(ligne)
    }
  }

  /** `uci` → `uciok`, options, `isready` → `readyok`. Idempotent. */
  async init(): Promise<void> {
    if (this.worker) return
    this.setEtat('chargement')
    const worker = new Worker(CHEMIN_STOCKFISH)
    this.worker = worker
    worker.onmessage = (e: MessageEvent) => this.recevoir(e.data)
    worker.onerror = () => this.setEtat('erreur')

    try {
      this.send('uci')
      await this.until((l) => l === 'uciok', DELAI_DEMARRAGE_MS)
      this.send(`setoption name Threads value ${THREADS}`)
      this.send(`setoption name Hash value ${HASH_MO}`)
      this.send('setoption name MultiPV value 1')
      this.multipvCourant = 1
      this.send('isready')
      await this.until((l) => l === 'readyok', DELAI_DEMARRAGE_MS)
      this.send('ucinewgame')
      this.setEtat('pret')
    } catch (e) {
      this.setEtat('erreur')
      throw e
    }
  }

  private enFile<T>(tache: () => Promise<T>): Promise<T> {
    const suivant = this.file.then(tache, tache)
    this.file = suivant.catch(() => undefined)
    return suivant
  }

  private async multipv(valeur: number): Promise<void> {
    if (this.multipvCourant === valeur) return
    this.send(`setoption name MultiPV value ${valeur}`)
    this.multipvCourant = valeur
    this.send('isready')
    await this.until((l) => l === 'readyok', DELAI_RECHERCHE_MS)
  }

  private async chercher(fen: string, profondeur: number): Promise<string[]> {
    this.setEtat('reflexion')
    try {
      this.send('position fen ' + fen)
      this.send('go depth ' + profondeur)
      return await this.until((l) => l.startsWith('bestmove'), DELAI_RECHERCHE_MS)
    } finally {
      if (this.etatInterne === 'reflexion') this.setEtat('pret')
    }
  }

  /** Score et meilleur coup. Le score est du point de vue du camp qui doit jouer. */
  evaluate(fen: string, profondeur = PROFONDEUR): Promise<EvaluationBot> {
    return this.enFile(async () => {
      await this.init()
      await this.multipv(1)
      const lignes = await this.chercher(fen, profondeur)
      let cp: Centipions | null = null
      let best: string | null = null
      for (const l of lignes) {
        if (l.includes('lowerbound') || l.includes('upperbound')) continue
        const m = /score (cp|mate) (-?\d+)/.exec(l)
        if (m) cp = scoreVersCp(m[1], Number(m[2]))
        const b = /^bestmove (\S+)/.exec(l)
        if (b) best = b[1] === '(none)' ? null : b[1]
      }
      return { cp: cp ?? 0, best }
    })
  }

  /**
   * Coups candidats classés, du meilleur au moins bon. `nb` est plafonné à
   * `MULTIPV_MAX` par l'appelant quand la couverture totale n'est pas nécessaire.
   */
  evaluerCandidats(
    fen: string,
    nb: number,
    profondeur = PROFONDEUR
  ): Promise<CandidatCoup[]> {
    return this.enFile(async () => {
      await this.init()
      const demande = Math.max(1, Math.floor(nb))
      await this.multipv(demande)
      const lignes = await this.chercher(fen, profondeur)

      // On garde, pour chaque indice MultiPV, la ligne de plus grande profondeur.
      const parIndice = new Map<number, { cp: Centipions; uci: string; depth: number }>()
      for (const l of lignes) {
        if (!l.startsWith('info') || l.includes('lowerbound') || l.includes('upperbound')) {
          continue
        }
        const d = /\bdepth (\d+)/.exec(l)
        const mpv = /\bmultipv (\d+)/.exec(l)
        const sc = /\bscore (cp|mate) (-?\d+)/.exec(l)
        const pv = /\bpv (\S+)/.exec(l)
        if (!d || !mpv || !sc || !pv) continue
        const indice = Number(mpv[1])
        const depth = Number(d[1])
        const precedent = parIndice.get(indice)
        if (precedent && precedent.depth > depth) continue
        parIndice.set(indice, { cp: scoreVersCp(sc[1], Number(sc[2])), uci: pv[1], depth })
      }

      return [...parIndice.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, v], rang) => ({ uci: v.uci, cp: v.cp, rang }))
    })
  }

  arreter(): void {
    if (!this.worker) return
    try {
      this.send('quit')
    } catch {
      // le worker est déjà mort : rien à faire
    }
    this.worker.terminate()
    this.worker = null
    this.attente = null
    this.tampon = ''
    this.multipvCourant = 1
    this.setEtat('arrete')
  }
}
