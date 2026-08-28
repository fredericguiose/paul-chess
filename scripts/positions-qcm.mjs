// Génère les positions des énigmes « quel est le meilleur coup ? ».
//
// Une énigme à choix multiple n'est honnête que si le meilleur coup est
// **incontestablement** le meilleur. Sinon le groupe conteste la correction, et
// c'est le seul type d'incident qui peut casser la soirée : huit personnes qui
// discutent la réponse pendant que le cadeau attend.
//
// D'où le filtre central : on ne garde une position que si Stockfish sépare son
// premier choix du deuxième d'au moins ECART_MINIMUM centipions. Le deuxième
// meilleur coup du moteur devient alors un leurre — plausible, puisque le moteur
// l'a lui-même classé deuxième, mais nettement inférieur.
//
// Deux contraintes de rendu, non négociables :
// - **trait aux blancs uniquement** : Echiquier2D dessine toujours les blancs en
//   bas et ne se retourne pas. Une position au trait noir se lirait à l'envers.
// - **coups en notation algébrique** (Cxd4), pas en UCI : c'est ce qu'il lit.
//
// Usage : node scripts/positions-qcm.mjs [profondeur] [nbPositions]

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { Chess } from 'chess.js'

// `--emit` seul : ne relance pas Stockfish, régénère juste le module TypeScript à
// partir du JSON déjà calculé. Trois minutes d'analyse ne doivent pas être le prix
// d'une retouche de mise en forme.
const SAUT = String.fromCharCode(10)
const EMIT_SEUL = process.argv.includes('--emit')
const PROFONDEUR = Number(process.argv[2] ?? 18)
const VOULUES = Number(process.argv[3] ?? 40)
const OUVRIERS = 8
const SF = 'tools/stockfish/stockfish-windows-x86-64-bmi2.exe'

/** Écart minimal entre le meilleur coup et le deuxième, en centipions. */
const ECART_MINIMUM = 250
/** Sous ce nombre de demi-coups, la position sort encore du livre : rien à trouver. */
const PLY_MINIMUM = 16
/** Bornes de lisibilité : trop de pièces sur 320 px et il ne voit plus rien. */
const PIECES_MAX = 24
const PIECES_MIN = 6
const CLAMP = 1500

class Moteur {
  constructor () {
    this.proc = spawn(SF, [], { stdio: ['pipe', 'pipe', 'ignore'] })
    this.buffer = ''
    this.attente = null
    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString()
      let nl
      while ((nl = this.buffer.indexOf('\n')) !== -1) {
        const ligne = this.buffer.slice(0, nl).trim()
        this.buffer = this.buffer.slice(nl + 1)
        this.attente?.(ligne)
      }
    })
  }

  envoyer (cmd) { this.proc.stdin.write(cmd + '\n') }

  jusqua (test) {
    return new Promise((resolve) => {
      const lignes = []
      this.attente = (l) => {
        lignes.push(l)
        if (test(l)) { this.attente = null; resolve(lignes) }
      }
    })
  }

  async demarrer (multipv) {
    this.envoyer('uci')
    await this.jusqua((l) => l === 'uciok')
    this.envoyer('setoption name Threads value 1')
    this.envoyer('setoption name Hash value 256')
    this.envoyer('setoption name MultiPV value ' + multipv)
    this.envoyer('isready')
    await this.jusqua((l) => l === 'readyok')
  }

  /** Les `multipv` meilleurs coups d'une position, du point de vue du trait. */
  async analyser (fen) {
    this.envoyer('ucinewgame')
    this.envoyer('position fen ' + fen)
    this.envoyer('go depth ' + PROFONDEUR)
    const lignes = await this.jusqua((l) => l.startsWith('bestmove'))

    // Seules les lignes de la profondeur finale comptent : les précédentes sont des
    // classements intermédiaires, et le 2e coup d'une profondeur 12 n'est pas le 2e
    // coup d'une profondeur 18. Les mélanger fabriquerait de faux écarts.
    const parRang = new Map()
    let profondeurMax = 0
    for (const l of lignes) {
      if (!l.startsWith('info ') || !l.includes(' multipv ')) continue
      const prof = Number(/ depth (\d+)/.exec(l)?.[1] ?? 0)
      const rang = Number(/ multipv (\d+)/.exec(l)?.[1] ?? 0)
      const cp = /score cp (-?\d+)/.exec(l)
      const mat = /score mate (-?\d+)/.exec(l)
      const coup = / pv (\S+)/.exec(l)?.[1]
      if (!rang || !coup || (!cp && !mat)) continue
      if (prof > profondeurMax) { profondeurMax = prof; parRang.clear() }
      if (prof < profondeurMax) continue
      const score = mat
        ? (Number(mat[1]) > 0 ? CLAMP : -CLAMP)
        : Math.max(-CLAMP, Math.min(CLAMP, Number(cp[1])))
      parRang.set(rang, { uci: coup, cp: score, mat: mat ? Number(mat[1]) : null })
    }
    return [...parRang.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v)
  }

  arreter () { this.envoyer('quit'); this.proc.kill() }
}

