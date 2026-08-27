---
name: paul-chess-board3d
description: >
  Échiquier 3D du projet paul-chess : rendu cel-shading cartoon avec react-three-fiber,
  deux poses de caméra fixes, saisie des coups aux conventions Chess.com mobile, pièces en
  primitives paramétriques. Charger AVANT toute écriture dans src/board/, ou dès qu'il est
  question de Three.js, react-three-fiber, caméra, pièces, cases, toucher, raycasting ou
  apparence du plateau.
---

# Échiquier 3D — paul-chess

Un échiquier 3D **mobile-first**, en **portrait verrouillé**, dans un registre **jeu mobile
cartoon** (Brawl Stars / Clash of Clans) sur les couleurs des échecs et un thème bois.

Le joueur est un joueur de club à 1930 Elo : la saisie doit être **précise et familière**,
pas une démonstration technique.

## ⛔ `OrbitControls` est interdit — et tout ce qui lui ressemble

`OrbitControls`, `MapControls`, `FlyControls`, `FirstPersonControls`, `TrackballControls`,
`PointerLockControls` : **aucun**.

Les skills three.js et r3f en amont consacrent l'essentiel de leur section « contrôles » à
ces objets. C'est le piège de ce lot : un agent les ajoute par réflexe, et le joueur se
retrouve à faire pivoter l'échiquier au doigt au lieu de jouer son coup.

**Le projet a deux poses de caméra fixes, et aucun contrôle libre.** De ces skills, ne
prendre que les pointer events et le matériau toon.

## Les deux poses de caméra

Une **seule `<Canvas>`**. Deux poses, avec transition animée entre les deux.

| Pose | Type | Rôle |
|---|---|---|
| **`topDown`** | **orthographique** | **pose par défaut : c'est là qu'il joue.** Le plateau se projette comme un échiquier 2D, sans déformation de perspective. |
| `iso` | perspective | mise en scène : animation des coups, célébrations |

`topDown` en **orthographique** n'est pas un détail esthétique : c'est ce qui rend la
saisie précise. En perspective isométrique, viser une case au doigt est approximatif et
frustrant.

Cycle après chaque bonne réponse : bande d'énigme repliée → caméra vers `iso` → le coup
s'anime → le bot répond → retour en `topDown`.

## Saisie : r3f fait le raycasting, ne pas l'écrire

**Ne pas instancier un `Raycaster`, ne pas convertir les coordonnées écran en NDC à la
main.** r3f expose les pointer events directement sur les meshes.

```tsx
<mesh onPointerDown={(e) => {
  e.stopPropagation()
  const { x, z } = e.point        // point d'intersection, en coordonnées monde
  const file = Math.floor((x + 4) )   // -> 0..7, selon l'origine du plateau
  const rank = Math.floor((z + 4) )
}} />
```

- `e.point` — point d'intersection en coordonnées monde. C'est tout ce qu'il faut.
- `e.stopPropagation()` — sinon l'événement remonte aux meshes derrière.
- `onPointerMissed` — un toucher qui rate tout : sert à **désélectionner**.

Un seul plan invisible à l'échelle du plateau suffit à capter les touchers ; inutile de
rendre chaque case cliquable.

## Conventions de saisie — celles de Chess.com mobile

Le joueur les a dans les doigts. S'en écarter crée une friction gratuite.

| Geste | Comportement |
|---|---|
| Toucher une de ses pièces | sélection + **les cases d'arrivée légales s'affichent en pastilles** |
| Toucher une case légale | le coup se joue |
| Re-toucher la pièce sélectionnée | désélection |
| Toucher une autre de ses pièces | la sélection bascule |
| Toucher une case illégale | **rien** — pas de message d'erreur |
| Promotion | petit sélecteur de pièce |

Toujours visible : **le dernier coup joué surligné**, et **l'échec surligné** sur le roi.

Le **glisser-déposer** est une addition optionnelle, pas la base. Chess.com le propose en
plus du toucher-toucher, mais en 3D il demande un suivi de rayon continu. Seulement s'il
reste du temps.

