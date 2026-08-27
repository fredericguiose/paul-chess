/**
 * La scène : le `<Canvas>`, le plateau 8×8, les surlignages, les pièces, la saisie.
 *
 * **Aucune logique de jeu ici.** `chess.js` et le store zustand possèdent l'état ; ce
 * composant lit `fen`, `historique`, `selection`, `poseCamera` et appelle des actions.
 * Il ne décide d'aucune règle : `interaction.ts` traduit un toucher en intention, et le
 * coup lui-même est joué par l'orchestration (lots A/E) via `onCoup`.
 *
 * Cette séparation n'est pas de la propreté gratuite : le mini-échiquier 2D SVG sert de
 * mode de secours sans WebGL et doit pouvoir remplacer ce fichier sans toucher une ligne
 * de logique.
 *
 * Réglages mobile obligatoires : `frameloop="demand"` (la scène ne se redessine que
 * quand quelque chose bouge — une boucle continue sur un plateau immobile vide la
 * batterie), `dpr={[1, 2]}`, aucune ombre temps réel.
 *
 * ⚠️ **Aucun tremblement d'écran ici.** Il se fait en CSS sur un conteneur DOM au-dessus
 * du canevas (lot D). Secouer la caméra 3D exigerait une boucle continue *et*
 * désalignerait les cibles de toucher pendant la secousse — dans un jeu où l'on désigne
 * des cases, c'est un bug d'interaction, pas un effet.
 */

import { useMemo, useState } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import * as THREE from 'three'
import { useJeu } from '../store'
import { couleurs, plateau } from '../theme'
import {
  CAMP_JOUEUR,
  type Case,
  type Piece as TypePiece,
  type PoseCamera
} from '../types'
import { CameraRig } from './CameraRig'
import { Piece3D, PieceFantome } from './Piece'
import { GeometriePiece } from './pieces'
import { proprietesToon, textureDamier } from './toonMaterial'
import {
  COTE_DAMIER,
  COTE_PLATEAU,
  campAuTrait,
  caseRoiEnEchec,
  centreCase,
  destinationsLegales,
  estIndexClair,
  mondeVersCase,
  piecesDepuisFen,
  resoudreToucher
} from './interaction'

/**
 * Hauteurs des couches de surlignage. Elles ne se recouvrent pas plutôt que de compter
 * sur `polygonOffset` : c'est plus prévisible sur les GPU mobiles.
 */
const COUCHES = {
  damier: 0.001,
  dernierCoup: 0.004,
  echec: 0.006,
  selection: 0.008,
  pastille: 0.01,
  captation: 0.012,
  promotion: 0.4
} as const

export interface ProprietesBoard3D {
  /**
   * Le joueur a désigné un coup légal. **Ce composant ne le joue pas** : construire le
   * `CoupJoue` et appeler `enregistrerCoup` appartient à l'orchestration.
   */
  onCoup?: (from: Case, to: Case, promotion?: TypePiece) => void
  /**
   * Énigme `square-live` : le toucher devient une désignation de case et ne sélectionne
   * ni ne joue rien. Fournir ce callback suffit à passer en mode désignation.
   */
  onCaseDesignee?: (c: Case) => void
  /** Le plateau accepte-t-il la saisie ? Par défaut : seulement si le joueur a le trait. */
  saisieActive?: boolean
  /** Forcer une pose, en ignorant le store. Sert aux tests visuels. */
  pose?: PoseCamera
}

export function Board3D({
  onCoup,
  onCaseDesignee,
  saisieActive,
  pose
}: ProprietesBoard3D) {
  const poseStore = useJeu((s) => s.poseCamera)
  const setSelection = useJeu((s) => s.setSelection)

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      flat
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => setSelection(null)}
    >
      <CameraRig pose={pose ?? poseStore} />
      <Lumieres />
      <Scene
        onCoup={onCoup}
        onCaseDesignee={onCaseDesignee}
        saisieActive={saisieActive}
      />
    </Canvas>
  )
}

/**
 * Éclairage : rien de physique, on cherche des aplats. Une directionnelle donne le
 * palier clair, l'ambiante remonte le palier sombre pour qu'il ne soit pas noir.
 * **Pas d'ombre temps réel** — trop chère sur mobile, et le contour fait le travail.
 *
 * Ces intensités ne sont pas dans `theme.ts` (voir le rapport du lot B).
 */
function Lumieres() {
  return (
    <>
      <ambientLight intensity={1.5} />
      <hemisphereLight intensity={0.6} groundColor={couleurs.boisSombre} />
      <directionalLight position={[4, 9, 5]} intensity={2.2} castShadow={false} />
    </>
  )
}