function uciVersSan (fen, uci) {
  try {
    const chess = new Chess(fen)
    const coup = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined
    })
    return coup?.san ?? null
  } catch {
    return null
  }
}

function nbPieces (fen) {
  return (fen.split(' ')[0].match(/[a-zA-Z]/g) ?? []).length
}

/** Positions candidates : trait aux blancs, hors ouverture, lisibles. */
async function candidates () {
  const parties = JSON.parse(await readFile('data/games.json', 'utf8'))
  const vues = new Set()
  const sortie = []

  for (const partie of parties) {
    if (partie.timeClass !== 'rapid') continue
    // Même filtre de fiabilité que le profil d'erreurs : sous 1450 en ligne, ses
    // parties ne ressemblent plus à son jeu actuel.
    if ((partie.myElo ?? 0) < 1450) continue

    let coups
    try {
      const lecture = new Chess()
      lecture.loadPgn(partie.pgn)
      coups = lecture.history({ verbose: true })
    } catch { continue }

    const rejeu = new Chess()
    for (let ply = 0; ply < coups.length; ply++) {
      const fen = rejeu.fen()
      if (
        ply >= PLY_MINIMUM &&
        rejeu.turn() === 'w' &&
        !rejeu.isCheck() &&
        nbPieces(fen) <= PIECES_MAX &&
        nbPieces(fen) >= PIECES_MIN &&
        rejeu.moves().length >= 6
      ) {
        // La clé ignore les compteurs de coups : deux parties peuvent atteindre la
        // même position par des chemins différents, ce serait deux fois la même énigme.
        const cle = fen.split(' ').slice(0, 4).join(' ')
        if (!vues.has(cle)) {
          vues.add(cle)
          sortie.push({ fen, partie: partie.id, ply })
        }
      }
      rejeu.move(coups[ply].san)
    }
  }
  return sortie
}

/** Mélange déterministe : le même tirage à chaque exécution, donc reproductible. */
function melangerStable (liste) {
  let graine = 20260827
  const suivant = () => {
    graine = (graine * 1103515245 + 12345) % 2147483648
    return graine / 2147483648
  }
  const copie = [...liste]
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(suivant() * (i + 1))
    const tampon = copie[i]
    copie[i] = copie[j]
    copie[j] = tampon
  }
  return copie
}


// ─────────────────────────────────────────────────────────── module TypeScript

/**
 * L'ordre des quatre boutons est mélangé **par position, de façon déterministe** :
 * si la bonne réponse tombait toujours au même bouton, il le repérerait au
 * troisième QCM et les énigmes suivantes ne vaudraient plus rien. Déterministe
 * parce que le mélange est figé à la génération : le fichier livré est le fichier
 * joué, aucun tirage ne se rejoue au démarrage.
 */
function melangerChoix (position, index) {
  const coups = [position.meilleur, ...position.leurres]
  let graine = 7919 + index * 104729
  for (let i = coups.length - 1; i > 0; i--) {
    graine = (graine * 1103515245 + 12345) % 2147483648
    const j = graine % (i + 1)
    const tampon = coups[i]
    coups[i] = coups[j]
    coups[j] = tampon
  }
  return { choix: coups, bonneReponse: coups.indexOf(position.meilleur) }
}

/** Deuxième indice : ce que le coup gagne, en langage de club. */
function indiceGain (ecart, mat) {
  if (mat != null) return 'Ce coup termine la partie.'
  if (ecart >= 900) return 'Le bon coup gagne une pièce lourde, ou mieux.'
  if (ecart >= 500) return 'Le bon coup gagne l’équivalent d’une pièce.'
  if (ecart >= 350) return 'Le bon coup gagne trois pions d’avantage.'
  return 'L’écart est net, mais il ne saute pas aux yeux.'
}

