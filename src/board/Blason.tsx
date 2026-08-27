/**
 * Le blason gravé au sommet de chaque pièce.
 *
 * ⚠️ **Pourquoi ce composant existe.** Le jeu se joue en caméra orthographique vue de
 * dessus — c'est ce qui rend la désignation d'une case précise au doigt. Mais vu
 * exactement du dessus, une pièce 3D n'est plus qu'un disque : tour, cavalier, fou,
 * dame et roi deviennent indiscernables. Constaté à l'écran, pas supposé.
 *
 * Le destinataire est classé 1930 : il doit lire la position d'un coup d'œil, sinon il
 * ne peut pas jouer du tout. On grave donc le symbole de la pièce à plat sur son sommet,
 * comme la frappe d'une pièce de monnaie. Lisible de face comme de dessus, et cohérent
 * avec le rendu cartoon.
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import { couleurs } from '../theme'
import type { Piece as TypePiece } from '../types'

/** Glyphes pleins : leur intérieur est rempli, donc lisible quelle que soit la police. */
const GLYPHES: Record<TypePiece, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚'
}

const TAILLE_TEXTURE = 128

/**
 * Grave un glyphe dans une texture. Mémoïsé par (pièce, couleur) : deux textures
 * par type de pièce sur toute la partie, pas une par pièce.
 */
const cache = new Map<string, THREE.CanvasTexture>()

function textureBlason(piece: TypePiece, encre: string): THREE.CanvasTexture {
  const cle = `${piece}|${encre}`
  const enCache = cache.get(cle)
  if (enCache) return enCache

  const canvas = document.createElement('canvas')
  canvas.width = TAILLE_TEXTURE
  canvas.height = TAILLE_TEXTURE
  const ctx = canvas.getContext('2d')

  if (ctx) {
    ctx.clearRect(0, 0, TAILLE_TEXTURE, TAILLE_TEXTURE)
    ctx.font = `${TAILLE_TEXTURE * 0.78}px "Segoe UI Symbol", "Apple Symbols", serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Contour épais d'abord, remplissage ensuite : le glyphe reste lisible sur
    // n'importe quelle teinte de pièce, comme le contour des pièces elles-mêmes.
    ctx.lineWidth = TAILLE_TEXTURE * 0.09
    ctx.lineJoin = 'round'
    ctx.strokeStyle = couleurs.contour
    ctx.strokeText(GLYPHES[piece], TAILLE_TEXTURE / 2, TAILLE_TEXTURE * 0.54)
    ctx.fillStyle = encre
    ctx.fillText(GLYPHES[piece], TAILLE_TEXTURE / 2, TAILLE_TEXTURE * 0.54)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 4
  texture.needsUpdate = true
  cache.set(cle, texture)
  return texture
}

export interface ProprietesBlason {
  piece: TypePiece
  /** Hauteur à laquelle poser le blason : le sommet de la pièce. */
  hauteur: number
  /** Pièce claire ou sombre — décide de la couleur d'encre. */
  sombre: boolean
}

export function Blason({ piece, hauteur, sombre }: ProprietesBlason) {
  const encre = sombre ? couleurs.pieceJoueur : couleurs.pieceBot
  const texture = useMemo(() => textureBlason(piece, encre), [piece, encre])

  return (
    // À plat, face vers le ciel, très légèrement au-dessus du sommet pour éviter
    // le combat de profondeur avec la pièce.
    <mesh position={[0, hauteur + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.46, 0.46]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
