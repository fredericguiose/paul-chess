/**
 * Confettis et étoiles — lot D.
 *
 * ⚠️ **Canvas 2D, dans une couche par-dessus le `<Canvas>` three.js.** Jamais un
 * système de particules dans la scène 3D : le plateau tourne en
 * `frameloop="demand"` et ne se redessine que quand quelque chose bouge. Une boucle
 * de particules continue annulerait toute l'économie de batterie, pour un effet
 * moins fluide et plus cher en GPU.
 *
 * La boucle rAF ne tourne **que** pendant qu'il reste des particules vivantes, et
 * s'arrête d'elle-même. Aucun état React : tout est écrit dans le canvas.
 *
 * L'escalade est ici, pas dans l'appelant : `exploser('petit')` lâche seize étoiles,
 * `exploser('finale')` lâche trois vagues pleine page. Quinze explosions identiques
 * fatiguent dès la quatrième.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { couleurs } from '../theme'
import type { Palier } from '../types'

type Forme = 'confetti' | 'etoile'

interface Particule {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vrot: number
  taille: number
  couleur: string
  forme: Forme
  vie: number
}

interface ReglagePalier {
  /** Particules par vague. */
  nb: number
  /** Nombre de vagues, espacées de `delaiVague` millisecondes. */
  vagues: number
  delaiVague: number
  /** Vitesse initiale, en px/s. */
  vitesse: number
  /** Demi-ouverture de la gerbe, en radians. */
  ouverture: number
  formes: Forme[]
  /** Deux canons dans les coins bas, au lieu d'une seule gerbe centrale. */
  canons: boolean
  /** Particules de pluie tombant du haut de l'écran, en plus des gerbes. */
  pluie: number
  taille: [number, number]
  vie: [number, number]
}

/**
 * Décisions de conception — le skill fixe les paliers, pas leur contenu :
 * `petit` = étoiles simples, `moyen` = gerbe plus large, `grand` = deux canons
 * pleine page, `finale` = tout d'un coup, trois vagues, avec pluie.
 */
const REGLAGES: Record<Palier, ReglagePalier> = {
  petit: {
    nb: 16,
    vagues: 1,
    delaiVague: 0,
    vitesse: 430,
    ouverture: 0.55,
    formes: ['etoile'],
    canons: false,
    pluie: 0,
    taille: [7, 13],
    vie: [0.7, 1.1]
  },
  moyen: {
    nb: 46,
    vagues: 1,
    delaiVague: 0,
    vitesse: 580,
    ouverture: 0.85,
    formes: ['etoile', 'confetti'],
    canons: false,
    pluie: 0,
    taille: [7, 15],
    vie: [0.9, 1.5]
  },
  grand: {
    nb: 60,
    vagues: 2,
    delaiVague: 130,
    vitesse: 780,
    ouverture: 0.7,
    formes: ['confetti', 'confetti', 'etoile'],
    canons: true,
    pluie: 18,
    taille: [8, 18],
    vie: [1.2, 2]
  },
  finale: {
    nb: 90,
    vagues: 3,
    delaiVague: 220,
    vitesse: 950,
    ouverture: 0.8,
    formes: ['confetti', 'confetti', 'etoile'],
    canons: true,
    pluie: 40,
    taille: [9, 22],
    vie: [1.6, 2.8]
  }
}

/** Palette de fête, tirée du thème — aucune couleur en dur. */
const PALETTE = [
  couleurs.accent,
  couleurs.liseré,
  couleurs.validation,
  couleurs.bot,
  couleurs.caseClaire,
  couleurs.texteClair
]

const GRAVITE = 1500
const FROTTEMENT = 0.86
/** Plafond : au-delà on ne voit pas la différence, on sent la chute d'images. */
const MAX_PARTICULES = 420

const entre = (min: number, max: number) => min + Math.random() * (max - min)

export interface PoigneeConfettis {
  /** Lâche une célébration du palier donné. Origine facultative, en fraction d'écran. */
  exploser: (palier: Palier, origine?: { x: number; y: number }) => void
  /** Vide la couche immédiatement (changement d'écran, réinitialisation). */
  vider: () => void
}

export interface ConfettisProps {
  /** Classe du canvas. Il reste toujours `pointer-events: none`. */
  className?: string
}

/**
 * Le canvas est piloté **impérativement** : la célébration est un événement, pas un
 * état. Un état de célébration dans React re-rendrait la bande d'énigme pendant que
 * le joueur y tape — un retour ne doit jamais gêner la saisie.
 */
