/**
 * La barre d'avantage, comme sur Chess.com.
 *
 * Elle ne sert plus à annoncer un abandon : la partie s'arrête au dernier coup et
 * **gagne celui qui a l'avantage**. La barre est donc le verdict, pas un indicateur.
 * On la montre à la fin, une fois, animée depuis le milieu pour qu'on voie de quel
 * côté elle penche.
 */

import { useEffect, useState } from 'react'
import { CLAMP_EVAL, REGLES_BOT, type Centipions } from '../types'

/**
 * Convertit une évaluation en part de barre revenant au joueur, entre 0 et 1.
 *
 * Échelle **non linéaire** : une différence d'un pion se voit beaucoup en début de
 * barre et de moins en moins ensuite. Une échelle linéaire sur ±1500 rendrait
 * invisible un avantage de deux pions, qui est pourtant décisif.
 */
export function partJoueur(evalBot: Centipions): number {
  // `evalBot` est du point de vue du bot : négatif = le joueur mène.
  const pourJoueur = -Math.max(-CLAMP_EVAL, Math.min(CLAMP_EVAL, evalBot))
  return 1 / (1 + Math.exp(-pourJoueur / 320))
}

export interface BarreAvantageProps {
  evalBot: Centipions
  issue: 'victoire' | 'nulle' | 'defaite'
}

export function BarreAvantage({ evalBot, issue }: BarreAvantageProps) {
  const cible = partJoueur(evalBot)
  // Part de 50/50 et s'anime vers la vraie valeur : on voit la barre pencher.
  const [part, setPart] = useState(0.5)

  useEffect(() => {
    const t = setTimeout(() => setPart(cible), 250)
    return () => clearTimeout(t)
  }, [cible])

  const pions = Math.abs(evalBot) / 100
  const ecart =
    Math.abs(evalBot) >= CLAMP_EVAL
      ? 'mat'
      : `${pions.toFixed(1).replace('.', ',')} pion${pions >= 2 ? 's' : ''}`

  const verdict =
    issue === 'victoire'
      ? 'Tu avais l’avantage'
      : issue === 'defaite'
        ? 'Il avait l’avantage'
        : 'Personne n’avait vraiment l’avantage'

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <div className="flex items-baseline justify-between text-xs text-texte-clair/70">
        <span>toi</span>
        <span>lui</span>
      </div>

      {/* Le fond est le camp du bot ; la portion claire est celle du joueur. */}
      <div
        className="relative h-7 w-full overflow-hidden rounded-full border-2 border-contour/70 bg-piece-bot"
        role="img"
        aria-label={`${verdict}, écart de ${ecart}`}
      >
        <div
          className="h-full bg-texte-clair transition-[width] duration-1000 ease-out"
          style={{ width: `${part * 100}%` }}
        />
        {/* Le trait du milieu : sans lui, on ne sait pas où est l'équilibre. */}
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-contour/50" />
      </div>

      <p className="text-sm text-texte-clair/80">
        {verdict}
        {issue !== 'nulle' && (
          <>
            {' : '}
            <strong className="text-lisere">{ecart}</strong>
          </>
        )}
      </p>
    </div>
  )
}

/** Seuil au-delà duquel on parle d'avantage. Exposé pour les tests. */
export const SEUIL_AVANTAGE = REGLES_BOT.seuilAvantage
