# paul-chess — jeu d'énigmes pour l'anniversaire de Paul-Erwan

## Context

Frédéric offre un **échiquier physique personnalisé** à **Paul-Erwan Ahounkeng Ponka**
(`pedagopaul` sur Chess.com), joueur de club guyanais. Le cadeau est révélé au terme d'un
jeu web : une suite de 15 énigmes — moitié échecs, moitié personnelles — fait avancer une
partie d'échecs sur un échiquier 3D. Paul gagne, le cadeau est dévoilé.

Un groupe d'amis s'organise autour et plusieurs offrent aussi un cadeau. Le plateau
**n'est pas encore commandé** : la récompense finale sera d'abord un reçu recadré.

### ⚠️ Où vit quoi — une seule source de vérité par fait

Une règle traverse tout le projet : **dupliquer une valeur est dangereux** (un seuil écrit
en prose et en constante finit par diverger — c'est ce qui a produit trois bugs successifs
en une session) ; **dupliquer une règle est sain** (« les particules hors de la scène 3D »
ne peut pas dériver, et deux agents distincts en ont besoin).

| | Contient | Lecteur |
|---|---|---|
| **`src/types.ts`** | **toutes les valeurs du moteur** (`REGLES_BOT`, `LIVRE_OUVERTURE`, `TRAUMA_PAR_PALIER`), la convention coup/demi-coup, les 6 types d'énigmes | tous les lots |
| **`src/theme.ts`** | **toutes les valeurs d'apparence** : couleurs, polices, géométrie, caméras, ressorts, durées | lots B, D, E, F |
| **`src/store.ts`** | l'état, et les dérivés déjà implémentés (`botPeutAbandonner`, `peutPasser`, `indicesVisibles`) | tous les lots |
| **`.claude/skills/paul-chess-engine`** | le **comment** et le **pourquoi** du moteur : UCI, faute plausible, garde-fou, pièges rencontrés | agent du lot A |
| **`.claude/skills/paul-chess-board3d`** | rendu : caméras, saisie, cel-shading, `OrbitControls` interdit | agent du lot B |
| **`.claude/skills/paul-chess-juice`** | game feel : trauma², escalade, vibration, accessibilité | agent du lot D |
| **`data/*.md`** | les mesures brutes et les avertissements sur leur qualité | tous |
| **ce plan** | le **pourquoi** global, ce qu'on a écarté, la séquence, les points ouverts | Frédéric |

**Les documents n'énoncent aucune valeur numérique** — ils renvoient aux constantes du code.

### La leçon la plus chère de la conception

Trois versions successives de la règle d'abandon ont été fausses, toutes pour la même
raison : **conditionner la fin de partie à une évaluation alors qu'elle doit l'être au
temps.** Le nombre de coups est la seule grandeur qu'on contrôle.

Historique complet et pièges à ne pas réintroduire : `paul-chess-engine`.

---

## La mécanique — et pourquoi les trois voies initiales sont tombées

Paul joue une **vraie partie**, avec ses vrais coups. L'ouverture du bot est scriptée pour
l'amener dans son répertoire, le bot commet une faute calibrée, puis abandonne après le
15ᵉ coup. **15 coups, 15 énigmes, aucune condition de défaite.**

Le critère de tri qui a écarté les trois voies du schéma initial :
**qui contrôle le nombre de coups — les concepteurs, ou le joueur ?**

| Voie écartée | Raison, mesurée |
|---|---|
| Bot réglé faible pour raccourcir la partie | **Ne marche pas.** Face à un adversaire 100-300 points plus faible, il gagne en ≤15 coups dans **9 %** des cas ; face à un plus fort, dans **30 %**. Médiane : **26 coups dans tous les cas**. Un bot faible joue passivement — il **allonge** la partie. |
| Partie entièrement scriptée (voie 3) | 19 énigmes seulement, mais Paul ne joue pas : l'échiquier devient une barre de progression. |
| Vraie partie libre (voie 2) | ~40 énigmes pour couvrir 82 % des durées possibles, et un risque réel qu'il perde. |
| Une limite de coups qui le ferait perdre | **Une limite annoncée puis non appliquée est pire qu'aucune limite.** Sa victoire médiane fait 26 coups : il dépasserait toute limite serrée. S'il dépasse et que rien ne se passe, il comprend que rien n'était réel, au moment exact du climax. La tension est **sociale** (téléphone + huit personnes), pas mécanique. |

