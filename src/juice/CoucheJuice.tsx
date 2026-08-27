/**
 * Couche de célébration — lot D.
 *
 * ⚠️ **2D pur, par-dessus le `<Canvas>` three.js, hors de la scène 3D.** Deux raisons
 * non négociables :
 * 1. Le plateau tourne en `frameloop="demand"` : il ne se redessine que quand quelque
 *    chose bouge. Un système de particules dans la scène exigerait une boucle
 *    continue et annulerait l'économie de batterie.
 * 2. Le tremblement s'applique à un conteneur DOM par transformation CSS, **jamais à
 *    la caméra** : le joueur désigne des cases du doigt, et secouer la caméra
 *    désaligne les cibles de toucher pendant la secousse. Ce n'est plus un effet,
 *    c'est un bug d'interaction. Voir `useTremblement`.
 *
 * La couche est intégralement `pointer-events: none` : **un retour ne bloque jamais
 * la saisie.** Le joueur peut toucher le plateau pendant que les confettis tombent.
 *
 * Les animations de texte, de flash et d'onde sont pilotées en JavaScript, pas par
 * `@keyframes`. Ce n'est pas un caprice : `src/index.css` neutralise toutes les
 * animations CSS sous `prefers-reduced-motion` avec `!important`, ce qui ferait
 * disparaître la célébration entière alors qu'on ne veut couper que tremblement et
 * flashs. Le flash, lui, est déjà filtré en amont par `feedback`.
 */

import { useEffect, useRef, useState } from 'react'
import { couleurs } from '../theme'
import type { Palier } from '../types'
import { Confettis, type PoigneeConfettis } from './Confettis'
import { abonnerJuice, enregistrerVidage, type EvenementJuice } from './feedback'

/** Durée de vie du texte, par palier. L'escalade tient aussi à la durée. */
const DUREE_TEXTE: Record<Palier, number> = {
  petit: 750,
  moyen: 900,
  grand: 1200,
  finale: 2000
}

/** Taille du texte, en rem. `finale` doit se voir depuis le fond du salon. */
const TAILLE_TEXTE: Record<Palier, number> = {
  petit: 2.2,
  moyen: 2.9,
  grand: 3.8,
  finale: 5
}

/** Opacité maximale du flash. Volontairement basse : écran à 30 cm, huit paires d'yeux. */
const FLASH_MAX = 0.32
const DUREE_FLASH = 260
const DUREE_ONDE = 300

/** Sortie douce — pour le repos. */
const sortieDouce = (t: number) => 1 - Math.pow(1 - t, 3)

/** Dépassement — pour le « pop ». Jamais linéaire : linéaire = mécanique, mort. */
const depassement = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  const u = t - 1
  return 1 + c3 * u * u * u + c1 * u * u
}

export interface CoucheJuiceProps {
  /** Classes supplémentaires sur la couche. Elle reste toujours non cliquable. */
  className?: string
}

