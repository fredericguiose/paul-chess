/**
 * Les six pièces, en **primitives paramétriques**. C'est le style final, pas un
 * provisoire en attendant des modèles : une pièce d'échecs cartoon, ce sont des formes
 * grasses et simples avec un contour épais. Pas de `.glb`, pas de Draco, pas de
 * chargement de modèle.
 *
 * Hauteurs, rayon du socle et épaisseur du contour viennent de `theme.ts`. Les
 * **proportions internes** de chaque silhouette sont ci-dessous : `theme.ts` ne les
 * décrit pas encore (voir le rapport du lot B). Elles sont exprimées en fractions de
 * la hauteur restante après le socle, donc régler `theme.pieces.hauteurs` suffit à
 * changer l'allure générale sans toucher ce fichier.
 */

import type { ReactNode } from 'react'
import { Outlines } from '@react-three/drei'
import { couleurs, pieces as geom } from '../theme'
import { proprietesToon } from './toonMaterial'
import type { Piece as TypePiece } from '../types'
import { Blason } from './Blason'

const R = geom.socle.rayon
const HS = geom.socle.hauteur

/** Segments radiaux : assez pour être lisse en gros, assez peu pour être léger. */
const SEGMENTS = 16

/**
 * Une partie de pièce : un mesh cel-shadé avec son contour.
 *
 * `raycast={() => null}` est **volontaire** : la saisie passe par un plan invisible unique à
 * l'échelle du plateau (voir `Board3D`). Une pièce qui intercepterait le rayon
 * masquerait sa propre case.
 */
function Partie({
  couleur,
  position,
  rotation,
  children
}: {
  couleur: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  children: ReactNode
}) {
  return (
    <mesh position={position} rotation={rotation} raycast={() => null}>
      {children}
      <meshToonMaterial {...proprietesToon(couleur)} />
      <Outlines thickness={geom.epaisseurContour} color={couleurs.contour} />
    </mesh>
  )
}

/** Le socle, commun aux six pièces : c'est lui qui pose la pièce sur sa case. */
function Socle({ couleur }: { couleur: string }) {
  return (
    <Partie couleur={couleur} position={[0, HS / 2, 0]}>
      <cylinderGeometry args={[R * 0.9, R, HS, SEGMENTS]} />
    </Partie>
  )
}

/** Hauteur utile au-dessus du socle. */
const restante = (piece: TypePiece) => geom.hauteurs[piece] - HS

// ─────────────────────────────────────────────────────────── les six silhouettes

function Pion({ couleur }: { couleur: string }) {
  const h = restante('p')
  return (
    <>
      <Socle couleur={couleur} />
      <Partie couleur={couleur} position={[0, HS + 0.5 * h, 0]}>
        <cylinderGeometry args={[R * 0.42, R * 0.66, h, SEGMENTS]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.73 * h, 0]}>
        <sphereGeometry args={[0.27 * h, SEGMENTS, SEGMENTS / 2]} />
      </Partie>
    </>
  )
}

/**
 * Le cavalier regarde vers −Z. `Piece.tsx` retourne le groupe de 180° pour le bot,
 * de sorte que les deux camps se font face.
 */
function Cavalier({ couleur }: { couleur: string }) {
  const h = restante('n')
  return (
    <>
      <Socle couleur={couleur} />
      <Partie couleur={couleur} position={[0, HS + 0.24 * h, 0]}>
        <cylinderGeometry args={[R * 0.5, R * 0.72, 0.48 * h, SEGMENTS]} />
      </Partie>
      {/* Tête : un bloc penché vers l'avant. */}
      <Partie
        couleur={couleur}
        position={[0, HS + 0.72 * h, -0.06]}
        rotation={[-0.3, 0, 0]}
      >
        <boxGeometry args={[R * 0.78, 0.5 * h, R * 1.15]} />
      </Partie>
      {/* Museau. */}
      <Partie
        couleur={couleur}
        position={[0, HS + 0.62 * h, -R * 0.85]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[R * 0.2, R * 0.3, R * 0.5, SEGMENTS / 2]} />
      </Partie>
      {/* Oreille. */}
      <Partie couleur={couleur} position={[0, HS + h - 0.05 * h, R * 0.2]}>
        <coneGeometry args={[R * 0.22, 0.22 * h, SEGMENTS / 2]} />
      </Partie>
    </>
  )
}

function Fou({ couleur }: { couleur: string }) {
  const h = restante('b')
  return (
    <>
      <Socle couleur={couleur} />
      <Partie couleur={couleur} position={[0, HS + 0.29 * h, 0]}>
        <cylinderGeometry args={[R * 0.36, R * 0.68, 0.58 * h, SEGMENTS]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.7 * h, 0]}>
        <sphereGeometry args={[0.26 * h, SEGMENTS, SEGMENTS / 2]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.94 * h, 0]}>
        <coneGeometry args={[R * 0.22, 0.16 * h, SEGMENTS / 2]} />
      </Partie>
    </>
  )
}

