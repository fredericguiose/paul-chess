/**
 * La règle d'abandon.
 *
 * ⚠️ **Le verrou est temporel : après le 15ᵉ coup DU JOUEUR, jamais avant.**
 * L'évaluation n'est qu'une condition de crédibilité secondaire, garantie par le
 * garde-fou. Deux bugs déjà rencontrés, même cause racine — conditionner la fin de
 * partie à une évaluation :
 *   1. « abandon à −300 » : la faute met justement le bot entre −300 et −500, il
 *      abandonnait juste après sa propre faute. 8 énigmes vues sur 15.
 *   2. « abandon à −900 ET énigmes vues >= 13 » : coupait les énigmes 14 et 15 —
 *      la plus forte, celle du climax.
 *
 * La décision elle-même appartient à `useJeu.botPeutAbandonner()` (`src/store.ts`),
 * qui l'implémente déjà. Ce module l'**appelle**, il ne la réécrit pas. Tout ce qui
 * suit `botDoitAbandonner` est du diagnostic d'affichage, jamais une seconde règle.
 */

import { useJeu } from '../store'
import { CAMP_JOUEUR, NOMBRE_DE_COUPS, REGLES_BOT, type Centipions } from '../types'

/** La seule question qui compte. Déléguée au store, source unique de vérité. */
export const botDoitAbandonner = (): boolean => useJeu.getState().botPeutAbandonner()

/**
 * Garde-fou de crédibilité, indépendant du calendrier : le joueur est capitaine de la
 * sélection de Guyane. Ne jamais faire abandonner le bot dans une position égale ou
 * gagnante pour lui — il le verrait à l'instant exact du climax.
 */
export const positionPerduePourLeBot = (evalBot: Centipions): boolean =>
  evalBot < REGLES_BOT.abandonSeuilEval

export interface DiagnosticAbandon {
  /** Coups du joueur effectivement joués. */
  coupsJoueur: number
  /** Coups du joueur restants avant l'ouverture du verrou temporel. */
  coupsRestants: number
  evalBot: Centipions
  /** Le 15ᵉ coup du joueur est-il joué ? */
  verrouTemporelOuvert: boolean
  /** L'évaluation rend-elle l'abandon crédible ? */
  credibiliteOk: boolean
  enigmesVues: number
  /** Verdict, tel que rendu par le store. */
  autorise: boolean
}

/**
 * Pour la console de secours et les tests. Les champs sont indicatifs ;
 * `autorise` vient du store, jamais d'un recalcul local.
 */
export function diagnosticAbandon(): DiagnosticAbandon {
  const { historique, evalBot } = useJeu.getState()
  const coupsJoueur = historique.filter((c) => c.camp === CAMP_JOUEUR).length
  return {
    coupsJoueur,
    coupsRestants: Math.max(0, REGLES_BOT.abandonApresCoup - coupsJoueur),
    evalBot,
    verrouTemporelOuvert: coupsJoueur >= REGLES_BOT.abandonApresCoup,
    credibiliteOk: positionPerduePourLeBot(evalBot),
    enigmesVues: useJeu.getState().enigmesVues(),
    autorise: botDoitAbandonner()
  }
}

/**
 * Aucune condition de défaite. Jamais : pas de limite de coups, pas de chronomètre,
 * pas de game over. Le cadeau est derrière le jeu, devant huit personnes — et une
 * limite annoncée puis non appliquée est pire qu'aucune limite (sa victoire médiane
 * fait 26 coups).
 *
 * `NOMBRE_DE_COUPS` est un **objectif** ratable sans conséquence : le dépasser ne
 * change que la mention à la révélation.
 */
export const objectifTenu = (): boolean => {
  const { historique } = useJeu.getState()
  return historique.filter((c) => c.camp === CAMP_JOUEUR).length <= NOMBRE_DE_COUPS
}
