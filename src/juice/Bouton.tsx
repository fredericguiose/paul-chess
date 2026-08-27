/**
 * Bouton épais — lot D.
 *
 * ⚠️ **L'animation d'enfoncement ne se sacrifie jamais.** C'est ce détail, plus que
 * la couleur, qui donne la sensation « jeu mobile » : le bouton descend, l'ombre se
 * réduit, et il remonte avec un léger dépassement. Dans l'ordre de sacrifice du
 * skill, c'est l'un des deux derniers éléments à perdre, avec la célébration finale.
 *
 * Trois raisons de ne pas se contenter d'`active:` en CSS :
 * 1. Sur mobile, `:active` est déclenché tardivement et irrégulièrement selon le
 *    navigateur ; `pointerdown` est immédiat.
 * 2. Il faut vibrer à l'appui, pas au relâchement.
 * 3. Le retour au repos doit avoir une **courbe à dépassement**, pas la même que
 *    l'enfoncement — deux transitions distinctes, jamais linéaires.
 *
 * L'enfoncement **survit à `mouvementReduit`** : ce n'est ni un tremblement ni un
 * flash, c'est le retour de l'appui. Le supprimer donnerait un bouton mort.
 */

import { useCallback, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { feedbackAppui } from './feedback'

export type VarianteBouton =
  /** Action principale : jaune miel. */
  | 'accent'
  /** Valider une réponse : vert. */
  | 'validation'
  /** Action secondaire, « passer » : bois. */
  | 'bois'
  /** Le camp du bot, rouge brique. À réserver aux moments de tension. */
  | 'bot'

export type TailleBouton = 'sm' | 'md' | 'lg'

/** Biseau + dégradé + contour sombre. La face sombre est la profondeur du biseau. */
const VARIANTES: Record<VarianteBouton, { face: string; texte: string }> = {
  accent: { face: 'bg-accent border-accent-sombre', texte: 'text-texte' },
  validation: { face: 'bg-validation border-[#3f7420]', texte: 'text-texte-clair' },
  bois: { face: 'bg-bois border-bois-sombre', texte: 'text-texte-clair' },
  bot: { face: 'bg-bot border-[#75291d]', texte: 'text-texte-clair' }
}

const TAILLES: Record<TailleBouton, string> = {
  sm: 'px-4 py-2 text-lg rounded-xl',
  md: 'px-5 py-3 text-xl rounded-2xl',
  lg: 'px-7 py-4 text-2xl rounded-2xl'
}

/** Profondeur du biseau au repos, en pixels. C'est de là que descend le bouton. */
const BISEAU_PX = 6
/** Profondeur restante une fois enfoncé. Jamais 0 : le bouton ne doit pas s'aplatir. */
const BISEAU_ENFONCE_PX = 2

export interface BoutonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  children: ReactNode
  variante?: VarianteBouton
  taille?: TailleBouton
  /** Occupe toute la largeur disponible. */
  pleineLargeur?: boolean
  /** Vibration courte à l'appui. À couper pour un pavé numérique très sollicité. */
  vibration?: boolean
  className?: string
}

export function Bouton({
  children,
  variante = 'accent',
  taille = 'md',
  pleineLargeur = false,
  vibration = true,
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
  className = '',
  ...reste
}: BoutonProps) {
  const [enfonce, setEnfonce] = useState(false)
  const refEnfonce = useRef(false)
  const v = VARIANTES[variante]

  const enfoncer = useCallback(() => {
    if (disabled) return
    refEnfonce.current = true
    setEnfonce(true)
    if (vibration) feedbackAppui()
  }, [disabled, vibration])

  const relacher = useCallback(() => {
    if (!refEnfonce.current) return
    refEnfonce.current = false
    setEnfonce(false)
  }, [])

  return (
    <button
      {...reste}
      disabled={disabled}
      onPointerDown={(e) => {
        enfoncer()
        onPointerDown?.(e)
      }}
      onPointerUp={(e) => {
        relacher()
        onPointerUp?.(e)
      }}
      onPointerCancel={(e) => {
        relacher()
        onPointerCancel?.(e)
      }}
      onPointerLeave={(e) => {
        relacher()
        onPointerLeave?.(e)
      }}
      className={[
        'relative select-none border-solid font-titre tracking-wide',
        'border-x-0 border-t-0 outline-none',
        // Contour épais : c'est lui qui fait le cartoon, comme sur les pièces.
        'ring-2 ring-contour/70',
        TAILLES[taille],
        v.face,
        v.texte,
        pleineLargeur ? 'w-full' : '',
        disabled ? 'opacity-50' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        // Dégradé vertical : la lumière vient du haut, comme dans tout le registre.
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 55%, rgba(0,0,0,0.12) 100%)',
        borderBottomWidth: enfonce ? BISEAU_ENFONCE_PX : BISEAU_PX,
        // Le bouton descend exactement de ce que le biseau perd : la face haute
        // bouge, la base reste posée.
        transform: enfonce
          ? `translateY(${BISEAU_PX - BISEAU_ENFONCE_PX}px) scale(0.97)`
          : 'translateY(0) scale(1)',
        boxShadow: enfonce
          ? '0 1px 0 rgba(0,0,0,0.35)'
          : '0 4px 0 rgba(0,0,0,0.28), 0 6px 12px rgba(0,0,0,0.25)',
        // Deux courbes distinctes. Descente sèche et rapide ; remontée avec
        // dépassement — jamais linéaire, jamais la même dans les deux sens.
        transition: enfonce
          ? 'transform 60ms cubic-bezier(0.4, 0, 1, 1), border-bottom-width 60ms linear, box-shadow 60ms ease-out'
          : 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1), border-bottom-width 160ms ease-out, box-shadow 200ms ease-out',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {children}
    </button>
  )
}