function Tour({ couleur }: { couleur: string }) {
  const h = restante('r')
  /** Quatre merlons, aux quatre points cardinaux. */
  const merlons = [0, 1, 2, 3].map((i) => {
    const angle = (i * Math.PI) / 2 + Math.PI / 4
    return {
      cle: i,
      x: Math.cos(angle) * R * 0.62,
      z: Math.sin(angle) * R * 0.62
    }
  })

  return (
    <>
      <Socle couleur={couleur} />
      <Partie couleur={couleur} position={[0, HS + 0.36 * h, 0]}>
        <cylinderGeometry args={[R * 0.72, R * 0.86, 0.72 * h, SEGMENTS]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.77 * h, 0]}>
        <cylinderGeometry args={[R * 0.94, R * 0.82, 0.1 * h, SEGMENTS]} />
      </Partie>
      {merlons.map(({ cle, x, z }) => (
        <Partie key={cle} couleur={couleur} position={[x, HS + 0.91 * h, z]}>
          <boxGeometry args={[R * 0.4, 0.18 * h, R * 0.4]} />
        </Partie>
      ))}
    </>
  )
}

function Dame({ couleur }: { couleur: string }) {
  const h = restante('q')
  return (
    <>
      <Socle couleur={couleur} />
      <Partie couleur={couleur} position={[0, HS + 0.26 * h, 0]}>
        <cylinderGeometry args={[R * 0.36, R * 0.66, 0.52 * h, SEGMENTS]} />
      </Partie>
      {/* Calice évasé vers le haut. */}
      <Partie couleur={couleur} position={[0, HS + 0.64 * h, 0]}>
        <cylinderGeometry args={[R * 0.86, R * 0.36, 0.26 * h, SEGMENTS]} />
      </Partie>
      {/* Couronne. */}
      <Partie couleur={couleur} position={[0, HS + 0.8 * h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R * 0.66, R * 0.13, 8, SEGMENTS]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.91 * h, 0]}>
        <sphereGeometry args={[0.09 * h, SEGMENTS / 2, SEGMENTS / 4]} />
      </Partie>
    </>
  )
}

function Roi({ couleur }: { couleur: string }) {
  const h = restante('k')
  return (
    <>
      <Socle couleur={couleur} />
      <Partie couleur={couleur} position={[0, HS + 0.25 * h, 0]}>
        <cylinderGeometry args={[R * 0.38, R * 0.68, 0.5 * h, SEGMENTS]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.61 * h, 0]}>
        <cylinderGeometry args={[R * 0.84, R * 0.38, 0.22 * h, SEGMENTS]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.78 * h, 0]}>
        <cylinderGeometry args={[R * 0.74, R * 0.84, 0.12 * h, SEGMENTS]} />
      </Partie>
      {/* Croix : deux blocs. */}
      <Partie couleur={couleur} position={[0, HS + 0.92 * h, 0]}>
        <boxGeometry args={[R * 0.24, 0.2 * h, R * 0.24]} />
      </Partie>
      <Partie couleur={couleur} position={[0, HS + 0.9 * h, 0]}>
        <boxGeometry args={[R * 0.62, 0.07 * h, R * 0.24]} />
      </Partie>
    </>
  )
}

// ─────────────────────────────────────────────────────────── point d'entrée

const SILHOUETTES: Record<
  TypePiece,
  (props: { couleur: string }) => ReactNode
> = {
  p: Pion,
  n: Cavalier,
  b: Fou,
  r: Tour,
  q: Dame,
  k: Roi
}

/**
 * La géométrie d'une pièce, posée sur y = 0 et centrée en x/z. Sans position ni
 * animation : `Piece.tsx` s'en charge.
 *
 * Le **blason** gravé au sommet n'est pas décoratif : en vue de dessus — la pose de
 * jeu — une pièce 3D se réduit à un disque et les six types deviennent
 * indiscernables. Voir `Blason.tsx`.
 */
export function GeometriePiece({
  piece,
  couleur
}: {
  piece: TypePiece
  couleur: string
}) {
  const Silhouette = SILHOUETTES[piece]
  return (
    <>
      <Silhouette couleur={couleur} />
      <Blason piece={piece} hauteur={geom.hauteurs[piece]} sombre={couleur === couleurs.pieceBot} />
    </>
  )
}

/** Hauteur totale d'une pièce, utile pour positionner un surlignage au-dessus. */
export const hauteurPiece = (piece: TypePiece) => geom.hauteurs[piece]
