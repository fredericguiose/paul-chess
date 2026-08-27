/**
 * La faute volontaire, via MultiPV.
 *
 * Elle doit être **plausible** : un coup jouable qui perd une pièce, qu'un joueur à
 * 1930 punit et après lequel il se sent fort. Pas le pire coup légal — `Qh5??`
 * gratuit se voit immédiatement et casse l'illusion.
 *
 * ⚠️ Toutes les valeurs (`fauteCible`, `fauteEntreCoups`) viennent de `REGLES_BOT`
 * dans `src/types.ts`. Aucune n'est recopiée ici.
 */

import { REGLES_BOT, type Centipions, type NumeroCoup } from '../types'
import type { CandidatCoup } from './worker'

/** Milieu de la fenêtre visée : c'est ce dont on cherche à s'approcher. */
export const CIBLE_FAUTE: Centipions =
  (REGLES_BOT.fauteCible.min + REGLES_BOT.fauteCible.max) / 2

/** L'évaluation, du point de vue du bot, tombe-t-elle dans la fenêtre visée ? */
export const dansLaFenetre = (cp: Centipions): boolean =>
  cp >= REGLES_BOT.fauteCible.min && cp <= REGLES_BOT.fauteCible.max

/**
 * Coup auquel la faute sera jouée, tiré une fois par partie dans
 * `REGLES_BOT.fauteEntreCoups`. `hasard` est injectable pour les tests.
 */
export function planifierFaute(hasard: () => number = Math.random): NumeroCoup {
  const { debut, fin } = REGLES_BOT.fauteEntreCoups
  const etendue = fin - debut + 1
  return debut + Math.min(etendue - 1, Math.floor(hasard() * etendue))
}

/**
 * La faute a-t-elle déjà eu lieu ? Déduit de l'évaluation, donc résistant à un
 * rechargement de page : le store persiste `evalBot`, pas le plan de la faute.
 */
export const fauteDejaJouee = (evalBot: Centipions): boolean =>
  evalBot <= REGLES_BOT.fauteCible.max

/** Faut-il jouer la faute maintenant ? `dejaJouee` vient de `fauteDejaJouee`. */
export const doitJouerLaFaute = (
  coup: NumeroCoup,
  coupPlanifie: NumeroCoup,
  dejaJouee: boolean
): boolean => !dejaJouee && coup >= coupPlanifie

/**
 * Dernière limite : au-delà, la faute est jouée même si aucun candidat ne tombe
 * exactement dans la fenêtre. Sans ça, une position fermée pourrait repousser la
 * faute indéfiniment et le bot n'aurait jamais à abandonner.
 */
export const fauteAForcer = (coup: NumeroCoup): boolean =>
  coup >= REGLES_BOT.fauteEntreCoups.fin

export interface ChoixFaute {
  choix: CandidatCoup | null
  /** Le coup retenu tombe dans `REGLES_BOT.fauteCible`. */
  dansLaFenetre: boolean
  /** Le pire coup légal a été exclu des candidats (couverture totale seulement). */
  pireExclu: boolean
}

/**
 * Choisit la faute parmi les candidats MultiPV.
 *
 * Exclusions : le meilleur coup (rang 0 — ce ne serait pas une faute) et, quand les
 * candidats couvrent **tous** les coups légaux, le pire (ce serait grossier).
 *
 * Renvoie `choix: null` si rien ne tombe dans la fenêtre et que `forcer` est faux :
 * l'appelant jouera normalement et retentera au coup suivant.
 */
export function choisirFaute(
  candidats: readonly CandidatCoup[],
  options: { couvreTousLesCoups?: boolean; forcer?: boolean } = {}
): ChoixFaute {
  const vide: ChoixFaute = { choix: null, dansLaFenetre: false, pireExclu: false }
  if (candidats.length === 0) return vide

  const parCp = [...candidats].sort((a, b) => b.cp - a.cp)
  let eligibles = parCp

  // Le meilleur coup n'est pas une faute.
  if (eligibles.length > 1) eligibles = eligibles.slice(1)

  // Le pire coup légal se voit. On ne l'écarte que si on sait qu'il est le pire.
  let pireExclu = false
  if (options.couvreTousLesCoups && eligibles.length > 1) {
    eligibles = eligibles.slice(0, -1)
    pireExclu = true
  }

  const fenetre = eligibles.filter((c) => dansLaFenetre(c.cp))
  if (fenetre.length > 0) {
    const choix = fenetre.reduce((a, b) =>
      Math.abs(b.cp - CIBLE_FAUTE) < Math.abs(a.cp - CIBLE_FAUTE) ? b : a
    )
    return { choix, dansLaFenetre: true, pireExclu }
  }

  if (!options.forcer) return { ...vide, pireExclu }

  // Rien dans la fenêtre. On préfère trop perdu à pas assez : un coup sous la
  // fenêtre laisse le garde-fou et l'abandon opérants, un coup au-dessus non.
  const sousLaFenetre = eligibles.filter((c) => c.cp < REGLES_BOT.fauteCible.min)
  const choix =
    sousLaFenetre.length > 0
      ? sousLaFenetre.reduce((a, b) => (b.cp > a.cp ? b : a))
      : eligibles.reduce((a, b) => (b.cp < a.cp ? b : a))

  return { choix, dansLaFenetre: false, pireExclu }
}
