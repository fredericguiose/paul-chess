/**
 * Échiquier 2D en SVG — lot E.
 *
 * Deux usages, un seul composant :
 *
 * 1. **Mini-plateau d'énigme** (`square-puzzle`) : une position étrangère à la partie,
 *    affichée dans la bande sous le plateau. Le joueur touche une case, `onCase` part.
 * 2. **Mode de secours sans WebGL** : si la 3D ne démarre pas, `PlateauSecours` habille
 *    ce même composant avec l'état du store et devient le plateau du jeu.
 *
 * Contraintes qui expliquent les choix d'implémentation :
 * - **SVG pur**, aucun canvas, aucun WebGL — c'est précisément la situation où la 3D
 *   a échoué. Aucune dépendance à three.js n'entre ici, même indirecte.
 * - **`chess.js` en lecture seule** : parser le FEN et lister les coups légaux. La
 *   logique de jeu appartient au store et à `board/interaction.ts`, jamais au rendu.
 * - **Portrait, doigt** : le viewBox fait 8×8 unités, le SVG s'étire à la largeur
 *   offerte. Une case vaut donc `largeur / 8` : à 360 px de large (téléphone en
 *   secours) chaque case fait 45 px, au-dessus des 44 px de cible tactile.
 * - **Le joueur a les blancs, en bas** : la 1ʳᵉ ligne est la dernière rangée du SVG.
 *
 * Les pièces sont les **caractères Unicode pleins** (♚♛♜♝♞♟), peints en
 * `couleurs.pieceJoueur` / `pieceBot` et cernés de `couleurs.contour`. Les glyphes
 * creux (♔♕…) sont écartés volontairement : leur intérieur est transparent, donc
 * illisible sur une case claire. Un glyphe plein rempli et contouré donne les deux
 * camps sans dépendre de la police, et garde le contour épais du reste du jeu.
 */

import { useMemo } from 'react'
import { Chess } from 'chess.js'
import { couleurs } from '../theme'
import type { Case, Colonne, Ligne, Piece } from '../types'

const COLONNES: readonly Colonne[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const LIGNES: readonly Ligne[] = ['1', '2', '3', '4', '5', '6', '7', '8']

/**
 * Glyphes **pleins** uniquement. La distinction des camps vient du remplissage,
 * pas du glyphe : voir l'en-tête.
 */
const GLYPHES: Record<Piece, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟'
}

const POLICE_PIECES =
  '"Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", "DejaVu Sans", serif'

interface PieceRendue {
  case: Case
  piece: Piece
  blanche: boolean
}

/** `a1` est sombre — même convention que le plateau 3D. */
function estClaire(colonne: number, ligne: number): boolean {
  return (colonne + ligne) % 2 === 1
}

function caseDepuisIndex(colonne: number, ligne: number): Case {
  return `${COLONNES[colonne]}${LIGNES[ligne]}` as Case
}

/**
 * Lecture seule du FEN. Un FEN vide ou invalide ne doit **jamais** faire tomber la
 * bande d'énigme : on rend un plateau nu plutôt que de casser l'écran.
 */
function lirePosition(fen: string): PieceRendue[] {
  if (!fen || fen.trim() === '') return []
  try {
    const chess = new Chess(fen)
    const rendues: PieceRendue[] = []
    for (const rangee of chess.board()) {
      for (const cellule of rangee) {
        if (!cellule) continue
        rendues.push({
          case: cellule.square as Case,
          piece: cellule.type as Piece,
          blanche: cellule.color === 'w'
        })
      }
    }
    return rendues
  } catch {
    return []
  }
}

export interface ProprietesEchiquier2D {
  /** Position à afficher, en FEN. Lue seulement. */
  fen: string
  /** Case touchée. Aucun filtrage ici : l'appelant décide de ce que ça veut dire. */
  onCase: (c: Case) => void
  /** Cases mises en évidence — la tentative en cours dans une énigme. */
  surlignees?: Case[]
  /** Secours : la case sélectionnée, en attente de destination. */
  selection?: Case | null
  /** Secours : les arrivées légales depuis la sélection, en pastilles. */
  legales?: Case[]
  /** Secours : les deux cases du dernier coup joué. */
  dernierCoup?: readonly [Case, Case] | null
  /** Secours : la case du roi en échec. */
  echec?: Case | null
  /** Afficher les lettres et chiffres en bordure. Coûteux en place sur un mini-plateau. */
  coordonnees?: boolean
  /** Coupe la saisie pendant une animation ou une fois l'énigme résolue. */
  desactive?: boolean
  /** Étiquette du groupe, pour les lecteurs d'écran. */
  etiquette?: string
}

