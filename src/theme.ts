/**
 * Apparence — étape 0, non délégable.
 *
 * **Seul fichier à toucher** quand les photos de l'échiquier commandé arriveront.
 * Direction artistique : jeu mobile cartoon (Brawl Stars / Clash of Clans) sur les
 * couleurs des échecs et un thème bois. Voir le skill `paul-chess-board3d`.
 *
 * Quand les visuels arriveront, ne régler ici que : la teinte du bois, la silhouette
 * des pièces, un détail signature s'il y en a un. **Ne pas utiliser la photo comme
 * texture** — un bois photographique jure en cel-shading. La vraie photo est montrée
 * à la révélation, pas pendant le jeu.
 */

// ─────────────────────────────────────────────────────────── palette

export const couleurs = {
  /** Cases : crème et brun-miel réchauffés, jamais noir-blanc franc. */
  caseClaire: '#f2dfb8',
  caseSombre: '#b07a42',
  /** Le contour épais présent partout — c'est lui qui fait le cartoon. */
  contour: '#3a2313',

  /** Panneaux et bandes : bois sculpté, liseré doré. */
  bois: '#8a5a30',
  boisSombre: '#5c3a1d',
  liseré: '#e8b545',

  /** Pièces. */
  pieceJoueur: '#faf3e4',
  pieceBot: '#4a3524',

  /**
   * Actions. Chaque couleur a sa variante sombre : c'est elle qui fait le biseau
   * épais des boutons, et le biseau est ce qui donne la sensation « jeu mobile ».
   */
  accent: '#f5b229',
  accentSombre: '#c4841a',
  validation: '#5aa02c',
  validationSombre: '#3f7420',
  bot: '#a8402f',
  botSombre: '#75291d',

  /** Surlignages sur le plateau. */
  selection: '#f5b229',
  caseLegale: '#6fbf3a',
  dernierCoup: '#e8b545',
  echec: '#d4452f',

  texte: '#2b1a0d',
  texteClair: '#fff8ea'
} as const

// ─────────────────────────────────────────────────────────── typographie

/**
 * Équivalents libres du grain Supercell. Contour de texte + ombre portée.
 * Sert directement la contrainte « lisible à voix haute » : ce registre n'écrit
 * qu'en gros et gras.
 */
export const polices = {
  titre: '"Lilita One", "Titan One", system-ui, sans-serif',
  corps: '"Baloo 2", "Nunito", system-ui, sans-serif'
} as const

// ─────────────────────────────────────────────────────────── plateau 3D

export const plateau = {
  /** Côté d'une case, en unités de scène. */
  tailleCase: 1,
  epaisseur: 0.35,
  /** Marge de bordure autour des 8×8. */
  bordure: 0.4
} as const

/**
 * Pièces en **primitives paramétriques** (cylindres, sphères, cônes) — c'est le
 * style final, pas un provisoire. Pas de `.glb`, pas de Draco.
 * Une pièce d'échecs cartoon, ce sont des formes grasses avec un contour épais.
 */
export const pieces = {
  /** Épaisseur du contour, en unités de coque inversée (drei `<Outlines>`). */
  epaisseurContour: 0.04,
  socle: { rayon: 0.34, hauteur: 0.12 },
  hauteurs: { p: 0.55, n: 0.8, b: 0.85, r: 0.7, q: 1, k: 1.1 }
} as const

// ─────────────────────────────────────────────────────────── caméra

/**
 * Deux poses fixes.
 *
 * `iso` est la **vue par défaut** : l'échiquier 3D est le cadeau, c'est lui qu'on
 * montre. `topDown` est **orthographique** — le plateau s'y projette comme un
 * échiquier 2D, sans déformation de perspective, ce qui rend la désignation d'une
 * case précise au doigt. On y bascule au toucher du plateau, pour jouer.
 */
export const cameras = {
  topDown: { position: [0, 12, 0.001] as const, zoom: 40, fov: undefined },
  iso: { position: [0, 11, 11] as const, zoom: undefined, fov: 34 }
} as const

/**
 * Marge autour du plateau en vue de dessus, en multiples de son côté. Au-delà de 1,
 * le plateau ne touche plus les bords de l'écran — on respire.
 */
export const MARGE_CADRAGE = 1.25

/** Durée de la transition entre les deux poses, en millisecondes. */
export const DUREE_TRANSITION_CAMERA = 550

// ─────────────────────────────────────────────────────────── animation

/**
 * Courbes à **dépassement** pour le « pop », **sortie douce** pour le « repos ».
 * Jamais linéaire : linéaire = mécanique, mort.
 */
export const ressorts = {
  /** Apparition, bonne réponse : dépasse puis se pose. */
  pop: { tension: 320, friction: 12 },
  /** Une pièce qui se pose. */
  pose: { tension: 210, friction: 24 },
  /** Transition de caméra. */
  camera: { tension: 90, friction: 26 }
} as const

/** Durée du déplacement d'une pièce, en millisecondes. */
export const DUREE_COUP = 420

/** Arrêt bref sur impact — l'équivalent du hit-stop. Une fois par événement. */
export const DUREE_ARRET_IMPACT = 80

/**
 * Courbe à dépassement en CSS. `ressorts.pop` est un ressort react-spring,
 * inutilisable dans une `transition` : voici la transposition, même intention.
 */
export const COURBE_POP_CSS = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

// ─────────────────────────────────────────────────────────── juice

/**
 * Tremblement d'écran. Appliqué à un **conteneur DOM par transformation CSS**,
 * jamais à la caméra 3D — voir `paul-chess-juice`.
 *
 * L'amplitude vaut le **carré** du trauma : les petits événements bougent à peine,
 * les gros frappent. Le déplacement est piloté par des sinusoïdes, jamais par
 * `Math.random()` à chaque image — l'aléatoire par frame bourdonne comme de la neige.
 */
export const tremblement = {
  amplitudeMaxPx: 22,
  rotationMaxDeg: 1.6,
  /** Trauma perdu par seconde. À 1,2, le tremblement s'éteint en ~0,8 s. */
  decroissanceParSeconde: 1.2,
  frequenceHz: 11
} as const

/** Confettis. Plafond dur pour ne pas écrouler un téléphone. */
export const confettis = {
  gravite: 900,
  frottement: 0.86,
  plafondParticules: 420,
  /** Nombre de particules et de vagues par palier. */
  parPalier: {
    petit: { particules: 16, vagues: 1, pluie: false },
    moyen: { particules: 46, vagues: 1, pluie: false },
    grand: { particules: 60, vagues: 2, pluie: true },
    finale: { particules: 90, vagues: 3, pluie: true }
  }
} as const

/**
 * Boutons. Le biseau et son enfoncement au toucher sont ce qui fait la sensation
 * « jeu mobile », plus que la couleur. **Ne se sacrifient jamais.**
 */
export const bouton = {
  biseauPx: 6,
  biseauEnfoncePx: 2
} as const

/**
 * Flash de célébration : réservé aux paliers `grand` et `finale`. Une seule montée,
 * jamais de stroboscope — le jeu se joue devant huit personnes dont on ne connaît
 * pas la sensibilité aux flashs.
 */
export const FLASH_OPACITE_MAX = 0.32
