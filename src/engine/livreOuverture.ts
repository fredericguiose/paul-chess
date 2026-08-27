/**
 * Livre d'ouverture : 4 coups scriptés, plus la variante `Nc3` du 3ᵉ coup.
 *
 * Le bot joue les noirs, donc c'est lui qui choisit : il conduit le joueur dans son
 * répertoire mesuré (258 parties avec les blancs, fiabilité cumulée 91 %).
 *
 * ⚠️ Les coups eux-mêmes vivent dans `LIVRE_OUVERTURE` et `LIVRE_VARIANTE_NC3`
 * (`src/types.ts`). Rien n'est recopié ici. Ne pas scripter au-delà : aux coups 5-6
 * la fiabilité est de 100 % sur 32 puis 11 parties, plancher statistique ~54 %.
 */

import {
  LIVRE_OUVERTURE,
  LIVRE_VARIANTE_NC3,
  plyVersCoup,
  type NumeroCoup
} from '../types'

export type LigneLivre = ReadonlyArray<{ joueur: string; bot: string }>

/** Ordre significatif : la ligne principale gagne en cas d'égalité de préfixe. */
export const LIGNES_LIVRE: readonly LigneLivre[] = [LIVRE_OUVERTURE, LIVRE_VARIANTE_NC3]

/** Nombre de coups scriptés de la ligne principale. Le moteur n'est pas interrogé avant. */
export const COUPS_SCRIPTES: NumeroCoup = LIVRE_OUVERTURE.length

/** `Nxd4+` et `Nxd4` sont le même coup. chess.js n'ajoute pas `!?`, on nettoie quand même. */
const normaliser = (san: string): string => san.replace(/[+#!?]/g, '').trim()

/** Une ligne du livre, aplatie en demi-coups : joueur, bot, joueur, bot… */
const demiCoups = (ligne: LigneLivre): string[] =>
  ligne.flatMap((c) => [normaliser(c.joueur), normaliser(c.bot)])

/**
 * La ligne du livre encore compatible avec les demi-coups joués, ou `null` si le
 * joueur est sorti des deux lignes. `sansJoues` contient **tous** les demi-coups
 * SAN depuis le début, dans l'ordre, le dernier étant celui qui vient d'être joué.
 */
export function ligneCorrespondante(sansJoues: readonly string[]): LigneLivre | null {
  const joues = sansJoues.map(normaliser)
  for (const ligne of LIGNES_LIVRE) {
    const attendus = demiCoups(ligne)
    if (joues.length > attendus.length) continue
    if (joues.every((san, i) => san === attendus[i])) return ligne
  }
  return null
}

/**
 * La réponse scriptée du bot, ou `null` s'il faut interroger le moteur.
 *
 * `sansJoues` doit être de longueur **impaire** : le joueur vient de jouer, c'est au
 * bot. Toute autre longueur renvoie `null` (le bot ne joue pas hors de son tour).
 */
export function reponseDuLivre(sansJoues: readonly string[]): string | null {
  if (sansJoues.length % 2 !== 1) return null
  const joues = sansJoues.map(normaliser)
  for (const ligne of LIGNES_LIVRE) {
    const attendus = demiCoups(ligne)
    if (joues.length >= attendus.length + 1) continue
    if (!joues.every((san, i) => san === attendus[i])) continue
    const reponse = attendus[joues.length]
    if (reponse) return reponse
  }
  return null
}

/** Le joueur est-il encore dans le livre ? */
export const estDansLeLivre = (sansJoues: readonly string[]): boolean =>
  ligneCorrespondante(sansJoues) !== null

/**
 * Premier coup où le moteur sera **interrogé**, compte tenu de la ligne suivie.
 * 5 sur la ligne principale (4 coups scriptés), 4 sur la variante `Nc3` (3 coups).
 * Hors livre : le coup en cours.
 *
 * ⚠️ Le moteur **démarre** au montage de l'app, bien avant : démarrage précoce,
 * première interrogation tardive. Ne pas confondre les deux.
 */
export function premierCoupInterroge(sansJoues: readonly string[]): NumeroCoup {
  const ligne = ligneCorrespondante(sansJoues)
  if (!ligne) return plyVersCoup(sansJoues.length)
  return plyVersCoup(demiCoups(ligne).length)
}