export function Echiquier2D({
  fen,
  onCase,
  surlignees = [],
  selection = null,
  legales = [],
  dernierCoup = null,
  echec = null,
  coordonnees = false,
  desactive = false,
  etiquette = 'Échiquier'
}: ProprietesEchiquier2D) {
  const pieces = useMemo(() => lirePosition(fen), [fen])

  // Recherches en O(1) dans la boucle des 64 cases plutôt que 64 × `includes`.
  const setSurlignees = useMemo(() => new Set<Case>(surlignees), [surlignees])
  const setLegales = useMemo(() => new Set<Case>(legales), [legales])
  const occupees = useMemo(() => new Set<Case>(pieces.map((p) => p.case)), [pieces])
  const setDernier = useMemo(
    () => new Set<Case>(dernierCoup ? [dernierCoup[0], dernierCoup[1]] : []),
    [dernierCoup]
  )

  const marge = coordonnees ? 0.55 : 0
  const cote = 8 + marge * 2

  /** Coin haut-gauche de la case, en unités du viewBox. Ligne 1 en bas. */
  const x = (colonne: number) => marge + colonne
  const y = (ligne: number) => marge + (7 - ligne)

  const toucher = (c: Case) => {
    if (desactive) return
    onCase(c)
  }

  const cases = []
  for (let ligne = 0; ligne < 8; ligne++) {
    for (let colonne = 0; colonne < 8; colonne++) {
      const c = caseDepuisIndex(colonne, ligne)
      cases.push(
        <rect
          key={c}
          x={x(colonne)}
          y={y(ligne)}
          width={1}
          height={1}
          fill={estClaire(colonne, ligne) ? couleurs.caseClaire : couleurs.caseSombre}
        />
      )
    }
  }

  return (
    <svg
      viewBox={`0 0 ${cote} ${cote}`}
      role="group"
      aria-label={etiquette}
      // `touch-action: none` : sans ça, un toucher sur une case peut être avalé par
      // le défilement de la bande d'énigme et le coup semble ignoré.
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}
    >
      {/* Le damier, puis son contour épais — la signature cartoon du jeu. */}
      <g>{cases}</g>

      {/* Dernier coup : sous tout le reste des surlignages, c'est le plus discret. */}
      {[...setDernier].map((c) => (
        <CaseTeintee key={`dc-${c}`} c={c} x={x} y={y} couleur={couleurs.dernierCoup} opacite={0.55} />
      ))}

      {echec && (
        <CaseTeintee c={echec} x={x} y={y} couleur={couleurs.echec} opacite={0.7} />
      )}

      {selection && (
        <CaseTeintee c={selection} x={x} y={y} couleur={couleurs.selection} opacite={0.75} />
      )}

      {[...setSurlignees].map((c) => (
        <CaseTeintee key={`s-${c}`} c={c} x={x} y={y} couleur={couleurs.selection} opacite={0.75} />
      ))}

      {/* Les pièces. `dominantBaseline` recentre le glyphe, qui pend sinon vers le bas. */}
      {pieces.map((p) => {
        const colonne = p.case.charCodeAt(0) - 97
        const ligne = p.case.charCodeAt(1) - 49
        return (
          <text
            key={`p-${p.case}`}
            x={x(colonne) + 0.5}
            y={y(ligne) + 0.56}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={0.82}
            fontFamily={POLICE_PIECES}
            fill={p.blanche ? couleurs.pieceJoueur : couleurs.pieceBot}
            stroke={couleurs.contour}
            strokeWidth={0.035}
            paintOrder="stroke"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {GLYPHES[p.piece]}
          </text>
        )
      })}

      {/* Arrivées légales : pastille pleine sur une capture, disque sur une case vide.
          Même grammaire que le plateau 3D — il ne doit rien réapprendre en secours. */}
      {[...setLegales].map((c) => {
        const colonne = c.charCodeAt(0) - 97
        const ligne = c.charCodeAt(1) - 49
        const cx = x(colonne) + 0.5
        const cy = y(ligne) + 0.5
        return occupees.has(c) ? (
          <circle
            key={`l-${c}`}
            cx={cx}
            cy={cy}
            r={0.42}
            fill="none"
            stroke={couleurs.caseLegale}
            strokeWidth={0.11}
            opacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <circle
            key={`l-${c}`}
            cx={cx}
            cy={cy}
            r={0.16}
            fill={couleurs.caseLegale}
            opacity={0.9}
            style={{ pointerEvents: 'none' }}
          />
        )
      })}

      <rect
        x={marge}
        y={marge}
        width={8}
        height={8}
        fill="none"
        stroke={couleurs.contour}
        strokeWidth={0.09}
        style={{ pointerEvents: 'none' }}
      />

      {coordonnees && (
        <g
          fontFamily="inherit"
          fontSize={0.36}
          fill={couleurs.texteClair}
          opacity={0.75}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {COLONNES.map((col, i) => (
            <text key={col} x={x(i) + 0.5} y={cote - 0.15} textAnchor="middle">
              {col}
            </text>
          ))}
          {LIGNES.map((l, i) => (
            <text key={l} x={marge / 2} y={y(i) + 0.5} textAnchor="middle" dominantBaseline="central">
              {l}
            </text>
          ))}
        </g>
      )}

      {/* Captation en dernier : une couche transparente au-dessus de tout, sinon un
          glyphe ou une pastille intercepterait le toucher au centre de la case. */}
      <g>
        {Array.from({ length: 64 }, (_, i) => {
          const colonne = i % 8
          const ligne = Math.floor(i / 8)
          const c = caseDepuisIndex(colonne, ligne)
          return (
            <rect
              key={`t-${c}`}
              x={x(colonne)}
              y={y(ligne)}
              width={1}
              height={1}
              fill="transparent"
              // `onPointerDown` plutôt que `onClick` : sur mobile le clic arrive après
              // un délai et le plateau paraît mou. Ici la case répond au contact.
              onPointerDown={() => toucher(c)}
              style={{ cursor: desactive ? 'default' : 'pointer' }}
              aria-label={c}
            />
          )
        })}
      </g>
    </svg>
  )
}

function CaseTeintee({
  c,
  x,
  y,
  couleur,
  opacite
}: {
  c: Case
  x: (colonne: number) => number
  y: (ligne: number) => number
  couleur: string
  opacite: number
}) {
  const colonne = c.charCodeAt(0) - 97
  const ligne = c.charCodeAt(1) - 49
  return (
    <rect
      x={x(colonne)}
      y={y(ligne)}
      width={1}
      height={1}
      fill={couleur}
      opacity={opacite}
      style={{ pointerEvents: 'none' }}
    />
  )
}

export default Echiquier2D
