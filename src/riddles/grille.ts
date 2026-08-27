/**
 * La grille des 15 slots — lot C.
 *
 * Assemble deux sources indépendantes (`enigmes.perso.ts`, écrit par le groupe, et
 * `enigmes.echecs.ts`, du remplissage) en exactement `NOMBRE_DE_COUPS` énigmes, une
 * par coup du joueur.
 *
 * **Le nombre d'énigmes personnelles est le seul inconnu du projet.** La grille
 * absorbe n'importe quel N, de 0 à 14, sans configuration : ce qui manque est comblé
 * par les énigmes d'échecs, puis par la réserve.
 *
 * Règles de placement, tirées du plan :
 * - **slots 1 → 3** : échecs d'abord. Mise en route, enjeu minimal, réponses
 *   évidentes pour lui.
 * - **slot 7** : `ENIGME_COUPLAGE`, verrouillée. Le point de couplage entre le
 *   système d'énigmes et le moteur — elle ne se remplace jamais.
 * - **slot 15** : le climax, personnel en priorité.
 * - **le reste** : les personnelles prennent les meilleurs slots en descendant
 *   depuis 15 ; les échecs comblent le reste en montant depuis 4.
 *
 * Conséquence utile : si le groupe ne livre que 5 énigmes, elles tombent sur les
 * 5 meilleurs slots (15, 14, 13, 12, 11) au lieu d'être dispersées. **La qualité du
 * final ne dépend pas du volume produit.**
 */

import { NOMBRE_DE_COUPS, type Enigme, type NumeroCoup } from '../types'
import {
  ENIGMES_ECHECS,
  ENIGMES_ECHECS_RESERVE,
  ENIGME_COUPLAGE
} from './enigmes.echecs'
import { ENIGMES_PERSO } from './enigmes.perso'

/**
 * Une énigme telle qu'on l'écrit : **sans son slot**. Le numéro de coup est une
 * décision de la grille, pas de l'auteur — c'est ce qui permet au groupe d'écrire
 * sans se soucier de l'ordre.
 */
export type EnigmeModele = Omit<Enigme, 'coup'>

/** Le point de couplage. Ne se remplace jamais. */
const SLOT_COUPLAGE: NumeroCoup = 7
/** Le climax : personnel en priorité. */
const SLOT_FINAL: NumeroCoup = NOMBRE_DE_COUPS
/** Là où va le remplissage en premier. */
const SLOTS_DEPART: NumeroCoup[] = [1, 2, 3]

/** `offscreen` demande une préparation physique : deux au maximum sur tout le jeu. */
const MAX_OFFSCREEN = 2

/**
 * Ordre de préférence des personnelles : le meilleur slot d'abord, en descendant.
 * La première énigme du fichier prend donc le slot 15.
 */
const ORDRE_PERSO: NumeroCoup[] = [15, 14, 13, 12, 11, 10, 9, 8, 6, 5, 4]

/** Ordre de comblement des échecs : en montant, les slots faibles d'abord. */
const ORDRE_ECHECS: NumeroCoup[] = [4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15]

/**
 * Dernier filet de sécurité. Si le groupe ne livre rien **et** que le stock d'échecs
 * est épuisé, un slot resterait vide et le jeu s'arrêterait au milieu — inacceptable
 * le soir J. Cette énigme est triviale par construction : elle laisse passer.
 */
const joker = (n: number): EnigmeModele => ({
  id: `joker-${n}`,
  nature: 'echecs',
  type: 'text',
  enonce: 'Écris le nom du jeu auquel tu es en train de jouer.',
  reponses: ['echecs', 'les echecs', 'chess'],
  indices: ['Six lettres.', 'C’est le titre de cette page.']
})

/**
 * Construit la grille complète. Les paramètres existent pour pouvoir tester d'autres
 * jeux d'énigmes sans toucher au reste — en production, les valeurs par défaut.
 */
export function construireGrille(
  perso: EnigmeModele[] = ENIGMES_PERSO,
  echecs: EnigmeModele[] = ENIGMES_ECHECS,
  reserve: EnigmeModele[] = ENIGMES_ECHECS_RESERVE
): Enigme[] {
  const grille = new Map<NumeroCoup, EnigmeModele>()
  let offscreenPlaces = 0

  const poser = (slot: NumeroCoup, modele: EnigmeModele): void => {
    grille.set(slot, modele)
    if (modele.type === 'offscreen') offscreenPlaces++
  }

  // 1. Le point de couplage, avant tout le reste.
  poser(SLOT_COUPLAGE, ENIGME_COUPLAGE)

  // 2. Le remplissage d'échecs, sans l'énigme de couplage qui a déjà son slot.
  const poolEchecs = [...echecs, ...reserve].filter((e) => e.id !== ENIGME_COUPLAGE.id)

  // 3. Slots 1 → 3 : échecs d'abord, dans l'ordre de difficulté croissante.
  for (const slot of SLOTS_DEPART) {
    const modele = prendre(poolEchecs, { offscreenAutorise: false })
    if (modele) poser(slot, modele)
  }

  // 4. Les personnelles, sur les meilleurs slots libres en descendant depuis 15.
  const filePerso = [...perso]
  for (const slot of ORDRE_PERSO) {
    if (filePerso.length === 0) break
    if (grille.has(slot)) continue
    const modele = filePerso.shift()!
    // `square-live` est réservé au slot 7 : sur un autre slot, personne ne calcule
    // la case attendue et l'énigme serait invalidable.
    if (modele.type === 'square-live') continue
    if (modele.type === 'offscreen' && offscreenPlaces >= MAX_OFFSCREEN) continue
    poser(slot, modele)
  }

  // 5. Les échecs comblent le reste, en montant depuis le slot 4.
  for (const slot of ORDRE_ECHECS) {
    if (grille.has(slot)) continue
    // Le climax ne doit pas dépendre de quelqu'un qui retrouve un objet dans le salon.
    const offscreenAutorise = slot !== SLOT_FINAL && offscreenPlaces < MAX_OFFSCREEN
    const modele = prendre(poolEchecs, { offscreenAutorise })
    poser(slot, modele ?? joker(slot))
  }

  // 6. Figeage : chaque modèle reçoit son slot, et l'ordre de jeu est celui des coups.
  return Array.from(grille.entries())
    .sort(([a], [b]) => a - b)
    .map(([coup, modele]) => ({ ...modele, coup }))
}

/** Retire du pool la première énigme utilisable, ou `undefined` s'il est vide. */
function prendre(
  pool: EnigmeModele[],
  { offscreenAutorise }: { offscreenAutorise: boolean }
): EnigmeModele | undefined {
  const index = pool.findIndex((e) => offscreenAutorise || e.type !== 'offscreen')
  if (index === -1) return undefined
  return pool.splice(index, 1)[0]
}

/**
 * La grille du jeu. Construite une seule fois au chargement du module : les sources
 * sont statiques, et une grille qui changerait entre deux rendus ferait sauter des
 * énigmes en cours de partie.
 */
export const GRILLE: Enigme[] = construireGrille()

/** L'énigme du coup courant, ou `undefined` au-delà du dernier coup. */
export function enigmePourCoup(coup: NumeroCoup): Enigme | undefined {
  return GRILLE.find((e) => e.coup === coup)
}
