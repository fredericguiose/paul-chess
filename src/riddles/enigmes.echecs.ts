/**
 * Énigmes d'échecs — lot C.
 *
 * **Ce sont du remplissage assumé.** Le cœur du jeu, ce sont les énigmes
 * personnelles écrites par le groupe (`enigmes.perso.ts`) ; celles-ci comblent les
 * slots restants pour arriver à 15. Elles ne sont pas bâclées pour autant : chacune
 * porte sur un fait qui le concerne, tiré de ses 534 parties et de sa fiche FFE.
 *
 * ⚠️ **Règle de conception absolue : la réponse doit être un fait dont *il* est
 * certain, pas un fait vrai.** Il a lui-même écrit « j'ai pas vérifié mon dernier
 * classement ». Aucune énigme ici ne porte donc sur son Elo courant, ses
 * pourcentages de victoire ou son nombre de parties — personne ne connaît ces
 * chiffres sur soi-même, et un mur au slot 2 tue la soirée.
 *
 * Matériau utilisé, vérifié : `1.e4` dans 99 % de ses parties blanches · Écossaise
 * (ouverture-signature) · Sicilienne avec les noirs · mat à la dame · Kayen Echec
 * Club (Cayenne) · capitaine de la sélection de Guyane · n°1 U20 de Guyane ·
 * vice-champion académique · Initiateur.
 *
 * Contraintes de forme, toutes tenues ici :
 * - énoncés de **2 lignes maximum** — ils seront lus à voix haute ;
 * - rien de gênant : tout le monde entend ;
 * - 2 à 4 orthographes acceptées ;
 * - difficulté croissante dans l'ordre du tableau.
 */

import type { EnigmeModele } from './grille'
import { ENIGMES_POSITION } from './enigmes.positions'

/**
 * L'énigme du **slot 7**, le point de couplage du projet. Elle ne se remplace
 * jamais, quel que soit le nombre d'énigmes personnelles livrées.
 *
 * Elle est placée juste après la faute scriptée du bot (coup 6-8) : elle est vraie à
 * cet instant précis **parce qu'on l'a scriptée**. `caseAttendue` est volontairement
 * absente — la case se calcule à la volée sur la position réelle et arrive par la
 * prop `caseLiveAttendue` de `BandeEnigme`.
 */
export const ENIGME_COUPLAGE: EnigmeModele = {
  id: 'echecs-prise-live',
  nature: 'echecs',
  type: 'square-live',
  enonce: 'Le bot vient de laisser une pièce en prise. Touche sa case sur le diagramme.',
  indices: [
    'Regarde ce qui vient de bouger : la pièce n’est plus défendue.',
    'Compte les attaquants et les défenseurs de la case. Un contre zéro.'
  ]
}

/**
 * Les énigmes de remplissage, **par difficulté croissante**.
 *
 * Les trois premières partent aux slots 1-3 (mise en route, enjeu minimal, réponses
 * évidentes pour lui) ; les suivantes comblent, en montant depuis le slot 4, ce que
 * le groupe n'a pas livré.
 */
/**
 * Les deux positions d'ouverture du lot à diagramme : les plus tranchées des
 * quarante générées. Elles remplacent les anciennes énigmes à case
 * (`square-puzzle`), où il désignait une case unique sur une position choisie pour
 * que le départ soit implicite. Voir `enigmes.positions.ts` pour ce que cette
 * astuce coûtait.
 */
const [POSITION_FACILE_1, POSITION_FACILE_2] = ENIGMES_POSITION