export const Confettis = forwardRef<PoigneeConfettis, ConfettisProps>(
  function Confettis({ className }, ref) {
    const refCanvas = useRef<HTMLCanvasElement | null>(null)
    const refParticules = useRef<Particule[]>([])
    const refFrame = useRef(0)
    const refPrecedent = useRef(0)
    const refMinuteurs = useRef<number[]>([])
    const refBoucle = useRef<(() => void) | null>(null)

    useEffect(() => {
      const canvas = refCanvas.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      let dpr = 1
      const redimensionner = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1)
        canvas.width = Math.max(1, Math.floor(canvas.clientWidth * dpr))
        canvas.height = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      }
      redimensionner()
      window.addEventListener('resize', redimensionner)

      const dessiner = (p: Particule) => {
        const alpha = Math.min(1, p.vie / 0.35)
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(p.x * dpr, p.y * dpr)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.couleur
        // Contour sombre : c'est lui qui fait le cartoon, ici comme sur les pièces.
        ctx.strokeStyle = couleurs.contour
        ctx.lineWidth = 1.5 * dpr
        const s = p.taille * dpr
        if (p.forme === 'confetti') {
          // Écrasement-étirement : le confetti se plie au fil de sa rotation.
          const h = Math.max(1.5 * dpr, s * 0.55 * Math.abs(Math.cos(p.rot * 1.3)))
          ctx.beginPath()
          ctx.rect(-s / 2, -h / 2, s, h)
          ctx.fill()
          ctx.stroke()
        } else {
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? s * 0.6 : s * 0.26
            const a = (Math.PI / 5) * i - Math.PI / 2
            const x = Math.cos(a) * r
            const y = Math.sin(a) * r
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }
        ctx.restore()
      }

      const pas = (maintenant: number) => {
        const dt = refPrecedent.current
          ? Math.min(0.05, (maintenant - refPrecedent.current) / 1000)
          : 0.016
        refPrecedent.current = maintenant

        const parts = refParticules.current
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const frein = Math.pow(FROTTEMENT, dt * 60)
        let vivantes = 0
        for (const p of parts) {
          if (p.vie <= 0) continue
          p.vie -= dt
          p.vy += GRAVITE * dt
          p.vx *= frein
          p.vy *= frein
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.rot += p.vrot * dt
          if (p.vie > 0 && p.y < canvas.clientHeight + 60) {
            dessiner(p)
            vivantes++
          } else {
            p.vie = 0
          }
        }

        if (vivantes > 0) {
          if (parts.length > MAX_PARTICULES) {
            refParticules.current = parts.filter((p) => p.vie > 0)
          }
          refFrame.current = requestAnimationFrame(pas)
        } else {
          // Rien ne vit : on rend la main. L'exagération est transitoire.
          refParticules.current = []
          refFrame.current = 0
          refPrecedent.current = 0
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }

      const demarrer = () => {
        if (refFrame.current) return
        refPrecedent.current = 0
        refFrame.current = requestAnimationFrame(pas)
      }
      refBoucle.current = demarrer

      return () => {
        window.removeEventListener('resize', redimensionner)
        if (refFrame.current) cancelAnimationFrame(refFrame.current)
        refFrame.current = 0
        refBoucle.current = null
        for (const t of refMinuteurs.current) window.clearTimeout(t)
        refMinuteurs.current = []
        refParticules.current = []
      }
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        exploser: (palier: Palier, origine?: { x: number; y: number }) => {
          const canvas = refCanvas.current
          if (!canvas) return
          const L = canvas.clientWidth
          const H = canvas.clientHeight
          const r = REGLAGES[palier]

          const nouvelle = (
            x: number,
            y: number,
            vx: number,
            vy: number,
            bonusVie = 0
          ): Particule => ({
            x,
            y,
            vx,
            vy,
            rot: entre(0, Math.PI * 2),
            vrot: entre(-9, 9),
            taille: entre(r.taille[0], r.taille[1]),
            couleur: PALETTE[Math.floor(Math.random() * PALETTE.length)],
            forme: r.formes[Math.floor(Math.random() * r.formes.length)],
            vie: entre(r.vie[0], r.vie[1]) + bonusVie
          })

          const gerbe = (ox: number, oy: number, angle: number, nb: number) => {
            for (let i = 0; i < nb; i++) {
              const a = angle + entre(-r.ouverture, r.ouverture)
              const v = r.vitesse * entre(0.45, 1)
              refParticules.current.push(
                nouvelle(ox, oy, Math.cos(a) * v, Math.sin(a) * v)
              )
            }
          }

          const vague = () => {
            if (r.canons) {
              gerbe(L * 0.06, H * 0.98, -Math.PI / 2.6, Math.ceil(r.nb / 2))
              gerbe(L * 0.94, H * 0.98, -Math.PI + Math.PI / 2.6, Math.ceil(r.nb / 2))
            } else {
              gerbe((origine?.x ?? 0.5) * L, (origine?.y ?? 0.62) * H, -Math.PI / 2, r.nb)
            }
            for (let i = 0; i < r.pluie; i++) {
              refParticules.current.push(
                nouvelle(entre(0, L), entre(-H * 0.35, -10), entre(-70, 70), entre(30, 160), 1.2)
              )
            }
            refBoucle.current?.()
          }

          vague()
          for (let v = 1; v < r.vagues; v++) {
            refMinuteurs.current.push(window.setTimeout(vague, v * r.delaiVague))
          }
        },
        vider: () => {
          for (const t of refMinuteurs.current) window.clearTimeout(t)
          refMinuteurs.current = []
          refParticules.current = []
        }
      }),
      []
    )

    return (
      <canvas
        ref={refCanvas}
        aria-hidden
        className={className ?? 'pointer-events-none absolute inset-0 h-full w-full'}
      />
    )
  }
)