export function CoucheJuice({ className = '' }: CoucheJuiceProps) {
  const refConfettis = useRef<PoigneeConfettis | null>(null)
  const refTexte = useRef<HTMLDivElement | null>(null)
  const refFlash = useRef<HTMLDivElement | null>(null)
  const refOnde = useRef<HTMLDivElement | null>(null)
  const refDebut = useRef(0)
  const refFrame = useRef(0)
  const refEvenement = useRef<EvenementJuice | null>(null)

  // Seul état React de la couche : de quoi monter/démonter le texte. La couche est
  // une feuille de l'arbre, son rendu ne touche ni le plateau ni la bande d'énigme.
  const [evenement, setEvenement] = useState<EvenementJuice | null>(null)

  useEffect(() => {
    const animer = (maintenant: number) => {
      const e = refEvenement.current
      if (!e) {
        refFrame.current = 0
        return
      }
      const ms = maintenant - refDebut.current
      const dureeTexte = DUREE_TEXTE[e.palier]

      // ── texte : pop à dépassement, puis il s'élève et s'efface.
      const noeud = refTexte.current
      if (noeud && e.texte) {
        const entree = Math.min(1, ms / 300)
        const echelle = 0.35 + 0.65 * depassement(entree)
        const finKt = Math.max(0, (ms - (dureeTexte - 280)) / 280)
        const sortie = Math.min(1, Math.max(0, finKt))
        const montee = -34 * sortieDouce(sortie)
        // Écrasement-étirement à l'apparition : large puis haut, volume conservé.
        const etirement = 1 + 0.22 * (1 - entree)
        noeud.style.opacity = String(Math.min(1, ms / 90) * (1 - sortie))
        noeud.style.transform = `translate3d(-50%, calc(-50% + ${montee.toFixed(1)}px), 0) scale(${(echelle * etirement).toFixed(3)}, ${(echelle / etirement).toFixed(3)})`
      }

      // ── flash : montée quasi instantanée, sortie douce. Un seul, jamais de strobe.
      const flash = refFlash.current
      if (flash && e.flash) {
        const t = Math.min(1, ms / DUREE_FLASH)
        const courbe = t < 0.18 ? t / 0.18 : 1 - sortieDouce((t - 0.18) / 0.82)
        flash.style.opacity = String(FLASH_MAX * Math.max(0, courbe))
      }

      // ── onde : l'éclat d'une prise de pièce.
      const onde = refOnde.current
      if (onde && e.nature === 'capture') {
        const t = Math.min(1, ms / DUREE_ONDE)
        onde.style.opacity = String(0.55 * (1 - t))
        onde.style.transform = `translate(-50%, -50%) scale(${(0.3 + 1.5 * sortieDouce(t)).toFixed(3)})`
      }

      const fini = ms > Math.max(dureeTexte, DUREE_FLASH, DUREE_ONDE) + 40
      if (fini) {
        // Tout revient au repos : l'exagération est transitoire, jamais un nouvel état.
        refEvenement.current = null
        refFrame.current = 0
        if (flash) flash.style.opacity = '0'
        if (onde) onde.style.opacity = '0'
        setEvenement(null)
      } else {
        refFrame.current = requestAnimationFrame(animer)
      }
    }

    const desabonner = abonnerJuice((e) => {
      // Confettis d'abord : la gerbe part avant que React ait rendu quoi que ce soit.
      if (e.nature !== 'echec' && e.nature !== 'coup') {
        refConfettis.current?.exploser(e.palier, e.origine ?? undefined)
      }
      refEvenement.current = e
      refDebut.current = performance.now()
      setEvenement(e)
      if (!refFrame.current) refFrame.current = requestAnimationFrame(animer)
    })

    enregistrerVidage(() => {
      refConfettis.current?.vider()
      refEvenement.current = null
      setEvenement(null)
      if (refFlash.current) refFlash.current.style.opacity = '0'
      if (refOnde.current) refOnde.current.style.opacity = '0'
    })

    return () => {
      desabonner()
      enregistrerVidage(null)
      if (refFrame.current) cancelAnimationFrame(refFrame.current)
      refFrame.current = 0
    }
  }, [])

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-50 overflow-hidden ${className}`}
    >
      {/*
        L'arrêt bref (hit-stop) : `feedback.arretImpact()` pose cette classe sur
        `<html>` pendant ~80 ms. Déclaré ici pour ne pas toucher `src/index.css`,
        qui est du contrat partagé.
      */}
      <style>{`
        html.juice-arret *,
        html.juice-arret *::before,
        html.juice-arret *::after {
          animation-play-state: paused !important;
        }
      `}</style>

      <div
        ref={refFlash}
        style={{
          opacity: 0,
          background: `radial-gradient(circle at 50% 55%, ${couleurs.texteClair} 0%, ${couleurs.liseré} 45%, transparent 78%)`
        }}
        className="absolute inset-0"
      />

      <Confettis ref={refConfettis} />

      <div
        ref={refOnde}
        style={{
          opacity: 0,
          width: '40vmin',
          height: '40vmin',
          left: '50%',
          top: '50%',
          border: `0.9vmin solid ${couleurs.liseré}`,
          transform: 'translate(-50%, -50%) scale(0.3)'
        }}
        className="absolute rounded-full"
      />

      {evenement?.texte ? (
        <div
          key={evenement.id}
          ref={refTexte}
          className="absolute left-1/2 top-[38%] whitespace-nowrap font-titre"
          style={{
            opacity: 0,
            transform: 'translate3d(-50%, -50%, 0) scale(0.35)',
            fontSize: `${TAILLE_TEXTE[evenement.palier]}rem`,
            lineHeight: 1,
            color: couleurs.accent,
            // Contour épais + ombre portée : lisible sur le plateau comme sur le bois.
            WebkitTextStroke: `0.28rem ${couleurs.contour}`,
            paintOrder: 'stroke fill',
            textShadow: `0 0.35rem 0 ${couleurs.contour}, 0 0.6rem 1.2rem rgba(0,0,0,0.45)`
          }}
        >
          {evenement.texte}
        </div>
      ) : null}
    </div>
  )
}