export const ENIGMES_ECHECS: EnigmeModele[] = [
  {
    id: 'echecs-e4',
    nature: 'echecs',
    type: 'text',
    enonce: 'Avec les blancs, tu joues toujours le même premier coup. Écris-le.',
    reponses: ['e4', 'e2e4', '1.e4', 'pion roi'],
    indices: ['Deux caractères suffisent.', 'Le pion devant ton roi, deux cases.']
  },
  {
    id: 'echecs-ecossaise',
    nature: 'echecs',
    type: 'choice',
    enonce: 'Après 1.e4 e5 2.Cf3 Cc6, tu joues 3.d4. Comment s’appelle cette ouverture ?',
    choix: ['Écossaise', 'Italienne', 'Espagnole', 'Gambit du Roi'],
    bonneReponse: 0,
    indices: ['C’est ton ouverture-signature.', 'Un pays du Royaume-Uni.']
  },
  {
    id: 'echecs-club',
    nature: 'echecs',
    type: 'text',
    enonce: 'Le nom de ton club d’échecs, à Cayenne.',
    reponses: ['kayen', 'kayen echec club', 'kayen echecs', 'kayen echec'],
    indices: ['Un seul mot suffit.', 'Ça s’écrit avec un K.']
  },
  {
    id: 'echecs-sicilienne',
    nature: 'echecs',
    type: 'text',
    enonce: 'Avec les noirs, tu réponds 1...c5 à 1.e4. Le nom de cette défense ?',
    reponses: ['sicilienne', 'la sicilienne', 'defense sicilienne', 'sicilian'],
    indices: ['Une île italienne.', 'Elle commence par « sici ».']
  },
  {
    id: 'echecs-dame',
    nature: 'echecs',
    type: 'choice',
    enonce: 'Quand tu mates, c’est le plus souvent avec quelle pièce ?',
    choix: ['La tour', 'La dame', 'Le fou', 'Le cavalier'],
    bonneReponse: 1,
    indices: ['La pièce la plus forte du jeu.', 'Celle que tu sors tôt dans la partie.']
  },
  {
    id: 'echecs-cavalier-centre',
    nature: 'echecs',
    type: 'code',
    enonce: 'Un cavalier posé au centre de l’échiquier contrôle combien de cases ?',
    reponses: ['8'],
    indices: ['Compte les sauts en L, dans toutes les directions.', 'Entre 6 et 9.']
  },
  POSITION_FACILE_1,
  {
    id: 'echecs-capitaine',
    nature: 'echecs',
    type: 'text',
    enonce: 'Dans la sélection de Guyane, tu n’es pas seulement joueur. Tu es quoi ?',
    reponses: ['capitaine', 'le capitaine', 'capitaine de la selection'],
    indices: ['Un seul mot.', 'Celui qui mène l’équipe.']
  },
  POSITION_FACILE_2,
  {
    id: 'echecs-u20',
    nature: 'echecs',
    type: 'code',
    enonce: 'Chez les moins de 20 ans en Guyane, combien de joueurs ont un Elo au-dessus du tien ?',
    reponses: ['0'],
    indices: ['Tu es premier.', 'Le chiffre est plus petit que 1.']
  }
]

/**
 * Réserve — **servie seulement si le groupe livre trop peu d'énigmes
 * personnelles.** La grille y pioche après avoir épuisé `ENIGMES_ECHECS`.
 *
 * ⚠️ L'énigme `offscreen` de cette réserve demande une **préparation physique le
 * jour J** : cacher un fou dans le salon. Si personne ne l'a fait, supprimer cette
 * entrée — une ligne à retirer, rien d'autre.
 */
export const ENIGMES_ECHECS_RESERVE: EnigmeModele[] = [
  {
    id: 'echecs-initiateur',
    nature: 'echecs',
    type: 'choice',
    enonce: 'Tu as un diplôme de la fédération pour enseigner les échecs. Son nom ?',
    choix: ['Entraîneur', 'Initiateur', 'Animateur', 'Instructeur'],
    bonneReponse: 1,
    indices: ['Ça vient du verbe « initier ».', 'Ce n’est pas « entraîneur ».']
  },
  {
    id: 'echecs-vice-champion',
    nature: 'echecs',
    type: 'text',
    enonce: 'Ton titre académique : tu as fini deuxième. Tu es donc quoi ?',
    reponses: ['vice champion', 'vice champion academique', 'vicechampion'],
    indices: ['Deux mots, trait d’union possible.', 'Ça commence par « vice ».']
  },
  {
    id: 'echecs-fou-cache',
    nature: 'echecs',
    type: 'offscreen',
    enonce: 'Une pièce d’échecs est cachée dans cette pièce. Trouve-la et dis laquelle.',
    reponses: ['fou', 'le fou', 'un fou'],
    indices: ['Lève-toi, tout le monde cherche.', 'Elle se déplace en diagonale.']
  },
  {
    id: 'echecs-roque',
    nature: 'echecs',
    type: 'code',
    enonce: 'Au petit roque des blancs, roi et tour finissent sur la même rangée. Laquelle ?',
    reponses: ['1'],
    indices: ['La rangée de départ des blancs.', 'Un seul chiffre.']
  },
  // Le fond de réserve : les 38 positions à diagramme non placées, dans l'ordre de
  // difficulté croissante. Elles rendent le stock d'énigmes d'échecs inépuisable —
  // même si le groupe ne livre **aucune** énigme personnelle, les 15 slots se
  // remplissent sans joker, et sans jamais reposer deux fois la même question.
  ...ENIGMES_POSITION.slice(2)
]
