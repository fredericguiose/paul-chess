/**
 * Contrat central du projet. TOUT en dépend — étape 0, non délégable.
 *
 * Convention de nommage : français pour les concepts métier (coup, énigme, faute),
 * anglais pour les APIs standard qu'on ne traduit pas à la frontière (`from`, `to`,
 * `san`, `fen` de chess.js). Les skills du projet emploient le même vocabulaire.
 */

// ─────────────────────────────────────────────────────────── coups et demi-coups

/**
 * Un **demi-coup** : un coup d'un seul camp. `1.e4` = 1 demi-coup. 0-indexé.
 */
export type Ply = number

/**
 * Un **coup** : le coup du joueur *et* la réponse du bot. `1.e4 e5` = 1 coup. 1-indexé.
 *
 * ⚠️ Le jeu fait **15 coups = 30 demi-coups**, avec une énigme par coup du joueur.
 * Plafonner à 15 *demi-coups* arrêterait la partie au 8ᵉ coup, avec 8 énigmes vues
 * sur 15. C'est la source d'erreur n°1 du projet.
 */
export type NumeroCoup = number

export const NOMBRE_DE_COUPS = 15

export const plyVersCoup = (ply: Ply): NumeroCoup => Math.floor(ply / 2) + 1
export const coupVersPly = (coup: NumeroCoup): Ply => (coup - 1) * 2

// ─────────────────────────────────────────────────────────── échiquier

export type Colonne = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
export type Ligne = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
export type Case = `${Colonne}${Ligne}`

export type Camp = 'blancs' | 'noirs'

/** Le joueur a les blancs dans tout le jeu ; le bot joue les noirs. */
export const CAMP_JOUEUR: Camp = 'blancs'
export const CAMP_BOT: Camp = 'noirs'

export type Piece = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'

/** Un coup joué, tel qu'il est consommé par le rendu. */
export interface CoupJoue {
  ply: Ply
  coup: NumeroCoup
  camp: Camp
  san: string
  from: Case
  to: Case
  piece: Piece
  /** Pièce capturée, ou `null`. */
  capture: Piece | null
  echec: boolean
  mat: boolean
  /** Position après le coup, en FEN. */
  fen: string
}

// ─────────────────────────────────────────────────────────── énigmes

export type TypeEnigme =
  /** Champ texte, validation tolérante. */
  | 'text'
  /** Pavé numérique, égalité stricte aux espaces près. */
  | 'code'
  /** Boutons, une seule bonne réponse. */
  | 'choice'
  /** Il touche une case du **plateau principal**, sur la position réelle en cours. */
  | 'square-live'
  /** Il touche une case d'un **mini-plateau 2D** dans la bande d'énigme. */
  | 'square-puzzle'
  /** L'indice est à l'écran, la réponse est dans le salon. Validation comme `text`. */
  | 'offscreen'

export type NatureEnigme = 'echecs' | 'perso'

export interface Enigme {
  id: string
  /** Slot 1 à 15. Une énigme par coup du joueur. */
  coup: NumeroCoup
  nature: NatureEnigme
  type: TypeEnigme
  /** Court : il sera lu à voix haute devant le groupe. */
  enonce: string
  /**
   * Réponses acceptées. Plusieurs orthographes possibles, comparées après
   * normalisation. Non utilisé par `choice` ni par les types `square-*`.
   */
  reponses?: string[]
  /** `choice` uniquement. */
  choix?: string[]
  /** `choice` uniquement : index dans `choix`. */
  bonneReponse?: number
  /** `square-live` et `square-puzzle`. Pour `square-live`, peut être calculée à la volée. */
  caseAttendue?: Case
  /** `square-puzzle` uniquement : la position étrangère à afficher. */
  fenPuzzle?: string
  /** Révélés progressivement : 2 échecs → indice 0, 4 → indice 1, 6 → bouton passer. */
  indices: string[]
  /** `perso` uniquement : qui l'a écrite. */
  auteur?: string
}

export interface ProgressionEnigme {
  resolue: boolean
  /** Nombre de tentatives ratées. */
  echecs: number
  /** Nombre d'indices révélés. */
  indicesReveles: number
  /** Passée sans être résolue. Sert au score, jamais à bloquer. */
  passee: boolean
}

// ─────────────────────────────────────────────────────────── caméra et phases