// ─────────────────────────────────────────────────────────── contenu de la scène

interface PromotionEnAttente {
  from: Case
  to: Case
  choix: TypePiece[]
}

function Scene({
  onCoup,
  onCaseDesignee,
  saisieActive
}: Pick<ProprietesBoard3D, 'onCoup' | 'onCaseDesignee' | 'saisieActive'>) {
  const fen = useJeu((s) => s.fen)
  const historique = useJeu((s) => s.historique)
  const selection = useJeu((s) => s.selection)
  const setSelection = useJeu((s) => s.setSelection)

  const [promotion, setPromotion] = useState<PromotionEnAttente | null>(null)

  const modeDesignation = Boolean(onCaseDesignee)
  const saisiePermise =
    saisieActive ?? (!modeDesignation && campAuTrait(fen) === CAMP_JOUEUR)

  const presentes = useMemo(() => piecesDepuisFen(fen), [fen])
  const dernier = historique.length > 0 ? historique[historique.length - 1] : null
  const roiEnEchec = useMemo(() => caseRoiEnEchec(fen), [fen])
  const destinations = useMemo(
    () => (selection ? destinationsLegales(fen, selection) : []),
    [fen, selection]
  )

  const couleurCamp = (camp: 'blancs' | 'noirs') =>
    camp === CAMP_JOUEUR ? couleurs.pieceJoueur : couleurs.pieceBot

  const toucher = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const touchee = mondeVersCase(event.point.x, event.point.z)
    if (!touchee) return

    // Une énigme `square-live` détourne le toucher : on désigne, on ne joue pas.
    if (onCaseDesignee) {
      onCaseDesignee(touchee)
      return
    }
    // Un sélecteur de promotion ouvert absorbe tout ; toucher ailleurs l'annule.
    if (promotion) {
      setPromotion(null)
      return
    }
    if (!saisiePermise) return

    const action = resoudreToucher(fen, selection, touchee)
    switch (action.type) {
      case 'selectionner':
        setSelection(action.case)
        break
      case 'deselectionner':
        setSelection(null)
        break
      case 'jouer':
        setSelection(null)
        onCoup?.(action.from, action.to)
        break
      case 'promotion':
        setPromotion({ from: action.from, to: action.to, choix: action.choix })
        break
      case 'rien':
        break
    }
  }

  return (
    <>
      <Plateau onToucher={toucher} />

      {dernier && (
        <>
          <Marqueur case={dernier.from} couleur={couleurs.dernierCoup} y={COUCHES.dernierCoup} opacite={0.45} />
          <Marqueur case={dernier.to} couleur={couleurs.dernierCoup} y={COUCHES.dernierCoup} opacite={0.6} />
        </>
      )}

      {roiEnEchec && (
        <Marqueur case={roiEnEchec} couleur={couleurs.echec} y={COUCHES.echec} opacite={0.75} />
      )}

      {selection && (
        <Marqueur case={selection} couleur={couleurs.selection} y={COUCHES.selection} opacite={0.7} />
      )}

      {destinations.map((d) => (
        <Pastille key={d.to} case={d.to} capture={d.capture} />
      ))}

      {/* Le fantôme de la pièce capturée au dernier coup : il se remonte à chaque ply. */}
      {dernier?.capture && (
        <PieceFantome
          key={`fantome-${dernier.ply}`}
          piece={dernier.capture}
          camp={dernier.camp === 'blancs' ? 'noirs' : 'blancs'}
          couleur={couleurCamp(dernier.camp === 'blancs' ? 'noirs' : 'blancs')}
          case={dernier.to}
        />
      )}

      {presentes.map((p) => (
        <Piece3D
          // La case EST l'identité : une pièce qui bouge se remonte et s'anime depuis
          // `origine`. Rien à synchroniser avec le FEN, donc rien à désynchroniser.
          key={p.case}
          piece={p.piece}
          camp={p.camp}
          couleur={couleurCamp(p.camp)}
          case={p.case}
          origine={dernier && dernier.to === p.case ? dernier.from : null}
          selectionnee={selection === p.case}
        />
      ))}

      {promotion && (
        <SelecteurPromotion
          attente={promotion}
          onChoix={(piece) => {
            const { from, to } = promotion
            setPromotion(null)
            setSelection(null)
            onCoup?.(from, to, piece)
          }}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────── le plateau

/**
 * Trois objets seulement : le bloc de bois, le damier, et **un plan invisible unique**
 * qui capte les touchers. Inutile de rendre 64 cases cliquables — le damier est une
 * texture de 8×8 texels filtrée au plus proche, et `event.point` suffit à retrouver la
 * case touchée.
 */
function Plateau({ onToucher }: { onToucher: (e: ThreeEvent<PointerEvent>) => void }) {
  const damier = useMemo(
    () => textureDamier(couleurs.caseClaire, couleurs.caseSombre, estIndexClair),
    []
  )

  return (
    <group>
      {/* Bloc de bois : sa face supérieure est en y = 0. */}
      <mesh position={[0, -plateau.epaisseur / 2, 0]} raycast={() => null}>
        <boxGeometry args={[COTE_PLATEAU, plateau.epaisseur, COTE_PLATEAU]} />
        <meshToonMaterial {...proprietesToon(couleurs.bois)} />
        <Outlines thickness={plateau.bordure * 0.12} color={couleurs.contour} />
      </mesh>

      {/* Liseré : un cadre fin juste sous le damier. */}
      <mesh position={[0, COUCHES.damier / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[COTE_DAMIER + plateau.bordure * 0.35, COTE_DAMIER + plateau.bordure * 0.35]} />
        <meshBasicMaterial color={couleurs.liseré} toneMapped={false} />
      </mesh>

      {/* Damier. */}
      <mesh position={[0, COUCHES.damier, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <planeGeometry args={[COTE_DAMIER, COTE_DAMIER]} />
        <meshBasicMaterial map={damier} toneMapped={false} />
      </mesh>

      {/* Le plan de captation. Invisible, mais bien présent au raycast. */}
      <mesh
        position={[0, COUCHES.captation, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={onToucher}
      >
        <planeGeometry args={[COTE_DAMIER, COTE_DAMIER]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────── surlignages

/** Une case entière teintée : dernier coup, échec, sélection. */
function Marqueur({
  case: c,
  couleur,
  y,
  opacite
}: {
  case: Case
  couleur: string
  y: number
  opacite: number
}) {
  const [x, , z] = centreCase(c)
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[plateau.tailleCase, plateau.tailleCase]} />
      <meshBasicMaterial
        color={couleur}
        transparent
        opacity={opacite}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/**
 * Les cases d'arrivée légales. Convention Chess.com : **pastille pleine** sur une case
 * vide, **anneau** autour d'une pièce prenable.
 */
function Pastille({ case: c, capture }: { case: Case; capture: boolean }) {
  const [x, , z] = centreCase(c)
  const t = plateau.tailleCase
  return (
    <mesh
      position={[x, COUCHES.pastille, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      raycast={() => null}
    >
      {capture ? (
        <ringGeometry args={[t * 0.4, t * 0.48, 24]} />
      ) : (
        <circleGeometry args={[t * 0.17, 20]} />
      )}
      <meshBasicMaterial
        color={couleurs.caseLegale}
        transparent
        opacity={capture ? 0.9 : 0.75}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────── promotion

/**
 * Le petit sélecteur de pièce. En scène plutôt qu'en DOM : la bande d'énigme (lot C)
 * occupe déjà le bas de l'écran, et ce sélecteur doit apparaître **sur** le plateau,
 * près du coup qu'on est en train de jouer.
 */
function SelecteurPromotion({
  attente,
  onChoix
}: {
  attente: PromotionEnAttente
  onChoix: (piece: TypePiece) => void
}) {
  // Ordre familier : dame d'abord, elle est choisie dans l'immense majorité des cas.
  const ordre: TypePiece[] = ['q', 'r', 'b', 'n']
  const choix = ordre.filter((p) => attente.choix.includes(p))
  const t = plateau.tailleCase
  const pas = t * 1.15
  const debut = -((choix.length - 1) * pas) / 2

  return (
    <group position={[0, COUCHES.promotion, 0]}>
      {choix.map((piece, i) => (
        <group key={piece} position={[debut + i * pas, 0, 0]}>
          {/* La tuile : c'est elle qui capte le toucher, pas la pièce posée dessus. */}
          <mesh
            position={[0, 0, 0]}
            onPointerDown={(e) => {
              e.stopPropagation()
              onChoix(piece)
            }}
          >
            <boxGeometry args={[t, t * 0.14, t]} />
            <meshToonMaterial {...proprietesToon(couleurs.accent)} />
            <Outlines thickness={0.05} color={couleurs.contour} />
          </mesh>
          <group position={[0, t * 0.07, 0]} scale={0.85}>
            <GeometriePiece piece={piece} couleur={couleurs.pieceJoueur} />
          </group>
        </group>
      ))}
    </group>
  )
}