Autorisé en revanche : des **objectifs** ratables sans conséquence — « mate en 15 coups ou
moins » donne une mention à la révélation, rien de plus.

---

## Le destinataire — mesures

### Chess.com : 534 parties, avril 2025 → août 2026

- Rapide **1729** (best) · 68 % de victoires
- **Blancs : `1.e4` dans 99 % des parties.** Écossaise (C44/C45/C47) : 87 sur 266
- **Noirs : `1...c5` dans 64 %.** Sicilienne : 154 sur 268
- **Il mate à la dame dans 86 de ses 142 mats (62 %)** ; sa dame sort avant le 10ᵉ coup
  dans 43 % des parties ; ses prises se concentrent sur `d4`/`d5`/`e5`/`e4`
- Portrait : **joueur de centre et de dame**, ouvre le milieu au 3ᵉ coup

### Fiabilité du livre d'ouverture : 91 %

Mesurée sur 258 parties avec les blancs, le bot jouant les noirs et choisissant ses
réponses. Détail et plancher statistique dans `paul-chess-engine`.

Au-delà du 4ᵉ coup les données ne portent plus : 100 % de fiabilité, mais sur 32 puis 11
parties. **C'est pour ça qu'on script 4 coups et pas 6.**

### FFE

| Ligne | Valeur | Lecture |
|---|---|---|
| **Rapide** | **1930 N** | `N` = national, vrai classement. **Seul chiffre fiable.** |
| Lent | 1299 **E** | estimé d'après son âge de début. Sans valeur. |
| Blitz | 1540 **E** | estimé. Sans valeur. |

**Arbitre Jeune**, **Initiateur**, Licence A du 02/05/2026, **Kayen Echec Club** (Cayenne).

Déclaré par lui (WhatsApp, 27/08/2026) : vice-champion académique · **n°1 en Elo chez les
moins de 20 ans en Guyane** · **capitaine de la sélection de Guyane** · pas de titre majeur
cette saison · pic Elo 2100.

### Profil d'erreurs (Stockfish 18, 2384 de ses coups)

| Coups | Perte moyenne | Taux de gaffe |
|---|---|---|
| 1-5 | **14** | **0 %** |
| 6-10 | 43 | 3 % |
| 11-25 | ~55 | 2-4 % |
| **26-30** | **86** | **8 %** |

77 % de ses coups sont corrects. **Son ouverture est quasi parfaite ; sa fenêtre de
fragilité est le coup 26-30.** Finir au 15ᵉ coup laisse une marge confortable : au-delà du
25ᵉ, c'est *lui* qui risquerait de perdre.

### ⚠️ Qualité des données

Compte Chess.com **volontairement saboté au départ** (compte pédagogique) : 19 parties
abandonnées après 1 à 3 coups, classement tombé de 564 à 100 en une journée. Détail dans
`data/DONNEES-A-SAVOIR.md`.

Conséquence : **86 parties seulement sont fiables** (mai→août 2026, classement ≥ 1450). Les
statistiques de *style* utilisent 515 parties (sabotage exclu) ; celles de *performance* et
le profil d'erreurs, les 86.

**Le corpus ne contient aucune partie officielle de Guyane.** Les seuls « tournois »
présents sont des arènes publiques mondiales Chess.com. Pour une partie de ligue ou de
championnat, la seule source est Paul lui-même.

---

## Décisions de conception

### Contexte d'usage : téléphone, entouré de monde

C'est la configuration la plus contraignante. Trois règles absolues :

1. **Les énigmes sont publiques.** Tout sera lu à voix haute devant le groupe. Rien
   d'intime, rien de gênant, rien qui implique un absent.
2. **Les autres ne voient pas l'écran.** Énoncés **courts**, lisibles à voix haute, réponse
   qui se dit. Aucune énigme reposant sur un détail visuel.
3. **Aucun chronomètre.** Quelqu'un parle, quelqu'un apporte à boire. Le jeu doit être
   interruptible à tout instant — ce qui rend la persistance de l'état **obligatoire**.

### Cadrage et entrée

