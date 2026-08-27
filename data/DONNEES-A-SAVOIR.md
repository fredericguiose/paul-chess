# Avertissement sur la qualite des donnees Chess.com

## Le compte a ete sabote volontairement

Paul-Erwan (27/08/2026) : « Au debut j'ai fait expres de perdre pour derush »,
« j'ai derush le compte a 100 elo pour rien au debut », « je voulais utiliser le compte
pour apprendre a jouer a quelqu'un ». C'est un **compte pedagogique**.

Preuve dans les donnees, journee du 24/04/2025 : son classement passe de **564 a 100**
en quelques heures. Exemples de parties abandonnees apres un seul coup :

```
1. e4 e5   0-1     (il abandonne)
1. d4 b6   1-0     (il abandonne)
1. e3 e5 2. f3  0-1
```

Ouvertures jouees pendant cette phase : 1.h4, 2.Rh3, 1.Na3 - du sabotage assume.
Il refait la meme chose le 21/07/2025.

## Consequence : deux niveaux de contamination

1. **29 parties directement sabotees** (24/04/2025 et 21/07/2025) : a exclure.
2. **Tout aout-decembre 2025 est fausse indirectement.** Ayant redemarre a 100, il a
   affronte pendant des mois des joueurs tres en dessous de son niveau reel
   (1930 rapide FFE). Ses victoires de cette periode ne mesurent rien.

## Filtre retenu

**Ne garder que les parties ou son classement en ligne est >= 1450**, soit
**86 parties, du 01/05/2026 au 26/08/2026** (66 % de victoires).

Corollaires : le tableau « victoires contre plus fort que lui » de `analysis.md`
section 6 est **invalide** (il gagnait contre des 1200 en valant 1930). L'evolution
de classement de la section 2 decrit une remontee de sabotage, pas une progression.

## Parties gagnees par mat, 12 a 30 coups, sur la periode fiable

| ID | Date | Camp | Coups | Lui | Adversaire |
|---|---|---|---|---|---|
| `173578670016` | 26/08/2026 | blancs | 23 | 1715 | 1700 |
| `173090642936` | 16/08/2026 | blancs | 22 | 1669 | 1692 |
| `170199171468` | 14/06/2026 | blancs | 19 | 1618 | 1607 |
| `168667365598` | 13/05/2026 | blancs | 25 | 1496 | 1472 |
| `168101229164` | 01/05/2026 | noirs  | 27 | 1496 | 1372 |

Ecartees : `168106961376` et `168107209744` (adversaire cote 122, sans valeur).

## Ce que le corpus ne contient PAS

Aucune partie officielle de Guyane : ni championnat individuel, ni championnat par
equipes avec Kayen, ni rencontre de ligue. Le champ `match` est absent partout et les
seuls tournois presents sont des arenes publiques mondiales Chess.com
(`creator: CHESScom`, 3808 inscrits). **Pour une partie de tournoi, la seule source
est Paul lui-meme.**