async function emettre () {
  const donnees = JSON.parse(await readFile('data/positions-qcm.json', 'utf8'))
  const entrees = donnees.positions.map((p, i) => {
    const { choix, bonneReponse } = melangerChoix(p, i)
    const capture = p.meilleur.includes('x')
    return {
      id: 'position-' + String(i + 1).padStart(2, '0'),
      fen: p.fen,
      choix,
      bonneReponse,
      ecart: p.ecart,
      indices: [
        capture
          ? 'Le bon coup prend quelque chose.'
          : 'Le bon coup ne prend rien : il menace.',
        indiceGain(p.ecart, p.mat)
      ]
    }
  })

  const lignes = entrees.map((e) => [
    '  {',
    "    id: '" + e.id + "',",
    "    fen: '" + e.fen + "',",
    '    choix: [' + e.choix.map((c) => "'" + c + "'").join(', ') + '],',
    '    bonneReponse: ' + e.bonneReponse + ',',
    '    ecart: ' + e.ecart + ',',
    '    indices: [' + e.indices.map((c) => "'" + c.replace(/'/g, "\\'") + "'").join(', ') + ']',
    '  }'
  ].join(SAUT)).join(',' + SAUT)

  const entete = [
    '/**',
    ' * Positions « quel est le meilleur coup ? » — **fichier généré, ne pas éditer à la main.**',
    ' *',
    ' * Source : `node scripts/positions-qcm.mjs`. Chaque position est tirée de ses propres',
    ' * parties (rapide, classement en ligne >= 1450), au trait des blancs, hors ouverture.',
    ' *',
    ' * Le coup correct et les trois leurres sortent du **MultiPV de Stockfish à la',
    ' * profondeur ' + donnees.profondeur + '** : les leurres sont les 2ᵉ, 3ᵉ et 4ᵉ choix du moteur. Ils sont donc',
    ' * plausibles par construction, et inférieurs par construction. Une position n’est',
    ' * retenue que si le meilleur coup devance le deuxième d’au moins ' + donnees.ecartMinimum,
    ' * centipions — sans cet écart, « le meilleur coup » se discute, et une correction',
    ' * contestée devant huit personnes est le seul incident qui peut casser la soirée.',
    ' *',
    ' * ' + donnees.positions.length + ' positions retenues sur ' + donnees.examinees + ' examinées. Triées par écart décroissant,',
    ' * donc **par difficulté croissante** : la première se voit, la dernière se cherche.',
    ' */',
    '',
    'export interface PositionQcm {',
    '  id: string',
    '  /** Position à afficher, trait aux blancs. */',
    '  fen: string',
    '  /** Les quatre coups proposés, en notation algébrique, déjà mélangés. */',
    '  choix: string[]',
    '  /** Index du bon coup dans `choix`. */',
    '  bonneReponse: number',
    '  /** Avance du meilleur coup sur le deuxième, en centipions. Sert au tri. */',
    '  ecart: number',
    '  indices: string[]',
    '}',
    '',
    'export const POSITIONS_QCM: readonly PositionQcm[] = [',
    lignes,
    ']',
    ''
  ].join(SAUT)

  await writeFile('src/riddles/positions.qcm.ts', entete)
  console.log(entrees.length + ' positions -> src/riddles/positions.qcm.ts')
}

async function main () {
  if (EMIT_SEUL) return emettre()

  const brutes = melangerStable(await candidates())
  console.log(brutes.length + ' positions candidates (trait blancs, hors ouverture).')

  const moteurs = await Promise.all(
    Array.from({ length: OUVRIERS }, async () => {
      const m = new Moteur()
      await m.demarrer(4)
      return m
    })
  )

  const retenues = []
  let curseur = 0
  let examinees = 0

  await Promise.all(
    moteurs.map(async (moteur) => {
      while (retenues.length < VOULUES && curseur < brutes.length) {
        const position = brutes[curseur++]
        examinees++
        let lignes
        try { lignes = await moteur.analyser(position.fen) } catch { continue }
        if (lignes.length < 4) continue

        const ecart = lignes[0].cp - lignes[1].cp
        if (ecart < ECART_MINIMUM) continue

        const sans = lignes.map((l) => uciVersSan(position.fen, l.uci))
        if (sans.some((s) => s == null) || new Set(sans).size !== sans.length) continue

        retenues.push({
          fen: position.fen,
          partie: position.partie,
          ply: position.ply,
          meilleur: sans[0],
          meilleurUci: lignes[0].uci,
          leurres: sans.slice(1),
          cp: lignes.map((l) => l.cp),
          ecart,
          mat: lignes[0].mat
        })
        console.log('  + ' + retenues.length + '/' + VOULUES + '  ' + sans[0] + ' (ecart ' + ecart + ')')
      }
    })
  )

  for (const m of moteurs) m.arreter()

  // Écart décroissant = difficulté croissante : un coup qui gagne une dame se voit,
  // un coup qui gagne trois pions se cherche. Le plan impose la difficulté croissante
  // du slot 1 au 15, on livre donc la liste déjà dans cet ordre.
  retenues.sort((a, b) => b.ecart - a.ecart)

  await writeFile(
    'data/positions-qcm.json',
    JSON.stringify(
      { profondeur: PROFONDEUR, ecartMinimum: ECART_MINIMUM, examinees, positions: retenues },
      null,
      2
    )
  )
  console.log('\n' + retenues.length + ' positions retenues sur ' + examinees + ' examinees -> data/positions-qcm.json')
}

main()
