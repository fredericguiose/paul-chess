/**
 * Les deux poses de caméra, et la transition entre elles.
 *
 * ⛔ **Aucun contrôle libre.** Pas d'`OrbitControls`, `MapControls`, `FlyControls`,
 * `FirstPersonControls`, `TrackballControls` ni `PointerLockControls`. Le joueur
 * désigne des cases du doigt : un plateau qui pivote rend la désignation impossible.
 * Ce fichier ne fait qu'interpoler entre deux positions figées.
 *
 * `topDown` est **orthographique**, et c'est la pose par défaut, celle où il joue : le
 * plateau se projette comme un échiquier 2D, sans déformation de perspective. En
 * perspective isométrique, viser une case au doigt est approximatif et frustrant.
 *
 * `iso` est perspective, pour la mise en scène : animation des coups, célébrations.
 *
 * ### Le problème des deux projections
 * On n'interpole pas une projection orthographique vers une projection perspective.
 * La solution retenue : deux caméras, et un **échange à cadrage identique**. Dès que la
 * transition démarre, la caméra perspective prend le relais depuis une distance
 * calculée pour cadrer exactement la même largeur de monde que l'orthographique dans
 * le plan du damier (y = 0). L'échange est donc invisible sur le damier ; seules les
 * pièces, hautes de moins d'une case, révèlent un léger changement de fuite — au
 * premier instant d'un mouvement de caméra, personne ne le voit.
 *
 * L'orthographique reprend la main à l'arrêt, et c'est ce qui compte : c'est dans cette
 * pose qu'on touche l'écran.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { useSpring } from '@react-spring/three'
import * as THREE from 'three'
import { cameras, MARGE_CADRAGE_JEU, MARGE_CADRAGE_VITRINE, ressorts } from '../theme'
import { COTE_PLATEAU } from './interaction'
import type { PoseCamera } from '../types'

const CIBLE = new THREE.Vector3(0, 0, 0)

/** Direction du regard en vue 3D, normalisée. La distance est calculée, pas figée. */
const DIRECTION_ISO = new THREE.Vector3(...cameras.iso.position).normalize()

/**
 * Distance à laquelle **tout le plateau** tient dans le cadre.
 *
 * ⚠️ Le `fov` de three.js est **vertical**. Sur un téléphone en portrait (ratio ~0,5),
 * le champ horizontal ne fait que la moitié du vertical : une caméra placée pour que
 * le plateau tienne en hauteur n'en montre que la moitié en largeur. Constaté à
 * l'écran — on ne voyait que cinq colonnes sur huit.
 *
 * On recule donc selon la **plus contraignante** des deux dimensions.
 */
function distanceIso(fovDeg: number, aspect: number): number {
  const demiPlateau = (COTE_PLATEAU * MARGE_CADRAGE_VITRINE) / 2
  const demiFov = ((fovDeg / 2) * Math.PI) / 180
  // aspect < 1 en portrait : c'est la largeur qui contraint.
  return demiPlateau / (Math.tan(demiFov) * Math.min(1, aspect))
}

export function CameraRig({ pose }: { pose: PoseCamera }) {
  const ortho = useRef<THREE.OrthographicCamera>(null)
  const persp = useRef<THREE.PerspectiveCamera>(null)

  const set = useThree((s) => s.set)
  const taille = useThree((s) => s.size)
  const invalider = useThree((s) => s.invalidate)

  /** Vrai pendant le mouvement : la perspective a la main. */
  const [enTransition, setEnTransition] = useState(false)

  /**
   * Zoom effectif de l'orthographique.
   *
   * `theme.cameras.topDown.zoom` est le **plafond** : sur un canevas large il s'applique
   * tel quel. Sur un canevas de téléphone en portrait il rognerait le plateau, alors on
   * descend juste ce qu'il faut pour que les 8 cases *et* la bordure tiennent. La valeur
   * reste pilotée par `theme.ts` ; ce qui est calculé ici, c'est le cadrage, pas le style.
   */
  const zoom = Math.min(
    cameras.topDown.zoom,
    Math.min(taille.width, taille.height) / (COTE_PLATEAU * MARGE_CADRAGE_JEU)
  )

  /** Distance à laquelle la perspective cadre la même hauteur de monde que l'ortho. */
  const distanceRaccord =
    taille.height / zoom / (2 * Math.tan((((cameras.iso.fov ?? 38) / 2) * Math.PI) / 180))

  const positionRaccord = useRef(new THREE.Vector3())
  positionRaccord.current.set(0, distanceRaccord, 0.001)

  /** Position de la vue 3D, recalculée à chaque changement de format d'écran. */
  const positionIsoRef = useRef(new THREE.Vector3())
  positionIsoRef.current
    .copy(DIRECTION_ISO)
    .multiplyScalar(
      distanceIso(cameras.iso.fov ?? 34, taille.width / Math.max(1, taille.height))
    )

  // ── cadrage : frustums et matrices de projection
  useLayoutEffect(() => {
    const o = ortho.current
    if (o) {
      o.left = -taille.width / 2
      o.right = taille.width / 2
      o.top = taille.height / 2
      o.bottom = -taille.height / 2
      o.zoom = zoom
      o.position.set(...cameras.topDown.position)
      o.lookAt(CIBLE)
      o.updateProjectionMatrix()
    }
    const p = persp.current
    if (p) {
      p.aspect = taille.width / taille.height
      p.fov = cameras.iso.fov ?? 38
      p.updateProjectionMatrix()
    }
    invalider()
  }, [taille.width, taille.height, zoom, invalider])

  // ── qui est la caméra par défaut ?
  // Géré à la main plutôt qu'avec `makeDefault` de drei : deux `makeDefault` qui
  // basculent en même temps se restaurent l'un l'autre dans un ordre non garanti.
  useLayoutEffect(() => {
    const active = pose === 'topDown' && !enTransition ? ortho.current : persp.current
    if (active) set({ camera: active })
    invalider()
  }, [pose, enTransition, set, invalider])

  /** Applique la pose interpolée à la caméra perspective. `t` : 0 = topDown, 1 = iso. */
  const appliquer = (t: number) => {
    const p = persp.current
    if (!p) return
    p.position.lerpVectors(positionRaccord.current, positionIsoRef.current, t)
    p.lookAt(CIBLE)
    p.updateProjectionMatrix()
  }

  const [, apiTransition] = useSpring(() => ({
    t: pose === 'iso' ? 1 : 0,
    config: ressorts.camera,
    onChange: ({ value }) => appliquer(value.t as number)
  }))

  const premierRendu = useRef(true)
  useEffect(() => {
    const cible = pose === 'iso' ? 1 : 0

    if (premierRendu.current) {
      premierRendu.current = false
      apiTransition.set({ t: cible })
      appliquer(cible)
      return
    }

    setEnTransition(true)
    apiTransition.start({
      t: cible,
      // La perspective ne rend la main qu'à l'arrêt complet, et seulement en `topDown` :
      // en `iso` elle reste active pour de bon.
      onRest: () => setEnTransition(false)
    })
    // `appliquer` est stable en pratique : elle ne lit que des refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pose, apiTransition])

  return (
    <>
      <orthographicCamera ref={ortho} near={0.1} far={100} />
      <perspectiveCamera ref={persp} near={0.1} far={100} />
    </>
  )
}
