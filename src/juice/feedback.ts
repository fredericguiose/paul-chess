/**
 * Point d'entrée unique du juice — lot D.
 *
 * **Un seul appel par événement de jeu.** Les autres lots n'orchestrent pas les
 * couches : ils déclarent ce qui vient de se passer, et `feedback` empile les 5 à 8
 * réactions minuscules qui partent ensemble en ~100 ms (vibration, trauma, gerbe,
 * texte qui saute, flash, arrêt bref). C'est l'empilement qui se lit comme un impact,
 * et le point d'entrée unique qui garantit qu'il reste cohérent d'un événement à
 * l'autre.
 *
 * ```ts
 * import { feedback, feedbackPourCoup } from './juice/feedback'
 *
 * feedbackPourCoup(coup)          // énigme résolue : palier calculé par types.ts
 * feedback('finale')              // révélation
 * feedbackEchec()                 // mauvaise réponse
 * feedbackCoup({ capture: true }) // pièce prise
 * ```
 *
 * **Aucun appel ne bloque la saisie** : tout est asynchrone ou instantané, rien
 * n'attend, rien ne pose de couche cliquable.
 */

import { DUREE_ARRET_IMPACT } from '../theme'
import { palierPourCoup, TRAUMA_PAR_PALIER, type NumeroCoup, type Palier } from '../types'
import { ajouterTrauma, couperTremblement, mouvementReduitActif } from './useTremblement'
import {
  VIBRATIONS,
  VIBRATION_APPUI,
  VIBRATION_CAPTURE,
  VIBRATION_COUP,
  VIBRATION_ECHEC,
  vibrer
} from './useVibration'

/** Nature de l'événement. Détermine ce que la couche visuelle en fait. */
export type NatureFeedback =
  /** Énigme résolue. Le cas central : confettis, texte, tremblement. */
  | 'reussite'
  /** Mauvaise réponse. Secousse minime, pas de confettis, pas de texte. */
  | 'echec'
  /** Coup joué sans prise. Vibration seule : c'est l'action la plus fréquente. */
  | 'coup'
  /** Prise de pièce, ou faute du bot. Arrêt bref + éclat. */
  | 'capture'
  /** Séquence finale, révélation du cadeau. */
  | 'revelation'

export interface EvenementJuice {
  /** Identifiant croissant — sert de `key` pour remonter une animation. */
  id: number
  palier: Palier
  nature: NatureFeedback
  /** Texte à faire sauter à l'écran, ou `null`. */
  texte: string | null
  /** Un flash est-il autorisé pour cet événement ? Déjà filtré par l'accessibilité. */
  flash: boolean
  /** Origine de la gerbe, en fraction d'écran, ou `null` pour le défaut du palier. */
  origine: { x: number; y: number } | null
}

/**
 * Textes par palier. Ils sont lus à voix haute par la salle : courts, en majuscules,
 * et **différents à chaque palier** — c'est la moitié de l'escalade.
 */
export const TEXTES_PAR_PALIER: Record<Palier, string> = {
  petit: 'BRAVO !',
  moyen: 'SUPER !',
  grand: 'ÉNORME !!',
  finale: 'CHAMPION !!!'
}

// ─────────────────────────────────────────────────────────── bus

type Ecouteur = (e: EvenementJuice) => void
const ecouteurs = new Set<Ecouteur>()
let compteur = 0

/** `CoucheJuice` s'y abonne. Renvoie la fonction de désabonnement. */
export function abonnerJuice(fn: Ecouteur): () => void {
  ecouteurs.add(fn)
  return () => ecouteurs.delete(fn)
}

const emettre = (e: EvenementJuice) => {
  for (const fn of ecouteurs) fn(e)
}

/**
 * `CoucheJuice` enregistre ici de quoi vider ses particules, pour que `couperJuice`
 * n'ait pas besoin d'une référence sur le composant.
 */
let viderCouche: (() => void) | null = null
export function enregistrerVidage(fn: (() => void) | null): void {
  viderCouche = fn
}

// ─────────────────────────────────────────────────────────── arrêt bref

/**
 * L'équivalent du hit-stop : ~80 ms de figé sur les moments forts, ça vend l'impact.
 * Implémenté par une classe sur `<html>` que `CoucheJuice` traduit en
 * `animation-play-state: paused` — **la saisie passe à travers**, aucun pointeur
 * n'est capturé, aucune promesse n'est attendue.
 *
 * Une fois par événement, jamais en continu.
 */
