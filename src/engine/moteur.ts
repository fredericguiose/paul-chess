/**
 * API du moteur côté application. C'est le seul module que les lots B à F appellent.
 *
 * Deux moments **séparés**, à ne pas confondre :
 *   - `demarrerMoteur()` au montage de l'app, pendant l'écran d'intro, pour absorber
 *     le téléchargement des 7,3 Mo.
 *   - `demanderCoupBot()` interrogé seulement à partir du 5ᵉ coup : les 4 premiers
 *     sortent du livre d'ouverture sans toucher au moteur.
 *
 * Ce module expose des fonctions et un état observable. Aucun import React, aucun
 * import three.js, aucun accès au DOM, aucune écriture dans le store : il **renvoie**
 * une décision, l'appelant l'applique (`enregistrerCoup`, `setEvalBot`).
 */

import { Chess } from 'chess.js'
import { type Centipions, type EvaluationBot, type NumeroCoup } from '../types'
import { MULTIPV_MAX, PiloteUci, type CandidatCoup, type EtatPilote } from './worker'
import { premierCoupInterroge, reponseDuLivre } from './livreOuverture'
import {
  choisirFaute,
  doitJouerLaFaute,
  fauteAForcer,
  fauteDejaJouee,
  planifierFaute
} from './faute'
import { coupSousPlafond, gardeFouActif } from './gardeFou'
import { choisirEquilibre } from './equilibre'

export type EtatMoteur = EtatPilote

/** D'où vient le coup joué par le bot. Utile au débogage et à la révélation. */
export type SourceCoup = 'livre' | 'faute' | 'gardeFou' | 'libre' | 'secours'

export interface ContexteCoup {
  /** Position courante, bot au trait. */
  fen: string
  /** Tous les demi-coups SAN depuis le début, le dernier étant celui du joueur. */
  sansJoues: readonly string[]
  /** Numéro du coup en cours (1..N). */
  coup: NumeroCoup
  /** Évaluation courante du bot, en centipions de son point de vue (store `evalBot`). */
  evalBot: Centipions
  /** Force l'état de la faute. Par défaut déduit de `evalBot`. */
  fauteJouee?: boolean
}

export interface DecisionBot {
  /** Coup du bot en SAN, prêt pour `chess.move()`. */
  san: string
  /** Le même en UCI, ou `null` pour un coup du livre (aucune interrogation moteur). */
  uci: string | null
  /** Nouvelle évaluation du bot après son coup, à passer à `setEvalBot`. */
  cp: Centipions
  source: SourceCoup
  estLaFaute: boolean
  /** Temps de réflexion réel, en ms. Observable de l'extérieur (lot C). */
  dureeMs: number
  /** Le moteur a-t-il été interrogé pour ce coup ? Faux pour les coups du livre. */
  moteurInterroge: boolean
}

/**
 * Plancher de réflexion. Un coup du livre est instantané : sans ce plancher, la phase
 * `reflexionBot` clignerait, et « l'adversaire réfléchit » n'aurait jamais le temps de
 * s'afficher. 450 ms est du même ordre que les 200-400 ms mesurées sur mobile.
 */
export const DUREE_MINIMALE_REFLEXION_MS = 450

const pilote = new PiloteUci()
let demarrage: Promise<void> | null = null
let coupDeLaFaute: NumeroCoup = planifierFaute()
let derniereDureeMs = 0

const abonnes = new Set<(etat: EtatMoteur) => void>()
pilote.observer((etat) => {
  for (const cb of abonnes) cb(etat)
})

// ──────────────────────────────────────────────────────────── état observable

export const etatMoteur = (): EtatMoteur => pilote.etat
export const moteurEstPret = (): boolean =>
  pilote.etat === 'pret' || pilote.etat === 'reflexion'
export const reflexionEnCours = (): boolean => pilote.etat === 'reflexion'
export const dureeDerniereReflexion = (): number => derniereDureeMs

/** S'abonne aux changements d'état. Renvoie la fonction de désabonnement. */
export function surEtatMoteur(cb: (etat: EtatMoteur) => void): () => void {
  abonnes.add(cb)
  cb(pilote.etat)
  return () => abonnes.delete(cb)
}

