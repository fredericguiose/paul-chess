/**
 * Les énigmes de position — « les blancs jouent, quel est le meilleur coup ? ».
 *
 * Une position tirée de ses propres parties s'affiche en diagramme, quatre coups
 * sont proposés en boutons, un seul est le bon. C'est le seul type d'énigme du jeu
 * où **il joue aux échecs** plutôt que de répondre sur lui-même.
 *
 * Le type est `choice`, pas un nouveau type. Un QCM sur une position reste un QCM :
 * l'ajout, c'est le diagramme au-dessus des boutons, porté par `fenPuzzle` — un
 * champ qui existait déjà. Rien n'entre dans `TypeEnigme`, `verifierReponse` ne
 * bouge pas, et le mode de secours sans WebGL continue de fonctionner puisque le
 * diagramme est le même SVG que le reste.
 *
 * **Pourquoi pas « touche la case du bon coup ».** Un coup, c'est deux cases. Les
 * anciennes énigmes à case rendaient le départ implicite (« la case où les noirs
 * prennent le pion » : une seule pièce peut prendre). Sur une position quelconque,
 * cette astuce tombe — trois pièces peuvent atteindre la même case, et il aurait la
 * bonne case avec la mauvaise idée. Les boutons portent le coup entier.
 *
 * Les positions viennent de `positions.qcm.ts`, fichier généré : voir son en-tête
 * pour la méthode et le seuil de sélection.
 */

import type { EnigmeModele } from './grille'
import { POSITIONS_QCM, type PositionQcm } from './positions.qcm'

/**
 * L'énoncé ne dit jamais ce que le coup gagne : « gagne une pièce » transformerait
 * la recherche en vérification. C'est le rôle du deuxième indice, après deux échecs.
 */
function enonce(position: PositionQcm): string {
  const mat = position.choix[position.bonneReponse].includes('#')
  return mat
    ? 'Les blancs matent en un coup. Lequel ?'
    : 'Les blancs jouent. Quel est le meilleur coup ?'
}

function versEnigme(position: PositionQcm): EnigmeModele {
  return {
    id: position.id,
    nature: 'echecs',
    type: 'choice',
    enonce: enonce(position),
    choix: [...position.choix],
    bonneReponse: position.bonneReponse,
    fenPuzzle: position.fen,
    indices: [...position.indices]
  }
}

/**
 * Les `n` positions **les plus lisibles**, dans l'ordre de difficulté croissante.
 *
 * `POSITIONS_QCM` est trié par écart décroissant : la première position est celle où
 * le bon coup écrase le plus les trois autres, donc la plus facile. On prend donc en
 * tête, et on conserve l'ordre — la grille pose les énigmes d'échecs dans l'ordre du
 * tableau, sur des slots croissants.
 */
export function enigmesPosition(n: number): EnigmeModele[] {
  return POSITIONS_QCM.slice(0, Math.max(0, n)).map(versEnigme)
}

/** Toutes les positions disponibles, si jamais le groupe ne livre rien. */
export const ENIGMES_POSITION: EnigmeModele[] = POSITIONS_QCM.map(versEnigme)
