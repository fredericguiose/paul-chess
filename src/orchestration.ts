/**
 * Le déroulé de la partie : qui joue, quand, et ce qui s'anime entre deux énigmes.
 *
 * C'est le seul endroit qui connaît **à la fois** le moteur, le store et les phases.
 * Les lots (moteur, plateau, énigmes, juice) s'ignorent mutuellement ; ce fichier
 * les fait se parler.
 *
 * Aucun composant de rendu ici — voir la règle d'architecture dans `PLAN.md`.
 */

import { Chess } from 'chess.js'
import {
  CAMP_BOT,
  CAMP_JOUEUR,
  plyVersCoup,
  type Camp,
  type Case,
  type CoupJoue,
  type Piece
} from './types'
import { useJeu } from './store'
import { demanderCoupBot } from './engine/moteur'

/**
 * Construit un `CoupJoue` à partir d'un SAN et de la position **avant** le coup.
 * Renvoie `null` si le coup est illégal — l'appelant ignore alors la saisie.
 */
export function jouerSan(fenAvant: string, san: string): CoupJoue | null {
  const chess = new Chess(fenAvant)
  const ply = useJeu.getState().historique.length
  let mv
  try {
    mv = chess.move(san)
  } catch {
    return null
  }
  if (!mv) return null

  return {
    ply,
    coup: plyVersCoup(ply),
    camp: mv.color === 'w' ? CAMP_JOUEUR : (CAMP_BOT as Camp),
    san: mv.san,
    from: mv.from as Case,
    to: mv.to as Case,
    piece: mv.piece as Piece,
    capture: (mv.captured as Piece | undefined) ?? null,
    echec: chess.inCheck(),
    mat: chess.isCheckmate(),
    fen: chess.fen()
  }
}

/** Le joueur a désigné un coup légal sur le plateau. */
export function jouerCoupJoueur(from: Case, to: Case, promotion?: string): boolean {
  const { fen } = useJeu.getState()
  const chess = new Chess(fen)
  let mv
  try {
    mv = chess.move({ from, to, promotion })
  } catch {
    return false
  }
  if (!mv) return false

  const coup = jouerSan(fen, mv.san)
  if (!coup) return false

  const s = useJeu.getState()
  s.enregistrerCoup(coup)
  s.setPhase('animationJoueur')
  return true
}

/**
 * Le tour du bot. Appelé après l'animation du coup du joueur.
 *
 * Ne décide **jamais** de la fin de partie lui-même : c'est `partieTerminee()` du
 * store qui tranche, sur le seul nombre de coups joués.
 */
export async function tourDuBot(): Promise<void> {
  const s = useJeu.getState()

  // Le joueur a-t-il maté ? Alors il n'y a plus de coup à demander.
  const chessAvant = new Chess(s.fen)
  if (chessAvant.isGameOver()) {
    s.setPhase('revelation')
    return
  }

  s.setPhase('reflexionBot')

  const decision = await demanderCoupBot({
    fen: s.fen,
    sansJoues: s.historique.map((c) => c.san),
    coup: s.coupCourant(),
    evalBot: s.evalBot
  })

  // Aucun coup légal : mat ou pat, la partie est finie.
  if (!decision) {
    useJeu.getState().setPhase('revelation')
    return
  }

  const apres = useJeu.getState()
  const coup = jouerSan(apres.fen, decision.san)
  if (!coup) {
    // Le moteur a proposé un coup illégal — ne jamais bloquer le jeu pour ça.
    console.error('[orchestration] coup du bot illégal, ignoré :', decision.san)
    apres.setPhase('enigme')
    return
  }

  apres.enregistrerCoup(coup)
  apres.setEvalBot(decision.cp)
  apres.setPhase('animationBot')
}

/**
 * Après l'animation du coup du bot : soit la partie est finie, soit on enchaîne sur
 * l'énigme suivante.
 *
 * ⚠️ **La fin ne dépend que du nombre de coups.** Aucun seuil d'évaluation ne décide
 * de rien : conditionner la fin de partie à une évaluation a coupé du contenu trois
 * fois de suite dans ce projet. Au dernier coup, celui qui a l'avantage gagne — et
 * c'est `issue()` qui le lit, une fois, à l'arrivée.
 */
export function apresCoupDuBot(): void {
  const s = useJeu.getState()

  if (s.partieTerminee()) {
    s.setPhase('revelation')
    return
  }

  // Mat ou pat avant la limite : la partie s'arrête là, forcément.
  const chess = new Chess(s.fen)
  if (chess.isGameOver()) {
    s.setPhase('revelation')
    return
  }

  s.setPhase('enigme')
  s.setPoseCamera('topDown')
}

/**
 * Énigme `square-live` du slot 7 : la case de la pièce que le bot vient de laisser
 * en prise. Calculée depuis la position réelle, donc juste quelle que soit la partie.
 *
 * Renvoie `null` si aucune pièce du bot n'est capturable gratuitement.
 */
export function casePieceEnPrise(fen: string): Case | null {
  const chess = new Chess(fen)
  if (chess.turn() !== 'w') return null

  const VALEUR: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
  let meilleure: { c: Case; v: number } | null = null

  for (const mv of chess.moves({ verbose: true })) {
    if (!mv.captured) continue
    const gain = VALEUR[mv.captured] ?? 0
    // Une pièce, pas un pion : c'est ça, « laisser une pièce en prise ».
    if (gain < 3) continue

    // La reprise est-elle possible ? Si oui ce n'est pas un cadeau.
    const apres = new Chess(fen)
    apres.move(mv.san)
    const reprise = apres
      .moves({ verbose: true })
      .some((r) => r.to === mv.to && (VALEUR[r.captured ?? 'p'] ?? 0) >= gain - 1)
    if (reprise) continue

    if (!meilleure || gain > meilleure.v) meilleure = { c: mv.to as Case, v: gain }
  }

  return meilleure?.c ?? null
}
