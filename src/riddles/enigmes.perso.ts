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

  // ── de Samuel ───────────────────────────────────────────────────────────
  {
    id: 'perso-hamster',
    nature: 'perso',
    type: 'text',
    enonce:
      "À quel animal tu ressemblais sur la photo que j'ai prise de toi chez Mathys ?",
    reponses: ['hamster', 'un hamster', 'hamsters'],
    indices: ['Ça nous a tous fait marrer. Moi le premier.', 'Petit, les joues pleines.'],
    auteur: 'Samuel'
  },
  {
    id: 'perso-ordi-cdi',
    nature: 'perso',
    type: 'choice',
    enonce:
      "Juste après notre première rencontre, on a failli avoir de gros problèmes à cause de moi. C'était quoi ?",
    choix: [
      "Tu utilisais mon téléphone et tu t'es fait choper par M. Richard",
      "J'ai tapé n'importe quoi sur l'ordi du CDI"
    ],
    bonneReponse: 1,
    indices: ['Ce n’était pas un téléphone.', 'Un ordinateur, au CDI.'],
    auteur: 'Samuel'
  },

  // ── d'Ibrahim ───────────────────────────────────────────────────────────
  {
    id: 'perso-senegal',
    nature: 'perso',
    type: 'choice',
    enonce: 'À qui ça correspond : « SENEGAAAAAL » ?',
    choix: ['Gilles', 'Yann', 'Ibrahim'],
    bonneReponse: 2,
    indices: ['Il crie ça souvent.', "C'est celui qui a écrit cette énigme."],
    auteur: 'Ibrahim'
  },
  {
    id: 'perso-reveil',
    nature: 'perso',
    type: 'text',
    enonce: 'Votre première interaction avec Ibrahim, c’était quoi ?',
    reponses: ['le reveiller en cours', 'le reveiller', 'reveiller en cours', 'le réveiller'],
    indices: ['Ça se passait en cours.', 'Il dormait.'],
    auteur: 'Ibrahim'
  },
  {
    id: 'perso-rachel',
    nature: 'perso',
    type: 'text',
    enonce:
      "Le groupe aux 1000 péripéties qui t'a suivi sur Insta, Discord et WhatsApp en première : son nom ?",
    reponses: ['rachel'],
    indices: ['Un prénom.', 'Un prénom de fille.'],
    auteur: 'Ibrahim'
  },
  {
    id: 'perso-ffjm',
    nature: 'perso',
    type: 'text',
    enonce: 'Le nom du concours de maths que tu as fait en début d’année ?',
    reponses: ['ffjm', 'f.f.j.m', 'federation francaise des jeux mathematiques'],
    indices: ['Quatre lettres.', 'Ça commence par FF.'],
    auteur: 'Ibrahim'
  },
  {
    id: 'perso-sticker',
    nature: 'perso',
    type: 'text',
    enonce: "Le sticker d'Ibrahim que tu détestes le plus ?",
    reponses: ['couillon', 'le couillon'],
    indices: ['Il te l’envoie exprès.', 'Ça commence par C.'],
    auteur: 'Ibrahim'
  },
  {
    id: 'perso-jean-moise',
    nature: 'perso',
    type: 'text',
    enonce: "L'un des plus grands échecs de la carrière d'Ibrahim ?",
    reponses: ['jean moise', 'jean-moise', 'jean moïse'],
    indices: ['Un nom et un prénom.', 'Jean quelque chose.'],
    auteur: 'Ibrahim'
  },
  {
    id: 'perso-ifas',
    nature: 'perso',
    type: 'text',
    enonce: 'Lieu de départ habituel de la Délégation ?',
    reponses: ['ifas', 'l ifas'],
    indices: ['Quatre lettres.', 'Ça commence par I.'],
    auteur: 'Ibrahim'
  }

  // ⚠️ EN ATTENTE — énigme de Samuel sans réponse fournie.
  // « Additionne : 1) l'année exacte de notre première rencontre, 2) le nombre
  //   d'années depuis qu'on se connaît, 3) le numéro de la classe de collège où
  //   tu as été le plus gros soutien pour moi. »
  // Il manque LE TOTAL. Sans lui l'énigme est injouable : la validez-vous à quoi ?
  // Dès que Samuel donne le chiffre, décommenter et le mettre dans `reponses`.
  //
  // {
  //   id: 'perso-addition',
  //   nature: 'perso',
  //   type: 'code',
  //   enonce:
  //     "Additionne : l'année de notre rencontre + les années depuis qu'on se connaît + le numéro de ma classe de collège.",
  //   reponses: ['????'],
  //   indices: ['Trois nombres à additionner.', 'Le premier est une année.'],
  //   auteur: 'Samuel'
  // }

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