/**
 * Deux poses fixes. **Aucun contrôle libre** — pas d'`OrbitControls` ni équivalent :
 * le joueur désignerait des cases sur un plateau qui pivote.
 */
export type PoseCamera =
  /** Vue de dessus **orthographique**. Pose par défaut : c'est là qu'il joue. */
  | 'topDown'
  /** Perspective isométrique. Mise en scène : animation des coups, célébrations. */
  | 'iso'

export type PhaseJeu =
  /** Écran d'intro. Aussi l'écran de chargement du moteur, déguisé. */
  | 'intro'
  /** Une énigme est affichée dans la bande sous le plateau. */
  | 'enigme'
  /** L'énigme est résolue, le joueur doit jouer son coup. */
  | 'saisieCoup'
  /** Le coup du joueur s'anime. */
  | 'animationJoueur'
  /** Le bot réfléchit. Doit être visible, sinon il croit que ça a planté. */
  | 'reflexionBot'
  /** Le coup du bot s'anime. */
  | 'animationBot'
  /** Le bot a abandonné, séquence finale. */
  | 'revelation'

// ─────────────────────────────────────────────────────────── juice

/** Intensité de célébration. Croissante — quinze fois la même fatigue dès la quatrième. */
export type Palier = 'petit' | 'moyen' | 'grand' | 'finale'

export const palierPourCoup = (coup: NumeroCoup): Palier => {
  if (coup >= NOMBRE_DE_COUPS) return 'finale'
  if (coup >= 11) return 'grand'
  if (coup >= 6) return 'moyen'
  return 'petit'
}

/** Trauma ajouté par palier. L'amplitude du tremblement vaut le carré du trauma. */
export const TRAUMA_PAR_PALIER: Record<Palier, number> = {
  petit: 0.15,
  moyen: 0.4,
  grand: 0.7,
  finale: 1
}

// ─────────────────────────────────────────────────────────── moteur

/** Score en centipions, du point de vue du camp qui doit jouer. Borné à ±1500. */
export type Centipions = number

export const CLAMP_EVAL: Centipions = 1500

export interface EvaluationBot {
  cp: Centipions
  /** Meilleur coup selon le moteur, en notation UCI (`e2e4`). */
  best: string | null
}

/**
 * Les trois règles qui garantissent l'issue. Elles sont **interdépendantes** :
 * modifier un seuil sans relire les autres réintroduit un bug déjà rencontré
 * trois fois. Détail et historique dans le skill `paul-chess-engine`.
 */
export const REGLES_BOT = {
  /** Fenêtre d'évaluation visée par la faute volontaire du bot. */
  fauteCible: { min: -500 as Centipions, max: -300 as Centipions },
  /** Coups entre lesquels la faute doit tomber. */
  fauteEntreCoups: { debut: 6 as NumeroCoup, fin: 8 as NumeroCoup },
  /** Le bot ne joue jamais un coup qui le ferait remonter au-dessus de ce seuil. */
  plafondGardeFou: -200 as Centipions,
  /**
   * ⚠️ L'abandon est verrouillé sur le **temps**, pas sur l'évaluation.
   * Conditionner la fin de partie à un seuil d'évaluation coupe du contenu :
   * c'est arrivé deux fois. Le nombre de coups est la seule grandeur qu'on contrôle.
   */
  abandonApresCoup: NOMBRE_DE_COUPS as NumeroCoup,
  /** Condition de crédibilité secondaire, garantie par le garde-fou. */
  abandonSeuilEval: -300 as Centipions
} as const

/** Livre d'ouverture : 4 coups scriptés, fiabilité mesurée 91 %. Le bot joue les noirs. */
export const LIVRE_OUVERTURE: ReadonlyArray<{ joueur: string; bot: string }> = [
  { joueur: 'e4', bot: 'e5' },
  { joueur: 'Nf3', bot: 'Nc6' },
  { joueur: 'd4', bot: 'exd4' },
  { joueur: 'Nxd4', bot: 'Nxd4' }
]

/** Variante au 3ᵉ coup : il joue `Nc3` au lieu de `d4` dans 5 % des cas. */
export const LIVRE_VARIANTE_NC3: ReadonlyArray<{ joueur: string; bot: string }> = [
  { joueur: 'e4', bot: 'e5' },
  { joueur: 'Nf3', bot: 'Nc6' },
  { joueur: 'Nc3', bot: 'Nf6' }
]