// ──────────────────────────────────────────────────────────── cycle de vie

/**
 * À appeler **au montage de l'app**. Idempotent : plusieurs appels partagent la même
 * promesse. Ne jette pas — l'échec passe par l'état `erreur` et le coup de secours,
 * parce qu'un moteur mort ne doit pas empêcher la partie de se dérouler.
 */
export function demarrerMoteur(): Promise<void> {
  if (!demarrage) {
    demarrage = pilote.init().catch((e) => {
      console.error('[moteur] démarrage impossible', e)
      demarrage = null
    })
  }
  return demarrage
}

export function arreterMoteur(): void {
  pilote.arreter()
  demarrage = null
}

/** Remet le plan de la faute à zéro. À appeler avec `useJeu.reinitialiser()`. */
export function nouvellePartie(hasard?: () => number): NumeroCoup {
  coupDeLaFaute = planifierFaute(hasard)
  return coupDeLaFaute
}

/** Coup auquel la faute est planifiée pour cette partie. */
export const coupPlanifiePourLaFaute = (): NumeroCoup => coupDeLaFaute

/** Premier coup où le moteur sera interrogé, selon la ligne d'ouverture suivie. */
export const premierCoupMoteur = premierCoupInterroge

/** Évaluation brute d'une position, du point de vue du camp qui doit jouer. */
export async function evaluerPosition(fen: string): Promise<EvaluationBot> {
  await demarrerMoteur()
  return pilote.evaluate(fen)
}

// ──────────────────────────────────────────────────────────── décision du bot

const uciVersSan = (fen: string, uci: string): string | null => {
  const chess = new Chess(fen)
  try {
    const mv = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci.slice(4, 5) : undefined
    })
    return mv?.san ?? null
  } catch {
    return null
  }
}

/** Le SAN est-il jouable dans cette position ? chess.js suffixe les échecs, on essaie. */
function sanEstLegal(fen: string, san: string): boolean {
  const chess = new Chess(fen)
  try {
    return chess.move(san) !== null
  } catch {
    return false
  }
}

/**
 * Coup de secours, sans moteur : le moteur est mort ou n'a rien renvoyé. On préfère un
 * coup tranquille (ni capture, ni échec) pour ne pas retourner la partie par accident.
 * La position est déjà perdue pour le bot à ce stade, donc n'importe quel coup légal
 * la laisse perdue.
 */
function coupDeSecours(fen: string): string | null {
  const chess = new Chess(fen)
  const legaux = chess.moves({ verbose: true })
  if (legaux.length === 0) return null
  const tranquilles = legaux.filter((m) => !m.captured && !m.san.includes('+'))
  const pool = tranquilles.length > 0 ? tranquilles : legaux
  return pool[Math.floor(Math.random() * pool.length)].san
}

/**
 * Le coup du bot. Renvoie `null` si la position n'a aucun coup légal (mat ou pat) —
 * l'appelant conclut la partie.
 *
 * Ordre de décision, non permutable :
 *   1. livre d'ouverture (aucune interrogation du moteur) ;
 *   2. faute volontaire, si le coup planifié est atteint et qu'elle n'a pas eu lieu ;
 *   3. garde-fou, si le bot est déjà sous le plafond ;
 *   4. jeu libre.
 */
