/**
 * Tremblement par **trauma décroissant** — lot D.
 *
 * Deux règles du skill `paul-chess-juice`, non négociables :
 *
 * 1. **L'amplitude vaut le carré du trauma.** Douce en bas, franche en haut. Les
 *    événements *ajoutent* du trauma (`clamp(t + v, 0, 1)`), ils ne le remettent
 *    jamais à sa valeur : deux réussites coup sur coup doivent frapper plus fort
 *    qu'une seule.
 * 2. **Jamais `Math.random()` par frame.** Un décalage tiré à chaque image bourdonne
 *    comme de la neige. Le déplacement est piloté par trois sinusoïdes de fréquences
 *    incommensurables (×1, ×1,7, ×2,3).
 *
 * ⚠️ **Où ça s'applique** : sur un conteneur DOM, par transformation CSS, au-dessus
 * du `<Canvas>`. **Jamais sur la caméra 3D** — d'une part ça exigerait une boucle de
 * rendu continue et annulerait le `frameloop="demand"` du plateau, d'autre part et
 * surtout ça désaligne les cibles de toucher pendant la secousse. Le joueur désigne
 * des cases du doigt : secouer la caméra n'est pas un effet, c'est un bug
 * d'interaction.
 *
 * La boucle ne tourne **que** pendant qu'il reste du trauma, et écrit directement dans
 * `ref.current.style` : aucun rendu React n'est déclenché par le tremblement.
 */

import { useEffect, useRef } from 'react'
import { useJeu } from '../store'

/** Amplitude maximale, en pixels, atteinte à trauma = 1. */
const AMPLITUDE_MAX_PX = 22
/** Rotation maximale, en degrés, atteinte à trauma = 1. */
const ROTATION_MAX_DEG = 1.6
/** Trauma perdu par seconde. */
const DECROISSANCE_PAR_SECONDE = 1.2
/** Fréquence de base des sinusoïdes, en Hz. */
const FREQUENCE_HZ = 11

// ── état partagé (hors React : le tremblement ne doit rien re-rendre)

let trauma = 0
const abonnes = new Set<() => void>()

/** Trauma courant, 0 à 1. Exposé pour le débogage et les tests. */
export const traumaCourant = (): number => trauma

/**
 * Ajoute du trauma. **Additif et borné** — ne réinitialise pas.
 * Sans effet si le mouvement est réduit.
 */
export function ajouterTrauma(valeur: number): void {
  if (mouvementReduitActif()) return
  trauma = Math.min(1, Math.max(0, trauma + valeur))
  for (const reveiller of abonnes) reveiller()
}

/** Coupe net le tremblement (changement d'écran, réinitialisation). */
export function couperTremblement(): void {
  trauma = 0
  for (const reveiller of abonnes) reveiller()
}

/**
 * Le mouvement est-il réduit ? Réunit les **deux** sources : le réglage explicite du
 * store (`mouvementReduit`, accessible avant la première énigme) et la préférence
 * système `prefers-reduced-motion`. Dans ce cas on garde les célébrations —
 * confettis, étoiles, texte — mais on coupe tremblement et flashs : le jeu se joue
 * devant huit personnes dont on ne connaît pas la sensibilité, écran à 30 cm.
 */
export function mouvementReduitActif(): boolean {
  if (useJeu.getState().mouvementReduit) return true
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Rend une `ref` à poser sur le conteneur DOM à secouer (typiquement le div qui
 * enveloppe le plateau et la bande d'énigme, **au-dessus** du canvas 3D).
 *
 * ```tsx
 * const refTremblement = useTremblement()
 * return <div ref={refTremblement}>…</div>
 * ```
 *
 * Le conteneur reçoit un `transform` et est remis à `''` au repos : l'exagération est
 * transitoire, jamais un nouvel état de repos.
 */
export function useTremblement<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    let frame = 0
    let precedent = 0
    let actif = false

    const repos = () => {
      const el = ref.current
      if (el) {
        el.style.transform = ''
        el.style.willChange = ''
      }
    }

    const pas = (maintenant: number) => {
      const dt = precedent ? Math.min(0.05, (maintenant - precedent) / 1000) : 0
      precedent = maintenant

      trauma = Math.max(0, trauma - DECROISSANCE_PAR_SECONDE * dt)

      const el = ref.current
      if (el) {
        // Amplitude quadratique : c'est ce qui rend les petits événements discrets.
        const amplitude = trauma * trauma
        const t = (maintenant / 1000) * FREQUENCE_HZ * Math.PI * 2
        const x = Math.sin(t) * amplitude * AMPLITUDE_MAX_PX
        const y = Math.sin(t * 1.7) * amplitude * AMPLITUDE_MAX_PX
        const rot = Math.sin(t * 2.3) * amplitude * ROTATION_MAX_DEG
        el.style.willChange = 'transform'
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(3)}deg)`
      }

      if (trauma > 0.0005) {
        frame = requestAnimationFrame(pas)
      } else {
        trauma = 0
        actif = false
        frame = 0
        repos()
      }
    }

    const reveiller = () => {
      if (mouvementReduitActif()) {
        trauma = 0
        return
      }
      if (actif || trauma <= 0) return
      actif = true
      precedent = 0
      frame = requestAnimationFrame(pas)
    }

    abonnes.add(reveiller)
    reveiller()

    return () => {
      abonnes.delete(reveiller)
      if (frame) cancelAnimationFrame(frame)
      repos()
    }
  }, [])

  return ref
}
