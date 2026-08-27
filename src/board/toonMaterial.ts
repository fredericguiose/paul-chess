/**
 * Cel-shading — la rampe de dégradé à paliers.
 *
 * `MeshToonMaterial` sans `gradientMap` retombe sur un dégradé lisse : on perd les
 * aplats, donc le cartoon. `NearestFilter` est **obligatoire** — sans lui la rampe
 * s'interpole et les paliers disparaissent.
 *
 * Une seule instance de texture pour toute la scène : elle ne dépend de rien.
 */

import * as THREE from 'three'

/**
 * Trois paliers : ombre, demi-teinte, lumière.
 *
 * ⚠️ Ces trois octets sont la seule valeur d'apparence qui ne vient pas de
 * `theme.ts` — le thème ne décrit pas la rampe. Si le rendu paraît trop contrasté,
 * c'est le palier bas (`0`) qu'il faut remonter, et l'endroit juste serait `theme.ts`.
 */
const PALIERS = new Uint8Array([0, 128, 255])

let rampe: THREE.DataTexture | null = null

/** La rampe partagée. Créée à la première demande, jamais recréée. */
export function rampeToon(): THREE.DataTexture {
  if (rampe) return rampe
  rampe = new THREE.DataTexture(PALIERS, PALIERS.length, 1, THREE.RedFormat)
  rampe.minFilter = THREE.NearestFilter
  rampe.magFilter = THREE.NearestFilter
  rampe.generateMipmaps = false
  rampe.needsUpdate = true
  return rampe
}

/**
 * Propriétés à étaler sur un `<meshToonMaterial>` :
 * `<meshToonMaterial {...proprietesToon(couleurs.pieceJoueur)} />`
 */
export function proprietesToon(couleur: string) {
  return { color: couleur, gradientMap: rampeToon() } as const
}

/** `'#rrggbb'` → `[r, g, b]` en octets sRGB bruts. */
function octetsSRGB(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Damier en texture de 8×8 texels, filtrée au plus proche : le plateau entier tient
 * en **un seul draw call**, là où 64 meshes cliquables en demanderaient 64. La saisie
 * ne passe pas par les cases (voir `interaction.ts`), elles n'ont donc pas à exister
 * comme objets.
 *
 * @param claire couleur des cases claires
 * @param sombre couleur des cases sombres
 * @param estClaire prédicat indexé `(colonne, ligne)` en 0..7, `ligne` 0 = 1ʳᵉ ligne
 */
export function textureDamier(
  claire: string,
  sombre: string,
  estClaire: (colonne: number, ligne: number) => boolean
): THREE.DataTexture {
  // Lecture directe des octets sRGB. `THREE.Color` convertirait en linéaire et la
  // texture, marquée sRGB, serait convertie une seconde fois : plateau trop sombre.
  const c = octetsSRGB(claire)
  const s = octetsSRGB(sombre)
  const donnees = new Uint8Array(8 * 8 * 4)

  for (let ligne = 0; ligne < 8; ligne++) {
    for (let colonne = 0; colonne < 8; colonne++) {
      const teinte = estClaire(colonne, ligne) ? c : s
      // La rangée 0 de la DataTexture est en v=0 : `flipY` vaut false par défaut ici.
      const i = (ligne * 8 + colonne) * 4
      donnees[i] = teinte[0]
      donnees[i + 1] = teinte[1]
      donnees[i + 2] = teinte[2]
      donnees[i + 3] = 255
    }
  }

  const texture = new THREE.DataTexture(donnees, 8, 8, THREE.RGBAFormat)
  texture.magFilter = THREE.NearestFilter
  texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
