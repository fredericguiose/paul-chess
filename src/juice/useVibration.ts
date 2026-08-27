/**
 * Vibration haptique — lot D.
 *
 * **La vibration, pas le son.** Une fête est bruyante : les sons seront inaudibles,
 * huit personnes autour du téléphone. La vibration passe le bruit, et elle passe
 * aussi le silencieux. Le son reste une option, coupée par défaut (`sonActif` dans
 * le store).
 *
 * La vibration n'est ni un mouvement ni un flash : elle **reste active** quand
 * `mouvementReduit` est coché. Ce réglage coupe le tremblement et les flashs, pas
 * la célébration.
 */

import { useCallback } from 'react'
import type { Palier } from '../types'

export type MotifVibration = number | number[]

/**
 * Motifs par palier. L'escalade est audible au doigt : une impulsion sèche pour les
 * premières énigmes, un roulement pour la finale. Quinze fois le même buzz s'oublie
 * dès le quatrième.
 */
export const VIBRATIONS: Record<Palier, MotifVibration> = {
  petit: 20,
  moyen: [20, 40, 20],
  grand: [30, 40, 30, 40, 60],
  finale: [40, 50, 40, 50, 40, 50, 140]
}

/** Coup joué : sèche et courte, elle ne doit pas se confondre avec une réussite. */
export const VIBRATION_COUP: MotifVibration = 12
/** Prise de pièce : un cran au-dessus du coup simple. */
export const VIBRATION_CAPTURE: MotifVibration = 35
/** Mauvaise réponse : deux temps courts, jamais long — ce n'est pas une punition. */
export const VIBRATION_ECHEC: MotifVibration = [12, 60, 12]
/** Appui de bouton : au seuil du perceptible. C'est la sensation « jeu mobile ». */
export const VIBRATION_APPUI: MotifVibration = 8

/**
 * Déclenche une vibration. Silencieusement sans effet là où l'API n'existe pas
 * (iOS Safari, bureau) — jamais d'exception, jamais de blocage de la saisie.
 * Renvoie `true` si le téléphone a accepté.
 */
export function vibrer(motif: MotifVibration): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { vibrate?: (m: MotifVibration) => boolean }
  if (typeof nav.vibrate !== 'function') return false
  try {
    return nav.vibrate(motif)
  } catch {
    return false
  }
}

/** Coupe une vibration en cours (fin de partie, démontage d'écran). */
export function couperVibration(): void {
  vibrer(0)
}

/** Version hook, pour les composants qui vibrent sur un événement d'interface. */
export function useVibration() {
  return useCallback((motif: MotifVibration) => vibrer(motif), [])
}