let minuteurArret = 0
export function arretImpact(duree: number = DUREE_ARRET_IMPACT): void {
  if (typeof document === 'undefined') return
  const racine = document.documentElement
  racine.classList.add('juice-arret')
  window.clearTimeout(minuteurArret)
  minuteurArret = window.setTimeout(() => racine.classList.remove('juice-arret'), duree)
}

// ─────────────────────────────────────────────────────────── API

export interface OptionsFeedback {
  nature?: NatureFeedback
  /** Remplace le texte par défaut du palier. `null` pour n'en afficher aucun. */
  texte?: string | null
  /** Origine de la gerbe, en fraction d'écran (0-1). Défaut : centre-bas. */
  origine?: { x: number; y: number }
  /** Trauma imposé, sinon `TRAUMA_PAR_PALIER`. */
  trauma?: number
}

/**
 * Le point d'entrée. Empile toutes les couches d'un coup.
 *
 * Le tremblement et le flash sont coupés si `mouvementReduit` est coché ou si le
 * système demande `prefers-reduced-motion` — **les confettis, le texte et la
 * vibration restent** : on garde la célébration, on coupe l'agression.
 */
export function feedback(palier: Palier, options: OptionsFeedback = {}): void {
  const nature = options.nature ?? 'reussite'
  const reduit = mouvementReduitActif()

  // 1. Haptique. Passe le bruit d'une fête, et survit au mode silencieux.
  vibrer(nature === 'echec' ? VIBRATION_ECHEC : VIBRATIONS[palier])

  // 2. Trauma. Additif et borné ; l'amplitude vaut son carré (cf. useTremblement).
  const trauma = options.trauma ?? TRAUMA_PAR_PALIER[palier]
  ajouterTrauma(nature === 'echec' ? Math.min(0.12, trauma) : trauma)

  // 3. Arrêt bref, réservé aux moments forts. Quinze arrêts par partie, c'est un lag.
  if (nature === 'capture' || nature === 'revelation' || palier === 'finale') {
    arretImpact()
  }

  // 4. Couche visuelle.
  emettre({
    id: ++compteur,
    palier,
    nature,
    texte:
      options.texte === undefined
        ? nature === 'reussite' || nature === 'revelation'
          ? TEXTES_PAR_PALIER[palier]
          : null
        : options.texte,
    // Un flash à chaque énigme fatigue et devient risqué : réservé à `grand` et
    // `finale`, et jamais en mouvement réduit.
    flash: !reduit && (palier === 'grand' || palier === 'finale'),
    origine: options.origine ?? null
  })
}

/**
 * Énigme résolue au coup `coup`. **Le seul appel dont le lot C ait besoin.**
 * Le palier vient de `palierPourCoup` (`src/types.ts`) — l'escalade n'est pas
 * décidée ici.
 */
export function feedbackPourCoup(coup: NumeroCoup, options: OptionsFeedback = {}): void {
  feedback(palierPourCoup(coup), options)
}

/** Mauvaise réponse. Court, sec, sans confettis : ce n'est pas une punition. */
export function feedbackEchec(): void {
  feedback('petit', { nature: 'echec', texte: null })
}

/**
 * Coup joué. Le plus fréquent des événements, donc le plus discret : trop de juice
 * sur les actions courantes masque les vrais moments.
 */
export function feedbackCoup({ capture = false, echec = false } = {}): void {
  vibrer(capture ? VIBRATION_CAPTURE : VIBRATION_COUP)
  if (capture) {
    ajouterTrauma(0.18)
    arretImpact()
    emettre({
      id: ++compteur,
      palier: 'petit',
      nature: 'capture',
      texte: null,
      flash: false,
      origine: null
    })
  } else if (echec) {
    ajouterTrauma(0.1)
  }
}

/** Appui de bouton. Appelé par `Bouton`, rarement à la main. */
export function feedbackAppui(): void {
  vibrer(VIBRATION_APPUI)
}

/** Révélation finale : tout d'un coup, enchaîné sur la séquence de révélation. */
export function feedbackRevelation(texte?: string): void {
  feedback('finale', { nature: 'revelation', texte })
}

/** Coupe tout (changement d'écran, réinitialisation). */
export function couperJuice(): void {
  couperTremblement()
  viderCouche?.()
  vibrer(0)
  if (typeof document !== 'undefined') {
    window.clearTimeout(minuteurArret)
    document.documentElement.classList.remove('juice-arret')
  }
}
