---
name: paul-chess-engine
description: >
  Contrat du moteur d'échecs du projet paul-chess : pilotage UCI de Stockfish WASM dans un
  Web Worker, livre d'ouverture scripté, faute volontaire calibrée, garde-fou anti-retournement,
  et règle d'abandon conditionnée au contenu. Charger AVANT toute écriture dans src/engine/,
  ou dès qu'il est question de Stockfish, chess.js, du bot, du livre d'ouverture, de
  l'abandon, du nombre de coups ou de la fin de la partie.
---

# Moteur d'échecs — paul-chess

Le jeu fait jouer **une vraie partie d'échecs** à un joueur réel (1930 Elo rapide FFE)
contre Stockfish, mais **l'issue est garantie** : il gagne, en 15 coups, sans jamais
pouvoir perdre. Ce document contient les décisions qui rendent ça possible. Elles sont
issues de mesures sur ses 534 parties réelles — **ne pas les réinventer, ne pas les
« améliorer » sans données.**

## ⚠️ Convention coup / demi-coup — source d'erreur n°1

| Terme | Définition | Exemple |
|---|---|---|
| **demi-coup** (`ply`) | un coup d'un seul camp | `1.e4` = 1 demi-coup |
| **coup** (`coup`) | son coup **+** la réponse du bot | `1.e4 e5` = 1 coup |

**Le jeu fait 15 coups = 30 demi-coups.** Une énigme par **coup du joueur**.

```js
const coup = Math.floor(ply / 2) + 1   // ply 0 -> coup 1
```

**Le bug à ne pas écrire :** plafonner à 15 *demi-coups*. La partie s'arrêterait au 8ᵉ coup
du joueur, avec 8 énigmes vues sur 15.

## Le binaire : `lite-single`, pas autre chose

```
bin/stockfish-18.wasm              113 Mo   INTERDIT (inutilisable sur mobile)
bin/stockfish-18-lite-single.wasm  7,3 Mo   celui-ci
```

`lite-single` est **mono-thread** : aucun besoin de `SharedArrayBuffer`, donc aucun en-tête
COOP/COEP à configurer. C'est précisément le multi-thread qui casse Stockfish sur Safari
mobile. Ne pas « upgrader » vers le build complet ou multi-thread.

Réglages obligatoires, mesurés pour le mobile :

```
setoption name Threads value 1
setoption name Hash value 16        // 16, pas 512 : 512 est réservé aux scripts d'analyse hors-ligne
go depth 10                          // 10-12 suffit ; au-delà on paie sans rien gagner
```

Mesure de référence sur desktop : à `Threads 1`, `depth 10`, `depth 16` et `depth 20`
prennent le même temps — le coût est le démarrage, pas la recherche. Sur mobile, compter
**1 à 3 s de démarrage une seule fois**, puis **200-400 ms par coup**.

**Le worker démarre au montage de l'app**, pendant l'écran d'intro, pour absorber le
téléchargement des 7,3 Mo. Il n'est **interrogé** qu'à partir du 5ᵉ coup. Démarrage
précoce, première interrogation tardive — ne pas confondre les deux.

## Pilotage UCI — réutiliser, ne pas réécrire

La classe `Engine` de `scripts/engine-profile.mjs` est **déjà écrite et éprouvée sur 4827
positions**. La porter vers le worker, ne pas repartir de zéro. Son contrat :

```js
send(cmd)              // écrit une ligne UCI
until(test)            // attend une ligne satisfaisant test(), en accumulant les 'info'
init()                 // uci -> uciok, setoption, isready -> readyok
evaluate(fen)          // -> { cp, best }, score du point de vue du camp qui doit jouer
```

Deux détails qui font perdre une heure si on les rate :

1. **Le buffer stdout doit être découpé sur `\n` à la main.** Une seule lecture peut
   contenir plusieurs lignes, ou une ligne coupée en deux.
2. **Un mat doit être borné.** `score mate N` converti brut donne des milliers de
   centipions et fait exploser tous les seuils. Borner à ±1500 :

```js
const CLAMP = 1500
cp = m[1] === 'mate' ? (Number(m[2]) > 0 ? CLAMP : -CLAMP) : Number(m[2])
cp = Math.max(-CLAMP, Math.min(CLAMP, cp))
```

Le score est **toujours du point de vue du camp qui doit jouer**. Pour la perte d'un coup :
`perte = eval(avant) - (-eval(après))`.

## Livre d'ouverture — 4 coups, mesurés

Le bot joue les **noirs**, donc c'est lui qui choisit. Il conduit le joueur dans son
répertoire.

**Les coups sont dans `LIVRE_OUVERTURE` et `LIVRE_VARIANTE_NC3`, dans `src/types.ts`.**
Ce qui suit est la mesure qui les justifie, sur 258 de ses parties avec les blancs :

```
coup 1  e4    -> 99 %   (n=258)
coup 2  Nf3   -> 100 %  (n=131)
coup 3  d4    -> 92 %   (n=86)
coup 4  Nxd4  -> 100 %  (n=61)
```

**Fiabilité cumulée : 91 %** (plancher statistique 78 %).

**Ne pas scripter au-delà du 4ᵉ coup.** Aux coups 5 et 6 la fiabilité mesurée est de 100 %
mais sur 32 puis 11 parties seulement : le plancher statistique tombe à ~54 %. Les données
ne portent pas.

**Une seule alternative à prévoir** : au 3ᵉ coup, 5 % du temps il joue `Nc3` au lieu de
`d4` (partie des Quatre Cavaliers). Écrire cette branche. Ces deux lignes couvrent 97 %.

Hors des deux lignes : le bot passe en jeu libre sans planter, et on accepte une partie
plus longue.

