/**
 * Le plafond anti-retournement.
 *
 * Le joueur peut mal jouer. S'il donne une pièce au 12ᵉ coup, un bot bridé mais
 * compétent retourne la partie. Le garde-fou l'interdit structurellement : le bot ne
 * joue jamais un coup qui le ferait remonter au-dessus de `plafondGardeFou`, et si
 * aucun coup ne respecte le plafond, il joue le moins bon coup disponible.
 *
 * ⚠️ Le garde-fou ne s'active qu'une fois le bot **déjà** sous le plafond, c'est-à-dire
 * après la faute. L'appliquer plus tôt forcerait le bot à jouer le pire coup légal dès
 * le 5ᵉ coup : partie grotesque avant même la faute scriptée.
 *
 * Valeurs : `REGLES_BOT.plafondGardeFou` dans `src/types.ts`. Rien de recopié ici.
 */

import { REGLES_BOT, type Centipions } from '../types'
import type { CandidatCoup } from './worker'

/**
 * Le garde-fou est-il actif ? Il l'est dès que l'évaluation courante du bot est au
 * niveau du plafond ou en dessous — donc dès la faute, et pour tout le reste de la
 * partie puisqu'il empêche lui-même de remonter.
 */
export const gardeFouActif = (evalBot: Centipions): boolean =>
  evalBot <= REGLES_BOT.plafondGardeFou

/** Ce coup laisse-t-il le bot sous le plafond ? `cp` est du point de vue du bot. */
export const respecteLePlafond = (cp: Centipions): boolean =>
  cp <= REGLES_BOT.plafondGardeFou

export interface ChoixGardeFou {
  choix: CandidatCoup | null
  /** Faux quand aucun candidat ne respectait le plafond : repli sur le moins bon coup. */
  respecte: boolean
}

/**
 * Le meilleur coup qui reste sous le plafond — le bot doit rester un adversaire
 * crédible, pas seulement perdant. Si aucun candidat ne respecte le plafond, on
 * renvoie le moins bon des candidats et `respecte: false` : à l'appelant de
 * relancer avec une couverture MultiPV complète avant de s'y résoudre.
 */
export function coupSousPlafond(candidats: readonly CandidatCoup[]): ChoixGardeFou {
  if (candidats.length === 0) return { choix: null, respecte: false }

  const sous = candidats.filter((c) => respecteLePlafond(c.cp))
  if (sous.length > 0) {
    return { choix: sous.reduce((a, b) => (b.cp > a.cp ? b : a)), respecte: true }
  }
  return { choix: candidats.reduce((a, b) => (b.cp < a.cp ? b : a)), respecte: false }
}
