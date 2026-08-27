/**
 * Validation des réponses — lot C.
 *
 * **Un anniversaire n'est pas une dictée.** La règle centrale de ce fichier : une
 * réponse juste dans la tête du joueur doit être acceptée par la machine. Huit
 * personnes autour, un clavier de téléphone, une réponse dictée à voix haute puis
 * tapée à la va-vite — accents, majuscules, tirets et fautes de frappe n'ont aucune
 * valeur informative ici.
 *
 * Tolérance appliquée aux types `text` et `offscreen` :
 * 1. minuscules ;
 * 2. accents et diacritiques retirés ;
 * 3. ponctuation retirée (apostrophes, tirets, points…) ;
 * 4. espaces normalisés ;
 * 5. plusieurs réponses acceptées par énigme ;
 * 6. distance de Levenshtein ≤ 1 **sur les mots de plus de 4 lettres**.
 *
 * Le seuil de 4 lettres n'est pas décoratif : à ≤ 4 lettres, une distance de 1
 * confondrait `e4` et `e5`, ou `roi` et `roc`. Sur `sicilienne`, elle rattrape
 * `sicilienen`.
 *
 * `code` est **strict** aux espaces près : c'est un pavé numérique, il n'y a pas de
 * faute de frappe involontaire possible, et une tolérance y rendrait un code faux
 * acceptable.
 */

import type { Case, Enigme } from '../types'

// ─────────────────────────────────────────────────────────── normalisation

/** Tout ce qui n'est ni lettre ni chiffre ni espace disparaît. */
const PONCTUATION = /[^\p{L}\p{N}\s]/gu

/**
 * Casse, accents, ponctuation, espaces. Exportée pour pouvoir être testée à la main
 * dans la console avant le soir J.
 */
export function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(PONCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pour `code` : on ne garde que ce qui a été tapé au pavé. */
export function normaliserCode(valeur: string): string {
  return valeur.replace(/\s+/g, '')
}

// ─────────────────────────────────────────────────────────── distance

/** Longueur minimale d'un mot pour qu'une faute de frappe y soit tolérée. */
const LONGUEUR_MIN_TOLERANCE = 4

/**
 * Levenshtein classique, deux lignes de travail. Les chaînes comparées font
 * quelques dizaines de caractères au plus : inutile d'optimiser davantage.
 */
export function distanceLevenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  let precedente = Array.from({ length: b.length + 1 }, (_, i) => i)
  let courante = new Array<number>(b.length + 1)

  for (let i = 1; i <= a.length; i++) {
    courante[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1
      courante[j] = Math.min(courante[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + cout)
    }
    const tampon = precedente
    precedente = courante
    courante = tampon
  }

  return precedente[b.length]
}

/** Deux mots normalisés sont-ils équivalents ? */
function motsEquivalents(saisi: string, attendu: string): boolean {
  if (saisi === attendu) return true
  if (attendu.length <= LONGUEUR_MIN_TOLERANCE) return false
  return distanceLevenshtein(saisi, attendu) <= 1
}

/**
 * Comparaison tolérante d'une saisie à **une** réponse attendue.
 *
 * La tolérance s'applique mot à mot, pas sur la chaîne entière : sur une réponse de
 * trois mots, une distance globale de 1 laisserait passer une chaîne fausse
 * ailleurs, et surtout ne rattraperait pas deux fautes réparties sur deux mots
 * longs — le cas réel d'une frappe rapide.
 */
export function reponseCorrespond(saisie: string, attendue: string): boolean {
  const s = normaliser(saisie)
  const a = normaliser(attendue)
  if (s === a) return true
  if (s.length === 0) return false

  const motsS = s.split(' ')
  const motsA = a.split(' ')
  if (motsS.length !== motsA.length) return false

  return motsA.every((mot, i) => motsEquivalents(motsS[i], mot))
}

// ─────────────────────────────────────────────────────────── par type

/**
 * Valide une saisie pour n'importe quel type d'énigme.
 *
 * Conventions de `saisie` selon le type :
 * - `text`, `offscreen` : le texte tapé ;
 * - `code` : la suite de chiffres ;
 * - `choice` : **l'index du bouton**, en chaîne (`'2'`) ;
 * - `square-live`, `square-puzzle` : la case touchée (`'d4'`).
 *
 * `caseLive` sert au slot 7 : la case en prise est calculée à la volée sur la
 * position réelle, elle n'est pas connue à l'écriture de l'énigme. Quand elle est
 * fournie, elle prime sur `enigme.caseAttendue`.
 */
export function verifierReponse(enigme: Enigme, saisie: string, caseLive?: Case | null): boolean {
  switch (enigme.type) {
    case 'text':
    case 'offscreen':
      return (enigme.reponses ?? []).some((r) => reponseCorrespond(saisie, r))

    case 'code': {
      const s = normaliserCode(saisie)
      return s.length > 0 && (enigme.reponses ?? []).some((r) => normaliserCode(r) === s)
    }

    case 'choice': {
      const index = Number.parseInt(saisie, 10)
      return Number.isInteger(index) && index === enigme.bonneReponse
    }

    case 'square-live': {
      const attendue = caseLive ?? enigme.caseAttendue
      return attendue != null && saisie === attendue
    }

    case 'square-puzzle':
      return enigme.caseAttendue != null && saisie === enigme.caseAttendue
  }
}
