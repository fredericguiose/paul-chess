---
name: paul-chess-juice
description: >
  Game feel et célébrations du projet paul-chess : retour d'information en couches,
  tremblement par trauma décroissant, écrasement-étirement, courbes à dépassement, escalade
  d'intensité et vibration haptique — transposés en @react-spring, CSS et DOM. Charger AVANT
  d'écrire un effet de célébration, un bouton, des confettis, un tremblement, une vibration
  ou une animation d'interface.
---

# Game feel — paul-chess

Registre visé : **jeu mobile cartoon**, Brawl Stars / Clash of Clans. Boutons épais, effets
explosifs, confettis.

Ce n'est pas une préférence esthétique. Le jeu se joue **sur un téléphone avec huit
personnes autour** : le juice est le **mécanisme de célébration collective**, ce qui fait
réagir la salle à voix haute quand le joueur trouve. Un design sobre laisse le groupe
silencieux.

> Ce document transpose le skill `game-feel` (gamedev-skills), dont les principes sont
> excellents mais dont **tous les exemples de code sont en Godot et Unity**. Ignorer ces
> API ; ce qui suit est la version pour notre stack.

## Le principe central : en couches et exagéré

Un retour satisfaisant, c'est **5 à 8 réactions minuscules qui partent ensemble en ~100 ms**
— un son, une gerbe de particules, un bref arrêt, un flash, un tremblement, un chiffre qui
saute. Chacune est bon marché ; empilées, elles se lisent comme de l'impact.

Deux règles qui empêchent que ça devienne du bruit :

1. **Exagérer brièvement, puis revenir au repos.** Le juice est transitoire, jamais un
   nouvel état de repos. Ce qui ne revient pas cesse d'être lu comme un retour
   d'information.
2. **Proportionner à l'importance de l'événement.** Un pas n'est pas la mort d'un boss.

## Escalade

Quinze explosions de confettis identiques fatiguent dès la quatrième. L'intensité **monte**.

⚠️ **Les valeurs sont dans `src/types.ts`** : `palierPourCoup(coup)` donne le palier,
`TRAUMA_PAR_PALIER` donne le trauma associé. Les lire là, ne pas les recopier.
`src/theme.ts` porte les durées et les configurations de ressort.

Ce que chaque palier déclenche, en revanche, est une décision de conception :

| Palier | Célébration |
|---|---|
| `petit` | étoiles simples, vibration courte |
| `moyen` | gerbe plus large, son optionnel |
| `grand` | tremblement + confettis pleine page |
| `finale` | tout d'un coup, enchaîné sur la révélation |

Un seul point d'entrée par événement, pour que l'ensemble reste cohérent :

```ts
feedback(palierPourCoup(coup))
```

## Tremblement par trauma décroissant

Le bon modèle : on stocke un **trauma de 0 à 1**, et l'amplitude vaut **son carré**. Les
petits événements bougent à peine, les gros frappent.

```ts
// L'amplitude est quadratique : douce en bas, franche en haut.
const amplitude = trauma * trauma

// Les événements AJOUTENT du trauma, ils ne le réinitialisent pas.
addTrauma(0.4)   // trauma = clamp(trauma + 0.4, 0, 1)

// Décroissance : ~1,2 de trauma perdu par seconde.
```

Deux erreurs à ne pas commettre :

- **Un décalage aléatoire à chaque frame bourdonne comme de la neige.** Piloter le
  déplacement par des sinusoïdes de fréquences différentes (× 1,7 et × 2,3, par exemple),
  pas par `Math.random()` à chaque image.
- **Ne jamais secouer ce qui porte la simulation.** Ici : ne pas secouer la caméra 3D.

### ⚠️ Où le tremblement s'applique

**Sur un conteneur DOM, par transformation CSS, au-dessus du canvas.** Jamais sur la
caméra 3D. Deux raisons :

1. Secouer la caméra exige une boucle de rendu continue, ce qui annule le
   `frameloop="demand"` du plateau et vide la batterie.
2. **Ça désaligne les cibles de toucher pendant la secousse.** Dans un jeu où l'on désigne
   des cases du doigt, c'est un bug d'interaction, pas un effet.

Même règle pour les **confettis et toutes les particules** : ils vivent dans une **couche 2D
par-dessus** (DOM ou canvas 2D), hors de la scène 3D. Moins cher en GPU, ne réveille pas la
boucle 3D, plus fluide sur mobile.

## Courbes : dépassement pour le « pop », jamais linéaire

Le skill amont le dit crûment : **linéaire = mécanique, mort.**

- **Dépassement (`back`, `elastic`)** → pour le « pop » : une apparition, une bonne réponse.
- **Sortie douce (`ease-out`)** → pour le « repos » : une pièce qui se pose.

```ts
// @react-spring — dépassement sur l'apparition
useSpring({ from: { scale: 0.6 }, to: { scale: 1 }, config: { tension: 300, friction: 12 } })
```

## Écrasement-étirement à volume conservé

Étirer un axe, écraser l'autre, puis revenir avec dépassement.

```ts
// Instantané sur l'événement, puis retour animé
setScale([1.3, 0.7, 1.3])
// -> spring vers [1, 1, 1] avec une config à dépassement
```

## Boutons : l'enfoncement est ce qui fait la sensation

Biseau épais, dégradé, contour sombre, ombre portée — et surtout une **animation
d'enfoncement au toucher** (le bouton descend, l'ombre se réduit). C'est ce détail qui donne
la sensation « jeu mobile », plus que la couleur.

**Cet effet ne se sacrifie jamais**, même sous contrainte de temps.

## Vibration, pas le son

Une fête est bruyante : les sons seront inaudibles. **La vibration passe le bruit.**

```ts
navigator.vibrate?.(20)        // coup joué
navigator.vibrate?.([20, 40, 20])  // bonne réponse
```

Le son reste en option, **coupé par défaut**.

## Arrêt bref sur les moments forts

L'équivalent du hit-stop : sur une prise ou sur la faute du bot, **figer brièvement
l'animation** (~80 ms) avant de reprendre. Ça vend l'impact.

À déclencher **une fois par événement**, jamais en continu, et **sans jamais bloquer la
saisie** — le joueur doit pouvoir toucher pendant.

## Pièges, transposés du skill amont

- **Aléatoire par frame** → bourdonnement. Sinusoïdes + trauma décroissant.
- **Exagération permanente** (une échelle qui ne revient pas, un tremblement qui ne décroît
  pas) → devient la nouvelle normale et cesse d'être un retour d'information.
- **Trop de juice sur les actions courantes** → nausée, et ça masque les vrais moments.
- **Un retour qui bloque la saisie** → nuit à la réactivité. Court, et l'entrée passe à
  travers.
- **Tout en linéaire** → robotique.

## Accessibilité — non négociable ici

Le skill amont recommande une option « réduire le tremblement / réduire les flashs ».
**Dans notre contexte c'est plus qu'une bonne pratique** : le jeu se joue devant huit
personnes dont on ne connaît pas la sensibilité aux flashs, et l'écran est à 30 cm des yeux
du joueur.

Prévoir un réglage accessible **avant** la première énigme, et respecter
`prefers-reduced-motion` : dans ce cas, garder les célébrations mais **sans tremblement ni
flash** — étoiles et confettis suffisent.

## Ordre de sacrifice si le temps manque

Du moins grave au plus grave à perdre :

```
tremblement d'écran
  -> écrasement-étirement
    -> gerbes intermédiaires (énigmes 6-14)
      -> JAMAIS : la célébration finale, ni l'enfoncement des boutons
```

Ces deux dernières portent toute la sensation du jeu.
