/**
 * Point d'intersection → case, sélection, cases légales.
 *
 * **Aucune règle d'échecs n'est écrite ici** : tout vient de `chess.js`. Ce module
 * ne fait que deux choses — convertir entre coordonnées monde et cases, et traduire
 * un toucher en intention selon les conventions de Chess.com mobile.
 *
 * Tout est **pur** et sans dépendance à three.js : le mini-échiquier 2D SVG de secours
 * (mode sans WebGL) réutilise `resoudreToucher`, `casesLegalesDepuis` et
 * `piecesDepuisFen` tels quels.
 *
 * Repère : le joueur a les blancs et joue depuis le **bas de l'écran**, donc la 1ʳᵉ
 * ligne est en +Z et la colonne `a` en −X. Le plateau est centré sur l'origine et sa
 * surface est en y = 0.
 */

import { Chess } from 'chess.js'
import { plateau } from '../theme'
import {
  CAMP_JOUEUR,
  type Camp,
  type Case,
  type Colonne,
  type Ligne,
  type Piece as TypePiece
} from '../types'

export const COLONNES: readonly Colonne[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
export const LIGNES: readonly Ligne[] = ['1', '2', '3', '4', '5', '6', '7', '8']

/** Côté du damier seul, sans la bordure de bois. */
export const COTE_DAMIER = 8 * plateau.tailleCase
/** Côté du plateau bordure comprise — c'est lui qui doit tenir dans le cadrage. */
export const COTE_PLATEAU = COTE_DAMIER + 2 * plateau.bordure

// ─────────────────────────────────────────────────── cases ↔ index ↔ monde

export interface IndexCase {
  /** 0 = `a` … 7 = `h`. */
  colonne: number
  /** 0 = 1ʳᵉ ligne … 7 = 8ᵉ ligne. */
  ligne: number
}

export function caseVersIndex(c: Case): IndexCase {
  return { colonne: c.charCodeAt(0) - 97, ligne: c.charCodeAt(1) - 49 }
}

export function indexVersCase(colonne: number, ligne: number): Case | null {
  if (colonne < 0 || colonne > 7 || ligne < 0 || ligne > 7) return null
  return `${COLONNES[colonne]}${LIGNES[ligne]}` as Case
}

/** Centre de la case, en coordonnées monde. `y` = 0 : la surface du damier. */
export function centreCase(c: Case): [number, number, number] {
  const { colonne, ligne } = caseVersIndex(c)
  const t = plateau.tailleCase
  return [(colonne - 3.5) * t, 0, (3.5 - ligne) * t]
}

/**
 * L'inverse : `event.point` d'un pointer event r3f → la case touchée.
 *
 * C'est **tout** ce que demande la saisie. Pas de `Raycaster` instancié à la main,
 * pas de conversion écran → NDC : r3f a déjà fait le raycast.
 */
export function mondeVersCase(x: number, z: number): Case | null {
  const t = plateau.tailleCase
  return indexVersCase(Math.floor(x / t + 4), Math.floor(4 - z / t))
}

/** `a1` est sombre. */
export function estCaseClaire(c: Case): boolean {
  const { colonne, ligne } = caseVersIndex(c)
  return (colonne + ligne) % 2 === 1
}

/** Variante indexée, pour la texture du damier. */
export function estIndexClair(colonne: number, ligne: number): boolean {
  return (colonne + ligne) % 2 === 1
}

// ─────────────────────────────────────────────────── lecture d'une position

export const campDepuisCouleur = (c: 'w' | 'b'): Camp => (c === 'w' ? 'blancs' : 'noirs')
export const couleurDepuisCamp = (c: Camp): 'w' | 'b' => (c === 'blancs' ? 'w' : 'b')

export interface PieceSurPlateau {
  case: Case
  piece: TypePiece
  camp: Camp
}

/** Les pièces présentes dans une position, prêtes à être rendues. */
export function piecesDepuisFen(fen: string): PieceSurPlateau[] {
  const chess = new Chess(fen)
  const presentes: PieceSurPlateau[] = []
  for (const rangee of chess.board()) {
    for (const cellule of rangee) {
      if (!cellule) continue
      presentes.push({
        case: cellule.square as Case,
        piece: cellule.type,
        camp: campDepuisCouleur(cellule.color)
      })
    }
  }
  return presentes
}

export function pieceSur(fen: string, c: Case): PieceSurPlateau | null {
  const trouvee = new Chess(fen).get(c)
  if (!trouvee) return null
  return { case: c, piece: trouvee.type, camp: campDepuisCouleur(trouvee.color) }
}

export interface DestinationLegale {
  to: Case
  /** La destination capture-t-elle une pièce ? Pastille pleine vs anneau. */
  capture: boolean
  /** Promotions possibles sur cette destination, vide sinon. */
  promotions: TypePiece[]
}

/** Les coups légaux au départ d'une case, regroupés par destination. */
export function destinationsLegales(fen: string, depuis: Case): DestinationLegale[] {
  const chess = new Chess(fen)
  const parCase = new Map<Case, DestinationLegale>()

  for (const coup of chess.moves({ square: depuis, verbose: true })) {
    const to = coup.to as Case
    let entree = parCase.get(to)
    if (!entree) {
      entree = { to, capture: coup.isCapture(), promotions: [] }
      parCase.set(to, entree)
    }
    entree.capture = entree.capture || coup.isCapture()
    if (coup.promotion && !entree.promotions.includes(coup.promotion)) {
      entree.promotions.push(coup.promotion)
    }
  }

  return [...parCase.values()]
}

/** Juste les cases d'arrivée — c'est ce qu'affichent les pastilles. */
export function casesLegalesDepuis(fen: string, depuis: Case): Case[] {
  return destinationsLegales(fen, depuis).map((d) => d.to)
}

/** La case du roi en échec, ou `null`. Toujours surlignée. */
export function caseRoiEnEchec(fen: string): Case | null {
  const chess = new Chess(fen)
  if (!chess.isCheck()) return null
  const aJouer = chess.turn()
  for (const rangee of chess.board()) {
    for (const cellule of rangee) {
      if (cellule && cellule.type === 'k' && cellule.color === aJouer) {
        return cellule.square as Case
      }
    }
  }
  return null
}

// ─────────────────────────────────────────────────── conventions de saisie

/**
 * Ce qu'un toucher signifie. Le composant 3D ne décide de rien : il applique.
 */
export type ActionToucher =
  /** Case illégale, case vide, pièce adverse hors capture : **rien**. Pas de message. */
  | { type: 'rien' }
  | { type: 'selectionner'; case: Case }
  | { type: 'deselectionner' }
  | { type: 'jouer'; from: Case; to: Case }
  /** Un sélecteur de pièce doit s'afficher avant de jouer. */
  | { type: 'promotion'; from: Case; to: Case; choix: TypePiece[] }

/**
 * Les conventions de Chess.com mobile, que le joueur a dans les doigts :
 *
 * - toucher une de ses pièces → sélection (+ pastilles des arrivées légales)
 * - toucher une case légale → le coup se joue
 * - re-toucher la pièce sélectionnée → désélection
 * - toucher une autre de ses pièces → la sélection bascule
 * - toucher une case illégale → rien, jamais de message d'erreur
 *
 * L'ordre des tests compte : la destination légale est examinée **avant** la bascule
 * de sélection, sinon une capture sur une case occupée deviendrait indécidable.
 */
export function resoudreToucher(
  fen: string,
  selection: Case | null,
  touchee: Case,
  campControle: Camp = CAMP_JOUEUR
): ActionToucher {
  if (selection === touchee) return { type: 'deselectionner' }

  if (selection) {
    const cible = destinationsLegales(fen, selection).find((d) => d.to === touchee)
    if (cible) {
      return cible.promotions.length > 0
        ? { type: 'promotion', from: selection, to: touchee, choix: cible.promotions }
        : { type: 'jouer', from: selection, to: touchee }
    }
  }

  const occupante = pieceSur(fen, touchee)
  if (occupante && occupante.camp === campControle) {
    return { type: 'selectionner', case: touchee }
  }

  return { type: 'rien' }
}

/**
 * Le camp qui a le trait. Sert à ne pas laisser sélectionner pendant que le bot joue.
 */
export function campAuTrait(fen: string): Camp {
  return campDepuisCouleur(new Chess(fen).turn())
}
