/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES ÉNIGMES PERSONNELLES — À REMPLIR PAR LE GROUPE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est LE cœur du jeu. Les énigmes d'échecs ne sont là que pour compléter
 * jusqu'à 15. Chaque énigme que vous écrivez ici remplace une énigme d'échecs,
 * et prend le MEILLEUR slot restant.
 *
 * ┌─ RÈGLE D'ORDRE ────────────────────────────────────────────────────────┐
 * │ La PREMIÈRE de la liste passe en DERNIER dans le jeu (slot 15, juste   │
 * │ avant le cadeau). La deuxième au slot 14, et ainsi de suite.           │
 * │ → METTEZ VOTRE MEILLEURE ÉNIGME EN PREMIER.                            │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Vous pouvez en écrire de 1 à 14. Le jeu marche dans tous les cas : ce qui
 * manque est comblé automatiquement par les énigmes d'échecs.
 *
 * ── LES 5 RÈGLES ABSOLUES ────────────────────────────────────────────────
 * 1. COURT. Deux lignes maximum. L'énoncé sera lu à voix haute.
 * 2. PUBLIC. Huit personnes écoutent. Rien d'intime, rien de gênant,
 *    rien qui implique quelqu'un d'absent.
 * 3. IL DOIT ÊTRE SÛR DE LA RÉPONSE. Pas « un fait vrai » : un fait dont
 *    LUI se souvient. Une date exacte qu'il n'a jamais notée = un mur.
 * 4. Toujours au moins 2 indices, du plus vague au plus explicite.
 * 5. Pour du texte, mettez 2 à 4 orthographes acceptées. La validation
 *    ignore déjà accents, majuscules, ponctuation et une faute de frappe.
 *
 * ── LE FORMAT ────────────────────────────────────────────────────────────
 * Copiez un des modèles commentés plus bas, collez-le dans le tableau
 * ENIGMES_PERSO, remplissez. Champs communs à TOUS les types :
 *
 *   id       : texte unique et court, sans espace   ex. 'perso-plage'
 *   nature   : toujours 'perso'
 *   type     : 'text' | 'code' | 'choice' | 'square-puzzle' | 'offscreen'
 *   enonce   : la question, 2 lignes max
 *   indices  : 2 textes ['vague', 'explicite']
 *   auteur   : votre prénom (facultatif, s'affiche sous l'énigme)
 *
 * ⚠️ N'utilisez PAS le type 'square-live' : il est réservé au slot 7.
 * ⚠️ Deux énigmes 'offscreen' AU MAXIMUM sur tout le jeu.
 */

import type { EnigmeModele } from './grille'

export const ENIGMES_PERSO: EnigmeModele[] = [
  // ▼▼▼ ÉCRIVEZ VOS ÉNIGMES ICI — la première sera jouée en dernier ▼▼▼
  // ▲▲▲ ────────────────────────────────────────────────────────── ▲▲▲
]

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  LES 5 MODÈLES — copiez, collez dans le tableau ci-dessus, remplissez
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── 1. 'text' — il tape une réponse au clavier ────────────────────────────
 *  {
 *    id: 'perso-surnom',
 *    nature: 'perso',
 *    type: 'text',
 *    enonce: 'Le surnom qu’on te donne au club depuis la première fois ?',
 *    reponses: ['le prof', 'prof', 'monsieur le prof'],   // 2 à 4 variantes
 *    indices: ['Deux mots.', 'Ça commence par « le ».'],
 *    auteur: 'Marie'
 *  },
 *
 * ── 2. 'code' — pavé numérique. La réponse est UN NOMBRE. Strict. ─────────
 *  {
 *    id: 'perso-annee',
 *    nature: 'perso',
 *    type: 'code',
 *    enonce: 'En quelle année on s’est rencontrés, au collège ?',
 *    reponses: ['2021'],
 *    indices: ['C’était en sixième.', 'Le chiffre du milieu est un 0.'],
 *    auteur: 'Yanis'
 *  },
 *
 * ── 3. 'choice' — boutons. UNE seule bonne réponse. ───────────────────────
 *     bonneReponse = la POSITION dans choix, en comptant à partir de 0.
 *     Ici la bonne réponse est 'Le poulet boucané' → position 1.
 *  {
 *    id: 'perso-plat',
 *    nature: 'perso',
 *    type: 'choice',
 *    enonce: 'Qu’est-ce que tu commandes à chaque fois qu’on sort manger ?',
 *    choix: ['Le bokit', 'Le poulet boucané', 'Le colombo', 'Les acras'],
 *    bonneReponse: 1,
 *    indices: ['Ce n’est pas ce que tout le monde prend.', 'C’est grillé.'],
 *    auteur: 'Kevin'
 *  },
 *
 * ── 4. 'offscreen' — la réponse est DANS LE SALON. Deux maximum. ──────────
 *     Il faut PRÉPARER l'objet physiquement avant qu'il arrive.
 *     Il tape ensuite la réponse au clavier, comme un 'text'.
 *  {
 *    id: 'perso-enveloppe',
 *    nature: 'perso',
 *    type: 'offscreen',
 *    enonce: 'Une enveloppe est scotchée sous une chaise. Tape le mot qui est dedans.',
 *    reponses: ['dragon', 'le dragon'],
 *    indices: ['Sous une chaise, pas sur la table.', 'Tout le monde peut chercher.'],
 *    auteur: 'Frédéric'
 *  },
 *
 * ── 5. 'square-puzzle' — il touche une case d'un mini-échiquier ───────────
 *     Réservé à quelqu'un qui sait écrire une position en FEN.
 *     Si vous n'êtes pas sûr : ne l'utilisez pas, on en a déjà côté échecs.
 *  {
 *    id: 'perso-puzzle',
 *    nature: 'perso',
 *    type: 'square-puzzle',
 *    enonce: 'La position de ta plus belle partie. Touche la case du coup gagnant.',
 *    fenPuzzle: '6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1',
 *    caseAttendue: 'd8',
 *    indices: ['Regarde la dame.', 'Huitième rangée.'],
 *    auteur: 'Paul'
 *  },
 */