## Les trois règles qui garantissent l'issue

Elles sont **interdépendantes**. Modifier un seuil sans les relire produit les bugs décrits
plus bas.

### ⚠️ Les valeurs vivent dans le code, pas ici

**Toutes les valeurs numériques sont dans `REGLES_BOT`, dans `src/types.ts`.** Les lire là,
ne jamais les recopier ailleurs — un seuil écrit en prose dans un document et en constante
dans le code finit par diverger. C'est ce qui a produit trois bugs successifs sur la règle
d'abandon en une seule session.

Ce document explique **pourquoi** ces valeurs sont ce qu'elles sont. Il ne les répète pas.

```
1. FAUTE       coup 6-8       : le bot joue volontairement un coup perdant
2. GARDE-FOU   toujours       : le bot ne remonte jamais au-dessus d'un plafond
3. ABANDON     verrou temporel : après le 15e coup DU JOUEUR, jamais avant
```

### 1. La faute doit être plausible

Demander `MultiPV` à Stockfish et choisir le coup dont l'évaluation tombe dans la fenêtre
`REGLES_BOT.fauteCible`.

- **Bien** : un coup jouable qui perd une pièce. Un joueur à 1930 le punit et se sent fort.
- **Mal** : le pire coup légal. `Qh5??` gratuit se voit immédiatement et casse l'illusion.

### 2. Le garde-fou n'est pas optionnel

Le joueur peut mal jouer. S'il donne une pièce au 12ᵉ coup, un bot bridé mais compétent
retourne la partie. Le garde-fou l'interdit structurellement : si aucun coup ne respecte
`REGLES_BOT.plafondGardeFou`, jouer le moins bon coup légal disponible.

### 3. L'abandon est conditionné au TEMPS, pas à l'évaluation

**Le verrou est temporel : après le 15ᵉ coup du joueur.** L'évaluation n'est qu'une
condition de crédibilité secondaire, et le garde-fou garantit qu'elle sera remplie.

`useJeu.botPeutAbandonner()` (dans `src/store.ts`) implémente déjà cette condition —
l'appeler, ne pas la réécrire.

⚠️ **Deux pièges déjà rencontrés sur cette règle. Ne pas les réintroduire.**

1. **Abandon à −300 seul.** La faute scriptée met justement le bot entre −300 et −500 : il
   abandonnait immédiatement après sa propre faute. Partie finie au 8ᵉ coup, 8 énigmes vues
   sur 15.
2. **Abandon à −900 « ET énigmes vues >= 13 ».** Le `>= 13` autorise l'abandon dès la 13ᵉ
   énigme, ce qui coupe les énigmes 14 et **15 — la plus forte, celle du climax**.

La cause racine des deux : conditionner la fin de partie à une **évaluation** alors qu'elle
doit l'être au **temps**. Toute variante de la forme « seuil d'évaluation + marge » finira
par couper du contenu. Le nombre de coups est la seule grandeur qu'on contrôle.

**Ne jamais faire abandonner le bot dans une position égale ou gagnante pour lui.** Le
joueur est capitaine de la sélection de Guyane ; il le verrait instantanément, au moment
exact du climax.

## Ce que le réglage `UCI_Elo` ne fait pas

`UCI_LimitStrength true` + `UCI_Elo` ont un **plancher à 1320**. Le joueur est à 1930, donc
le bot au minimum reste un adversaire réel.

**Ce n'est pas grave, et surtout : baisser l'Elo ne raccourcit pas la partie.** Mesuré sur
ses parties réelles — quand il affronte un adversaire 100 à 300 points plus faible, il
gagne en ≤15 coups dans **9 %** des cas ; face à un adversaire plus fort, dans **30 %**. La
médiane est de **26 coups dans tous les cas**. Un bot faible joue passivement, il ne se
suicide pas : il **allonge** la partie.

L'issue vient de la faute scriptée et de la règle d'abandon. `UCI_Elo` ne sert qu'au
confort de jeu.

## Aucune condition de défaite. Jamais.

Pas de limite de coups, pas de chronomètre, pas de game over. Le cadeau est derrière le
jeu, devant huit personnes.

Et une raison moins évidente : **une limite annoncée puis non appliquée est pire qu'aucune
limite.** Sa victoire médiane fait 26 coups ; il dépasserait toute limite serrée. S'il
dépasse et que rien ne se passe, il comprend que rien n'était réel.

Autorisé en revanche : des **objectifs** ratables sans conséquence — « mate en 15 coups ou
moins » donne une mention à la révélation, rien de plus.

## Règle d'architecture

**`chess.js` + le store zustand possèdent l'état. Aucune logique de jeu ne vit dans un
composant de rendu.** Le moteur expose des fonctions pures et des messages ; il ne connaît
ni React, ni Three.js, ni l'UI.

## Vérifications à faire passer

1. Jouer `1.e4 2.Nf3 3.d4 4.Nxd4` → le worker n'est **interrogé** qu'au 5ᵉ coup.
2. Jouer `3.Nc3` → la ligne alternative part.
3. Sortir des deux lignes → jeu libre, aucun plantage.
4. Sur 20 parties simulées → la faute tombe dans `REGLES_BOT.fauteEntreCoups`, avec une
   évaluation dans `REGLES_BOT.fauteCible`. Vérifier qu'elle n'est pas le pire coup légal.
5. L'abandon ne se déclenche **pas** juste après la faute scriptée, **ni avant que le 15ᵉ
   coup du joueur soit joué** — les 15 énigmes doivent toutes avoir été vues.
6. Donner volontairement une pièce au 12ᵉ coup → le bot ne dépasse jamais
   `REGLES_BOT.plafondGardeFou`, la partie reste gagnée.
