/**
 * La fin de partie.
 *
 * ⚠️ **Il n'y a plus d'abandon du bot.** Ce fichier s'appelait ainsi quand le bot
 * était censé jeter l'éponge après un nombre de coups donné. Mesuré au moteur, ce
 * réglage produisait une partie grotesque : le garde-fou obligeait le bot à rester
 * perdant, donc il rendait la position à chaque coup — jusqu'à laisser passer un mat
 * forcé au 20ᵉ.
 *
 * La règle est maintenant celle d'une vraie partie :
 *
 *   **`NOMBRE_DE_COUPS` coups. Gagne celui qui mate, ou celui qui a l'avantage
 *   au dernier coup.**
 *
 * La limite est donc réelle et appliquée — ce qui lève l'objection de départ, « une
 * limite annoncée puis non appliquée est pire qu'aucune limite ».
 *
 * Aucun seuil d'évaluation ne décide de la **fin** : seul le compte de coups le fait.
 * L'évaluation ne sert qu'à lire le **résultat**, une fois, à l'arrivée.
 */

import { useJeu } from '../store'
import { REGLES_BOT, type Centipions } from '../types'

/** La partie est-elle finie ? Uniquement sur le nombre de coups joués. */
export const partieFinie = (): boolean => useJeu.getState().partieTerminee()

/** Le bot est-il en position perdue ? Sert au diagnostic, jamais à finir la partie. */
export const positionPerduePourLeBot = (evalBot: Centipions): boolean =>
  evalBot <= REGLES_BOT.fauteCible.max

export interface DiagnosticFin {
  coupsJoues: number
  coupsRestants: number
  evalBot: Centipions
  issue: 'victoire' | 'nulle' | 'defaite'
  terminee: boolean
}

/** Photo de l'état de fin, pour les tests et la mise au point. */
export function diagnosticFin(): DiagnosticFin {
  const s = useJeu.getState()
  const coupsJoues = s.historique.filter((c) => c.camp === 'blancs').length
  return {
    coupsJoues,
    coupsRestants: Math.max(0, REGLES_BOT.abandonApresCoup - coupsJoues),
    evalBot: s.evalBot,
    issue: s.issue(),
    terminee: s.partieTerminee()
  }
}