## Les pièces : primitives paramétriques, c'est le style final

Cylindres, sphères, cônes. **Ce n'est pas un provisoire en attendant des modèles.** Une
pièce d'échecs cartoon, ce sont des formes grasses et simples avec un contour épais.

**Pas de `.glb`, pas de Draco, pas de chargement de modèle.** Ça sort du programme.

### Cel-shading : `MeshToonMaterial` + gradient à paliers

```js
// Rampe à 3 paliers : le cœur du rendu cartoon. NearestFilter est obligatoire —
// sans lui le dégradé s'interpole et on perd les aplats.
const colors = new Uint8Array([0, 128, 255])
const gradientMap = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat)
gradientMap.minFilter = THREE.NearestFilter
gradientMap.magFilter = THREE.NearestFilter
gradientMap.needsUpdate = true
```

```tsx
<meshToonMaterial color={couleur} gradientMap={gradientMap} />
```

### Contours

`<Outlines>` de `@react-three/drei` — coque inversée, quelques lignes, aucun
post-traitement. **Ne pas monter de passe de post-processing** : c'est cher sur mobile et
inutile ici.

## Animation des pièces

`@react-spring/three`. Deux règles venues du game feel, valables ici :

- **Courbes à dépassement (`back`), jamais linéaires.** Une interpolation linéaire donne un
  rendu mécanique, mort.
- **L'exagération est transitoire.** Écrasement-étirement à volume conservé — étirer un axe,
  écraser l'autre, puis revenir avec dépassement. Ce qui ne revient pas au repos cesse
  d'être lu comme un retour d'information.

Mouvements : arc en cloche sur Y pour les cavaliers, glissé pour le reste, disparition en
fondu sur capture.

## Réglages mobile obligatoires

```tsx
<Canvas dpr={[1, 2]} frameloop="demand" />
```

- **`frameloop="demand"`** — la scène ne se redessine que quand quelque chose bouge. Une
  boucle continue sur un plateau immobile vide la batterie.
- **Pas d'ombres temps réel.** Un contact shadow de drei suffit.
- **Portrait verrouillé**, plateau carré centré, bande d'énigme sous le plateau.

### ⚠️ Le tremblement d'écran ne se fait PAS ici

Deux raisons de ne jamais secouer la caméra 3D :

1. Ça exige une boucle de rendu continue, ce qui annule `frameloop="demand"`.
2. **Ça désaligne les cibles de toucher pendant la secousse** — dans un jeu où l'on
   désigne des cases, c'est un bug d'interaction, pas un effet.

Le tremblement se fait sur un **conteneur DOM par transformation CSS**, au-dessus du
canvas. Voir `paul-chess-juice`.

## Apparence — un seul fichier

⚠️ **Toutes les valeurs d'apparence sont dans `src/theme.ts`** : couleurs, polices,
géométrie des pièces, poses de caméra, configurations de ressort, durées. Les lire là, ne
jamais les recopier ici ni les coder en dur dans un composant. Une couleur écrite à deux
endroits finit par diverger.

Ce document dit **comment** rendre ; `theme.ts` dit **avec quoi**.

L'échiquier physique offert n'est pas encore commandé. Quand ses photos arriveront, elles
serviront à régler **dans `theme.ts` uniquement** : la teinte du bois, la silhouette des
pièces (hautes et fines ? trapues ?), un détail signature s'il y en a un. **Ne pas utiliser
la photo comme texture** — un bois photographique jure dans un rendu cel-shading. La vraie
photo est montrée à la révélation, pas pendant le jeu.

## Règle d'architecture

**Aucune logique de jeu dans un composant 3D.** `chess.js` + le store zustand possèdent
l'état ; le rendu n'en est qu'un consommateur.

Ce n'est pas de la propreté gratuite : le mini-échiquier 2D en SVG sert de **mode de
secours sans WebGL**. Le rendu doit être remplaçable sans toucher une ligne de logique.