export async function demanderCoupBot(ctx: ContexteCoup): Promise<DecisionBot | null> {
  const debut = Date.now()
  const legaux = new Chess(ctx.fen).moves()
  if (legaux.length === 0) return null

  const finir = async (d: Omit<DecisionBot, 'dureeMs'>): Promise<DecisionBot> => {
    const ecoule = Date.now() - debut
    const reste = DUREE_MINIMALE_REFLEXION_MS - ecoule
    if (reste > 0) await new Promise((r) => setTimeout(r, reste))
    derniereDureeMs = Date.now() - debut
    return { ...d, dureeMs: derniereDureeMs }
  }

  // 1. Livre d'ouverture — le moteur n'est pas interrogé.
  const duLivre = reponseDuLivre(ctx.sansJoues)
  if (duLivre && sanEstLegal(ctx.fen, duLivre)) {
    return finir({
      san: duLivre,
      uci: null,
      cp: ctx.evalBot,
      source: 'livre',
      estLaFaute: false,
      moteurInterroge: false
    })
  }

  await demarrerMoteur()

  const dejaFautif = ctx.fauteJouee ?? fauteDejaJouee(ctx.evalBot)
  const faute = doitJouerLaFaute(ctx.coup, coupDeLaFaute, dejaFautif)
  const plafond = gardeFouActif(ctx.evalBot)

  try {
    // 4. Équilibre : tant que la faute n'a pas eu lieu, le bot vise zéro.
    //
    // ⚠️ Remplace l'ancien « jeu libre à pleine force ». Mesuré au moteur : à pleine
    // force le bot gagnait, et le garde-fou le forçait ensuite à tout rendre coup
    // après coup — jusqu'à laisser passer un mat forcé au 20e. Viser l'équilibre
    // donne une vraie partie, et l'issue redevient sincère.
    if (!faute && !plafond) {
      const demandeEq = Math.min(legaux.length, MULTIPV_MAX)
      const cands = await pilote.evaluerCandidats(ctx.fen, demandeEq)
      const choix = choisirEquilibre(cands)
      const sanEq = choix ? uciVersSan(ctx.fen, choix.uci) : null
      if (sanEq && choix) {
        return finir({
          san: sanEq,
          uci: choix.uci,
          cp: choix.cp,
          source: 'libre',
          estLaFaute: false,
          moteurInterroge: true
        })
      }
      throw new Error('aucun coup exploitable en équilibre')
    }

    // 2 et 3 ont besoin de candidats classés.
    const demande = Math.min(legaux.length, MULTIPV_MAX)
    let candidats = await pilote.evaluerCandidats(ctx.fen, demande)
    let couvreTousLesCoups = candidats.length >= legaux.length

    if (faute) {
      const forcer = fauteAForcer(ctx.coup)
      const { choix, dansLaFenetre } = choisirFaute(candidats, {
        couvreTousLesCoups,
        forcer
      })
      if (choix) {
        const san = uciVersSan(ctx.fen, choix.uci)
        if (san) {
          return finir({
            san,
            uci: choix.uci,
            cp: choix.cp,
            source: 'faute',
            estLaFaute: dansLaFenetre || forcer,
            moteurInterroge: true
          })
        }
      }
      // Rien de plausible dans la fenêtre : on joue normalement et on retente au
      // coup suivant (`fauteAForcer` finira par trancher).
    }

    if (plafond) {
      let choix = coupSousPlafond(candidats)
      // Aucun des candidats ne reste sous le plafond : le joueur a peut-être rendu la
      // position bonne pour le bot. On regarde alors TOUS les coups légaux avant de
      // se rabattre sur le moins bon.
      if (!choix.respecte && !couvreTousLesCoups) {
        candidats = await pilote.evaluerCandidats(ctx.fen, legaux.length)
        couvreTousLesCoups = candidats.length >= legaux.length
        choix = coupSousPlafond(candidats)
      }
      if (choix.choix) {
        const san = uciVersSan(ctx.fen, choix.choix.uci)
        if (san) {
          return finir({
            san,
            uci: choix.choix.uci,
            cp: choix.choix.cp,
            source: 'gardeFou',
            estLaFaute: false,
            moteurInterroge: true
          })
        }
      }
    }

    // Candidats inexploitables : on prend le meilleur qui se convertit en SAN.
    const utilisable = candidats.find((c: CandidatCoup) => uciVersSan(ctx.fen, c.uci))
    if (utilisable) {
      const san = uciVersSan(ctx.fen, utilisable.uci)
      if (san) {
        return finir({
          san,
          uci: utilisable.uci,
          cp: utilisable.cp,
          source: 'libre',
          estLaFaute: false,
          moteurInterroge: true
        })
      }
    }
    throw new Error('aucun candidat exploitable')
  } catch (e) {
    // Le moteur ne doit jamais bloquer la partie : le cadeau est derrière le jeu.
    console.error('[moteur] coup de secours', e)
    const san = coupDeSecours(ctx.fen)
    if (!san) return null
    return finir({
      san,
      uci: null,
      cp: ctx.evalBot,
      source: 'secours',
      estLaFaute: false,
      moteurInterroge: false
    })
  }
}
