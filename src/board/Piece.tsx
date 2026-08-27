/**
 * Une pièce animée, cel-shadée, avec contour.
 *
 * **Identité par la case.** Le composant est monté avec la case comme clé : une pièce
 * qui se déplace démonte son instance de départ et monte celle d'arrivée, laquelle
 * s'anime *depuis* `origine`. Aucun registre d'identité de pièce à tenir, donc aucune
 * chance de le désynchroniser du FEN — et le FEN reste la seule source de vérité.
 *
 * Deux règles de game feel, appliquées telles quelles :
 * - **jamais linéaire.** Le déplacement sort en cubique ; le dépassement est mis dans
 *   l'écrasement-étirement, pas dans la position — une pièce qui dépasse sa case
 *   d'arrivée ferait douter de la case atteinte, dans un jeu où l'on désigne des cases.
 * - **l'exagération est transitoire.** L'écrasement à volume conservé revient au repos,
 *   sinon il cesse d'être lu comme un retour d'information.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useSpring, animated } from '@react-spring/three'
import type * as THREE from 'three'
import { DUREE_COUP, ressorts } from '../theme'
import { CAMP_BOT, type Camp, type Case, type Piece as TypePiece } from '../types'
import { GeometriePiece } from './pieces'
import { centreCase } from './interaction'

/** Hauteur de l'arc en cloche. Le cavalier saute, le reste glisse en frôlant. */
const ARC = { cavalier: 0.75, autres: 0.08 } as const

/** Amplitude de l'écrasement à l'arrivée : 1 = pas d'écrasement. */
const ECRASEMENT = 0.76
/** De combien une pièce sélectionnée se soulève. */
const LEVEE = 0.12

/** Sortie cubique : décélère, ne dépasse pas. */
const sortieCubique = (t: number) => 1 - Math.pow(1 - t, 3)

export interface ProprietesPiece {
  piece: TypePiece
  camp: Camp
  couleur: string
  /** Case occupée maintenant. */
  case: Case
  /** Case de départ : la pièce s'anime depuis là au montage. `null` = déjà en place. */
  origine?: Case | null
  selectionnee?: boolean
}

export function Piece3D({
  piece,
  camp,
  couleur,
  case: caseCourante,
  origine = null,
  selectionnee = false
}: ProprietesPiece) {
  const arrivee = useMemo(() => centreCase(caseCourante), [caseCourante])
  const depart = useMemo(() => (origine ? centreCase(origine) : arrivee), [origine, arrivee])
  const arc = piece === 'n' ? ARC.cavalier : ARC.autres

  // Progression du déplacement. `origine` ne change pas sur la durée de vie du
  // composant : la clé de montage est la case d'arrivée.
  const [{ t }, apiT] = useSpring(() => ({
    t: origine ? 0 : 1,
    config: { duration: DUREE_COUP, easing: sortieCubique }
  }))

  // Écrasement-étirement, déclenché à l'atterrissage. Ressort `pop` : il dépasse.
  const [{ ecrase }, apiEcrase] = useSpring(() => ({
    ecrase: 0,
    config: ressorts.pop
  }))

  useEffect(() => {
    if (!origine) return
    apiT.start({
      from: { t: 0 },
      to: { t: 1 },
      onRest: () => {
        apiEcrase.set({ ecrase: 1 })
        apiEcrase.start({ ecrase: 0 })
      }
    })
  }, [origine, apiT, apiEcrase])

  const [{ levee }] = useSpring(
    () => ({ levee: selectionnee ? 1 : 0, config: ressorts.pose }),
    [selectionnee]
  )

  // Interpolations scalaires plutôt qu'un tuple : `position={...}` et `scale={...}`
  // n'acceptent pas une `Interpolation` vers un tableau. Les props séparées sont
  // typées correctement et évitent une allocation de tableau par frame.
  const x = t.to((v) => depart[0] + (arrivee[0] - depart[0]) * v)
  const z = t.to((v) => depart[2] + (arrivee[2] - depart[2]) * v)
  const y = t.to((v) => {
    const cloche = Math.sin(Math.PI * Math.min(1, Math.max(0, v)))
    return depart[1] + (arrivee[1] - depart[1]) * v + cloche * arc
  })

  // Volume conservé : ce qu'on écrase en Y, on l'élargit en X/Z.
  const echelleY = ecrase.to((e) => 1 - e * (1 - ECRASEMENT))
  const echelleXZ = ecrase.to((e) => 1 / Math.sqrt(1 - e * (1 - ECRASEMENT)))

  return (
    <animated.group
      position-x={x}
      position-y={y}
      position-z={z}
      scale-x={echelleXZ}
      scale-y={echelleY}
      scale-z={echelleXZ}
    >
      <animated.group position-y={levee.to((v) => v * LEVEE)}>
        {/* Les deux camps se font face : le bot est retourné. */}
        <group rotation={[0, camp === CAMP_BOT ? Math.PI : 0, 0]}>
          <GeometriePiece piece={piece} couleur={couleur} />
        </group>
      </animated.group>
    </animated.group>
  )
}

/**
 * La pièce capturée, le temps de disparaître : fondu et rétrécissement, puis plus rien.
 *
 * Composant distinct de `Piece3D` — le fondu mute l'opacité des matériaux du sous-arbre,
 * et un hook conditionnel dans `Piece3D` aurait fait fondre les pièces vivantes.
 * Le parent la démonte quand le coup suivant arrive.
 */
export function PieceFantome({
  piece,
  camp,
  couleur,
  case: caseCourante
}: Omit<ProprietesPiece, 'origine' | 'selectionnee'>) {
  const groupe = useRef<THREE.Group>(null)
  const position = useMemo(() => centreCase(caseCourante), [caseCourante])

  const [{ sortie }] = useSpring(() => ({
    from: { sortie: 0 },
    to: { sortie: 1 },
    config: { duration: DUREE_COUP, easing: sortieCubique },
    onChange: ({ value }) => {
      const opacite = 1 - (value.sortie as number)
      groupe.current?.traverse((noeud) => {
        const materiau = (noeud as THREE.Mesh).material as THREE.Material | undefined
        if (!materiau || Array.isArray(materiau) || !('opacity' in materiau)) return
        materiau.transparent = true
        materiau.depthWrite = false
        materiau.opacity = opacite
      })
    }
  }))

  return (
    <animated.group
      ref={groupe}
      position={position}
      scale={sortie.to((v) => 1 - v * 0.55)}
    >
      <group rotation={[0, camp === CAMP_BOT ? Math.PI : 0, 0]}>
        <GeometriePiece piece={piece} couleur={couleur} />
      </group>
    </animated.group>
  )
}