- **Lien énigme ↔ coup : cadrage minimal.** Une phrase sur l'écran d'intro (« tu ne peux
  jouer ton prochain coup qu'en répondant »). Pas d'univers fictionnel.
- **Voix** : narrateur textuel neutre. Pas de voix off, pas de personnage.
- **Entrée : QR code sur une carte physique.** Le verso porte le plan B papier.
- **L'écran d'intro est un écran de chargement déguisé** : c'est pendant les 15-20 secondes
  de lecture que les 7,3 Mo de Stockfish se téléchargent. Seul endroit du parcours où ce
  téléchargement s'absorbe sans faire attendre.

### Mise en page

- **Portrait verrouillé**, plateau carré centré.
- **Pas de modale plein écran.** L'énigme s'affiche dans une **bande sous le plateau**,
  visible en permanence. Une modale cacherait le plateau, donc interdirait les énigmes
  `square-live` — celles-là mêmes qui justifient d'avoir une 3D.
- `Dialog` de shadcn ne sert plus que pour la révélation finale.

### Les temps morts sont la récompense

Cycle après chaque bonne réponse : bande repliée → caméra vers `iso` → **le coup s'anime**
→ le bot répond → retour en vue de dessus. Quatre à six secondes de mise en scène, quinze
fois dans la soirée. **C'est là que l'échiquier 3D existe.** Ne pas les combler : les mettre
en scène, avec une emphase variable selon l'événement.

### Direction artistique : jeu mobile cartoon

**Registre Brawl Stars / Clash of Clans**, sur les couleurs des échecs et un thème bois.
Avec huit personnes autour, **le juice est le mécanisme de célébration collective** — c'est
ce qui fait réagir la salle. Un design sobre laisse le groupe silencieux.

Deux effets de bord notables :

- **Ça enlève du travail sur la 3D.** Les primitives paramétriques, prévues comme version
  provisoire, deviennent le style visé. **Le `.glb` sort du programme.**
- **La crédibilité devient moins critique.** Dans un registre cartoon assumé, les éléments
  scriptés se lisent comme de la mécanique de jeu. Ça ne supprime pas la règle d'abandon —
  un abandon en position égale serait quand même repéré par un joueur à 1930 — mais le coût
  de le remarquer baisse fortement.

Palette, typographie, formules d'animation : voir `paul-chess-juice` et
`paul-chess-board3d`.

### Apparence de l'échiquier — interchangeable

Tout dans `src/theme.ts`. Quand les photos du plateau commandé arriveront, elles régleront
la teinte du bois, la silhouette des pièces, et un détail signature s'il y en a un.
**Ne pas utiliser la photo comme texture** : un bois photographique jure en cel-shading.
La vraie photo est montrée à la révélation.

### Révélation — interchangeable aussi

`src/reveal/Reveal.tsx` prend un **tableau d'images** depuis `public/reveal/`. Le tableau
permet plusieurs cadeaux dévoilés en séquence — les autres participants n'ont pas encore
confirmé les leurs.

⚠️ **Un screenshot de reçu contient une adresse de livraison, un numéro de commande, des
chiffres de carte. Recadrer avant intégration** : le site sera sur une URL publique.

---

## La grille des 15 énigmes

**Les énigmes d'échecs sont du remplissage.** Le cœur du jeu, ce sont les énigmes
personnelles ; les énigmes d'échecs existent pour compléter jusqu'à 15. Et elles ne sont pas
un bloquant : **elles se génèrent depuis les données mesurées** (répertoire, classements,
club, rôle, titre).

Donc la répartition n'est pas fixe : **N personnelles + (15 − N) d'échecs.** Le groupe en
écrit autant qu'il peut, la grille absorbe n'importe quel N.

### Ordre de remplissage — le remplissage occupe les slots faibles

| Slots | Priorité | Rôle |
|---|---|---|
| **1 → 3** | **échecs d'abord** | mise en route, enjeu minimal. Réponses évidentes pour lui : son ouverture, son club. C'est là que le remplissage va en premier. |
| **7** | **échecs, verrouillé** | le point de couplage. Ne se remplace jamais, quel que soit N. |
| **4 → 6, 8 → 14** | **personnelles en priorité** | les échecs ne comblent que ce que le groupe ne livre pas, en partant de 4 et en montant. |
| **15** | **personnelle, obligatoire** | le climax. Enchaîne sur l'abandon du bot et la révélation. |

Conséquence utile : si le groupe ne livre que 5 énigmes personnelles, elles tombent sur les
**5 meilleurs slots** (15, 14, 13, 12, 11) au lieu d'être dispersées au hasard. La qualité du
final ne dépend pas du volume produit.

### Le slot 7 est le point de couplage du projet

Type `square-live`, placé **juste après la faute scriptée du bot** (coup 6-8). Énoncé du
genre « le bot vient de laisser une pièce en prise — touche la case ». Elle est **vraie à cet
instant précis parce qu'on l'a scriptée**.

C'est le seul endroit où le système d'énigmes et le moteur d'échecs se rejoignent
réellement — partout ailleurs ils sont juxtaposés. **C'est aussi ce qui empêche l'échiquier
3D d'être décoratif.** Elle survit donc au statut de « remplissage » des autres énigmes
d'échecs : ce n'en est pas une.

### Le type d'interaction est indépendant de la nature

Le groupe n'a pas à réfléchir aux types : **il écrit des questions, l'attribution des types
vient après.** Une énigme personnelle peut être un `code` (« combien de fois t'ai-je
battu ? »), un `choice`, un `offscreen`.

Contraintes à respecter dans l'attribution finale :

- **difficulté croissante** du slot 1 au slot 15
- `square-live` **uniquement à partir du slot 5** — avant, la position sort du livre
  d'ouverture et ne présente aucune tension lisible
- `offscreen` **deux fois maximum**, ni au slot 1 (rien n'est encore lancé) ni au slot 15
  (le climax ne doit pas dépendre de quelqu'un qui retrouve un objet)
- viser l'usage des **six types** au moins une fois, pour la variété de rythme

### Les types, en deux mots

| Type | Interaction |
|---|---|
| `text` | champ texte, validation tolérante (accents, casse, Levenshtein ≤ 1 sur les mots longs) |
| `code` | pavé numérique |
| `choice` | boutons |
| `square-live` | **il touche une case du plateau principal**, sur la position réelle en cours |
| `square-puzzle` | il touche une case d'un **mini-plateau 2D SVG** dans la bande d'énigme |
| `offscreen` | l'indice est à l'écran, **la réponse est dans le salon** |

`offscreen` est validé par le contexte : téléphone + groupe = huit personnes qui se lèvent
pour chercher. Coût technique nul, effet maximal, mais demande de la préparation physique
le jour J.

**Règle de conception, tirée de la session : la réponse doit être un fait dont *il* est
certain, pas un fait vrai.** Il a lui-même écrit « j'ai pas vérifié mon dernier
classement » — une énigme sur son classement courant serait un mur.

Matériau échecs utilisable : son ouverture-signature (Écossaise), sa défense (Sicilienne),
son classement rapide FFE (1930), son club (Kayen), son rôle (capitaine), son titre
(vice-champion académique), son rang U20 (1er), sa fonction (initiateur).
À écarter : son classement lent (1299, estimé), son Elo courant, ses pourcentages de
victoire.

**Les énigmes personnelles sont à écrire par le groupe.** Les énigmes d'échecs se génèrent
depuis les données ci-dessus, donc le seul inconnu est **le nombre d'énigmes personnelles
livrées** — pas leur existence. La grille fonctionne à partir d'une seule (le slot 15), et le
jeu reste jouable de bout en bout dans tous les cas.

### Indices et sécurité

- **Indices progressifs** : 2 échecs → indice 1 · 4 → indice 2 · 6 → bouton « passer ».
  **Aucune énigme ne peut bloquer le cadeau.**
- **Backdoor** pour Frédéric (séquence de touches) → saut au coup N.
- **Progression visible en permanence** : « 7 / 15 ».

---

## Stack

| Rôle | Choix |
|---|---|
| Build | **Vite + React + TypeScript**, SPA statique — une page, pas de routing, pas de SEO, pas de serveur |
| 3D | **react-three-fiber** + `@react-three/drei` |
| Animation | `@react-spring/three` |
| UI | **Tailwind v4** + 3 composants shadcn (`Button`, `Input`, `Dialog`) |
| État | **zustand** + `persist` |
| Règles | **chess.js** (déjà installé) |
| Bot | **stockfish@18**, build `lite-single` (7,3 Mo), dans un **Web Worker** |
| Déploiement | **Vercel**, statique |

### Le bot ne tourne pas sur le serveur

Stockfish s'exécute **dans le navigateur de Paul**, sur son processeur. Vercel ne sert que
le `.wasm` comme fichier statique depuis son CDN : aucune fonction serverless, aucun cold
start, aucun coût de calcul, aucune limite de durée.

Charge mesurée, réglages et parades : voir `paul-chess-engine`.

**Non mesurable d'ici** : le téléchargement des 7,3 Mo sur une connexion mobile guyanaise
(3 s à 20 Mbps, 12 s à 5 Mbps). Parade déjà prévue — l'écran d'intro.

À vérifier au déploiement : que Vite copie le `.wasm` **et** son loader JS dans `public/`,
et que Vercel serve le `.wasm` en `application/wasm`.

### Règle d'architecture, valable pour tous les lots

**Aucune logique de jeu ne vit dans un composant de rendu.** `chess.js` + le store zustand
possèdent l'état ; tout composant n'en est qu'un consommateur.

Ce n'est pas de la propreté gratuite : le mini-échiquier 2D SVG sert de **mode de secours
sans WebGL**, et cette règle empêche aussi l'agent du lot B d'empiéter sur le lot A.

---

## Ce qui existe déjà sur le disque

| Chemin | Contenu |
|---|---|
| `scripts/fetch-games.mjs` | Récupération API Chess.com (série, `User-Agent`, retry 429, **pseudo en minuscules obligatoire**) |
| `scripts/analyze.mjs` | Style et répertoire → `data/analysis.md` |
| `scripts/engine-profile.mjs` | Analyse Stockfish → `data/engine-moves.json`. **Contient la classe `Engine` à porter dans le worker.** |
| `scripts/engine-report.mjs` | Profil d'erreurs → `data/profil-erreurs.md` |
| `scripts/script-opening.mjs` | Cherche la ligne d'ouverture la plus prévisible |
| `data/raw/*.json` | 15 archives mensuelles brutes |
| `data/games.json` | 534 parties à plat |
| `data/profile-ffe.json` | Fiche FFE + déclarations datées |
| `data/DONNEES-A-SAVOIR.md` | Avertissement sur le sabotage du compte |
| `tools/stockfish/` | Stockfish 18, binaire Windows, pour l'analyse hors-ligne |
| `.claude/skills/paul-chess-*` | Les trois skills du projet |

**Tous les scripts sont rejouables.** Les relancer la veille de l'anniversaire récupérera
ses parties récentes — il joue en rafales, 114 parties en août.

---

## Mode de développement : délégation à des sous-agents

**Les interfaces sont figées avant tout lancement.** Un agent qui invente son propre
contrat produit du code que le suivant devra jeter.

### Étape 0 — non délégable

```
src/types.ts     Coup, Enigme, TypeEnigme, EtatJeu, PoseCamera
src/store.ts     le store zustand : source unique de vérité
src/theme.ts     palette, typographie, paramètres de formes
```

Tant que ces trois fichiers ne sont pas figés, six agents en parallèle produisent six
versions incompatibles du même contrat.

### Les lots

Une fois l'étape 0 figée, ces lots ne se touchent pas.

| Lot | Périmètre | Skills |
|---|---|---|
| **A — Moteur** | `src/engine/` : worker, livre d'ouverture, faute, abandon, garde-fou | **`paul-chess-engine`** |
| **B — Plateau 3D** | `src/board/` : plateau, pièces, caméras, toucher → case | **`paul-chess-board3d`** + `r3f-interaction`, `threejs-materials`, `threejs-animation` |
| **C — Énigmes** | `src/riddles/` : les 6 types, validation, indices, bande sous le plateau | `vercel:shadcn` |
| **D — Juice** | couche 2D de célébration, boutons, confettis, vibration | **`paul-chess-juice`** |
| **E — Plateau 2D** | mini-échiquier SVG : `square-puzzle` **et** mode de secours sans WebGL | — |
| **F — Révélation** | `src/reveal/` : séquence, tableau d'images | — |

**A et B sont les deux plus longs et sont indépendants : à lancer en premier, ensemble.**

### Skills locaux — pourquoi ils existent

Les concepts valables des skills amont ont été **réécrits pour nos contraintes** plutôt que
chargés avec une mise en garde agrafée dessus. Une note « ignore le code » ne pèse rien face
à 165 lignes d'exemples Godot concrets.

`paul-chess-engine` n'a aucun équivalent amont : c'est du savoir purement projet.
`paul-chess-board3d` pose `OrbitControls` interdit **comme règle**, pas comme note de bas de
page. `paul-chess-juice` remplace `game-feel` intégralement.

Ils sont **versionnés avec le dépôt** : tout agent, dans toute session future, les récupère.

### Skills amont à installer

```bash
npx skills add antfu/skills@vite -g -y                                    # 33,8K, audité
npx skills add enzed/r3f-skills@r3f-interaction -g -y                      #  2,5K, audité
npx skills add cloudai-x/threejs-skills@threejs-materials -g -y           #  8,4K, audité
npx skills add cloudai-x/threejs-skills@threejs-animation -g -y           # 13,2K
```

Déjà dans la session, **ne pas dupliquer** : `vercel:shadcn`,
`vercel:react-best-practices`, `vercel:deploy`, `vercel:vercel-cli`, `vercel:env-vars`.

Lecture directe d'un skill, sans `npx` ni l'API skills.sh :
`raw.githubusercontent.com/{owner}/{repo}/main/skills/{skill}/SKILL.md`.

### ⚠️ Consigne pour le lot B

`r3f-interaction` et les skills three.js consacrent l'essentiel de leur section
« contrôles » à `OrbitControls`, `FlyControls`, `FirstPersonControls`, `TrackballControls`,
`PointerLockControls`. Le projet a **deux poses de caméra fixes**. Un agent qui lit ces
sections ajoutera `OrbitControls` par réflexe, et Paul se retrouvera à faire pivoter
l'échiquier au doigt au lieu de jouer son coup. N'en prendre que les pointer events et le
matériau toon.

### Skills écartés — vérifié en lisant, pas supposé

| Écarté | Raison |
|---|---|
| `cloudai-x/…@threejs-interaction` | **redondant** avec `r3f-interaction`, natif r3f et plus complet. Charger les deux dilue. |
| `dylantarre/animation-principles@mobile-touch` | dépôt en 12 taxonomies (`01-by-domain`, `02-by-thinking-style`, `03-by-role-persona`…) — **ferme à contenu**. Les 2,2K installs viennent du ratissage. |
| `gamedev-skills@game-ui-ux` | ancrages et scaling Godot/Unity. Tailwind + portrait verrouillé couvrent le sujet. |
| `gamedev-skills@input-systems` | remappage de touches, zones mortes de manette. Sans objet. |
| `gamedev-skills@game-feel` | **excellent sur le fond, tout le code en Godot 4.7 et Unity 6.3.** Réécrit dans `paul-chess-juice`. |
| `vercel-labs/json-render@zustand` | **installé puis écarté après lecture de sa description** : c'est un *adaptateur pour l'interface StateStore de json-render*, pas du zustand générique. Inutile ici et trompeur pour un agent. Deuxième fois que les installs ne disent rien de la pertinence. |
| tout skill « web worker » | **piège** : tous les résultats sont des **Cloudflare Workers**, fonctions serverless en périphérie. Aucun rapport avec les Web Workers du navigateur. Instructions fausses sur le seul composant critique. |
| tout skill « échecs » | aucun utilisable (meilleur : 47 installs, et il s'agit d'un agent qui *joue*). |
| tout skill « wasm » | traitent de la *compilation* vers wasm. On consomme un wasm déjà compilé. |
| tout skill « particules » | Phaser, Godot, PixiJS. Nos confettis sont ~50 lignes de DOM/canvas 2D. |

---

## Vérification

1. **Livre d'ouverture** : `1.e4 2.Nf3 3.d4 4.Nxd4` → le worker n'est **interrogé** qu'au
   5ᵉ coup (mais **démarré** dès le montage de l'app). `3.Nc3` → la ligne alternative part.
   Un coup hors des deux lignes → jeu libre, aucun plantage.
2. **Faute scriptée** : sur 20 parties simulées, elle tombe dans
   `REGLES_BOT.fauteEntreCoups` avec une évaluation dans `REGLES_BOT.fauteCible` — un coup
   plausible qui perd une pièce, pas le pire coup légal.
3. **Abandon** : se déclenche **après le 15ᵉ coup du joueur**, jamais avant, et **jamais**
   dans une position égale ou gagnante pour le bot. Vérifier qu'il ne part **pas** juste
   après la faute scriptée, et que les 15 énigmes ont toutes été vues.
4. **Garde-fou** : donner volontairement une pièce au 12ᵉ coup → le bot ne dépasse jamais
   `REGLES_BOT.plafondGardeFou`, la partie reste gagnée.
5. **Test mobile réel** (pas le devtools) : iPhone + Android, portrait. Mesurer le
   chargement des 7,3 Mo sur réseau mobile et le temps de réflexion par coup. **Vérifier que
   la 3D ne gèle jamais pendant que le bot réfléchit.**
6. **Chemin du pire** : échouer 6× sur chaque énigme → le bouton passer apparaît, le jeu
   reste terminable de bout en bout.
7. **Reprise** : recharger à mi-parcours → progression **et position de la partie**
   conservées.
8. **Toucher précis** : viser les 64 cases en vue de dessus, sur un petit écran. Vérifier
   qu'aucun tremblement d'écran ne désaligne les cibles.
9. **Accessibilité** : `prefers-reduced-motion` respecté, réglage « réduire tremblement et
   flashs » accessible **avant** la première énigme.
10. **Partie complète**, du QR code à la révélation, sur téléphone, sur le réseau du soir J.
11. **Test humain** : un groupe s'organise pour juger les énigmes. Critère à leur donner —
    regarder **où le joueur bloque**, pas s'il aime. L'auteur d'une énigme ne peut pas juger
    sa difficulté, il connaît la réponse.
12. **Lecture à voix haute** des 15 énoncés par quelqu'un d'autre. Si un énoncé ne passe pas
    à l'oral, il ne passera pas le soir J.

---

## Plan B — par mode de panne

Une URL qui ne charge pas devant huit personnes, avec le cadeau derrière, est le pire
scénario de la soirée et il n'a rien à voir avec la qualité du code.

| Panne | Parade |
|---|---|
| Réseau absent ou trop lent | **les 15 énigmes imprimées au verso de la carte QR**, réponses sur une feuille séparée |
| Une énigme le bloque | bouton « passer » après 6 échecs + **backdoor**, testée **avant** le soir J |
| Le bot part en vrille | garde-fou + backdoor |
| Batterie du téléphone | **un chargeur à portée** — 3D + Stockfish, ça chauffe et ça pompe |
| WebGL indisponible, navigateur qui plante | **mode de secours 2D** — le mini-échiquier SVG du lot E est déjà au programme pour `square-puzzle`, il devient le rendu de repli. Presque gratuit **si** la règle d'architecture est respectée. |
| Le téléphone lâche complètement | **Frédéric garde le jeu ouvert et fonctionnel sur le sien toute la soirée** — coût nul, parade la plus efficace de la liste |

L'image de révélation doit aussi être disponible **hors ligne** sur le téléphone de Frédéric.

---

## Points ouverts — tous chez Frédéric

- **Énigmes personnelles** — le groupe s'organise. **Ce n'est pas un bloquant dur** : les
  énigmes d'échecs se génèrent depuis les données et comblent les slots manquants. Le jeu
  tient avec une seule énigme personnelle (le slot 15). Plus il y en a, mieux c'est —
  chaque nouvelle prend le meilleur slot restant, en descendant depuis 14.
- **Date de l'anniversaire** — décide de ce qu'on garde du juice et si le glisser-déposer
  entre au programme.
- **Screenshots de l'échiquier commandé** → `src/theme.ts`
- **Image de révélation** — reçu recadré, puis photo du plateau
- Optionnel : lui demander « ta plus belle partie » par WhatsApp. Ses parties de tournoi OTB
  ne sont pas sur Chess.com.

### Déjà tranché — ne pas rouvrir

Mécanique hybride (4 coups scriptés + faute + abandon après le 15ᵉ coup) · 15 coups /
15 énigmes · téléphone entouré de monde · portrait verrouillé · pas de modale plein écran ·
6 types d'énigmes · grille des 15 slots · saisie aux conventions Chess.com en vue de dessus ·
narrateur textuel neutre · alternance échecs/personnel · **aucune condition de défaite** ·
QR code sur carte physique · vibration plutôt que son · direction artistique jeu mobile
cartoon · primitives cel-shadées, pas de `.glb` · juice en couche 2D hors de la scène 3D ·
célébration croissante.
