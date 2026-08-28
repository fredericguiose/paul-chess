/**
 * L'équilibre : faire durer la partie jusqu'à la faute.
 *
 * ⚠️ Pourquoi ce fichier existe. Avant lui, le bot lâchait une pièce entre le 6ᵉ et
 * le 8ᵉ coup, puis le garde-fou l'obligeait à rester perdant. Un joueur à 1930 avec
 * une pièce d'avance face à un adversaire qui s'auto-sabote mate vers le 12ᵉ-15ᵉ
 * coup — et **les énigmes des slots suivants ne sont jamais vues**. Des gens les
 * avaient écrites.
 *
 * C'est la perte de contenu, mais par l'autre bout : on l'avait traitée du côté
 * « la partie ne doit pas se terminer trop tard », jamais du côté « trop tôt ».
 *
 * La parade : avant la faute, le bot ne cherche **ni à gagner ni à perdre**. Il
 * choisit, parmi les candidats MultiPV, celui dont l'évaluation est la plus proche
 * de zéro. La partie reste vivante et indécise jusqu'au moment prévu.
 *
 * Sans ça, deux échecs symétriques :
 * - à pleine force, Stockfish écrase un joueur à 1930 et c'est **lui** qui perd ;
 * - bridé trop bas, il lâche du matériel tout seul et la partie finit trop tôt.
 *
 * Toutes les valeurs viennent de `REGLES_BOT` dans `src/types.ts`.
 */

import { REGLES_BOT, type Centipions, type NumeroCoup } from '../types'
import type { CandidatCoup } from './worker'

/**
 * Le bot doit-il jouer l'équilibre ? Oui tant que la faute n'a pas eu lieu et qu'on
 * n'a pas atteint le coup où elle est planifiée.
 */
export const doitEquilibrer = (coup: NumeroCoup, fauteJouee: boolean): boolean =>
  !fauteJouee && coup < REGLES_BOT.fauteEntreCoups.debut

/** L'évaluation est-elle dans la bande d'équilibre ? */
export const dansLaBande = (cp: Centipions): boolean =>
  Math.abs(cp) <= REGLES_BOT.bandeEquilibre

/**
 * Choisit le coup qui laisse la position la plus égale.
 *
 * On vise zéro, pas le meilleur coup : un bot qui joue au mieux gagne, un bot qui
 * joue au pire perd, et les deux terminent la partie avant l'heure.
 *
 * Renvoie `null` si aucun candidat n'est fourni — l'appelant jouera librement.
 */
export function choisirEquilibre(candidats: readonly CandidatCoup[]): CandidatCoup | null {
  if (candidats.length === 0) return null

  // Priorité aux coups qui tiennent dans la bande ; à défaut, le moins déséquilibré.
  const dedans = candidats.filter((c) => dansLaBande(c.cp))
  const pool = dedans.length > 0 ? dedans : candidats

  return pool.reduce((a, b) => (Math.abs(b.cp) < Math.abs(a.cp) ? b : a))
}
