# Analyse du corpus — pedagopaul (paul-erwan)

534 parties · 2025.04.24 → 2026.08.26 · profil `premium` · pays `GF`

> Source : API publique Chess.com (lecture seule, sans authentification).
> Aucun moteur d'échecs utilisé — tout est dérivé des en-têtes PGN, de la notation
> SAN, et du champ `accuracies` que Chess.com expose gratuitement sur une partie
> des parties. Les jugements coup par coup exigeraient Stockfish.

**Ce corpus ne contient aucune partie officielle de Guyane.** Les 534 parties sont
des parties en ligne ; les parties « de tournoi » présentes sont des arènes
publiques mondiales Chess.com (`creator: CHESScom`), pas des événements de la ligue.
Le champ `match` (matchs par équipes de club) est absent partout.

## 1. Vue d'ensemble

**362V – 151D – 21N** → **68 % de victoires** sur 534 parties.

| Cadence | n | V | D | N | % V | Elo moyen | Elo max |
|---|---|---|---|---|---|---|---|
| rapid | 354 | 253 | 84 | 17 | 71 | 1114 | 1729 |
| blitz | 178 | 109 | 65 | 4 | 61 | 998 | 1110 |
| daily | 2 | 0 | 2 | 0 | 0 | 400 | 400 |

### Comment ses parties se terminent

| Issue | n | % |
|---|---|---|
| win | 362 | 68 % |
| resigned | 120 | 22 % |
| timeout | 19 | 4 % |
| agreed | 10 | 2 % |
| checkmated | 8 | 1 % |
| abandoned | 4 | 1 % |
| repetition | 4 | 1 % |
| stalemate | 3 | 1 % |
| insufficient | 2 | 0 % |
| timevsinsufficient | 2 | 0 % |

Il **mate** dans 142 de ses 362 victoires (39 %) : il joue pour le mat, il ne se contente pas d'une position gagnante.
Il perd 19 parties au temps, soit 13 % de ses défaites.

## 2. Activité dans le temps

| Mois | n | % V | Elo rapide fin de mois |
|---|---|---|---|
| 2025.04 | 14 | 21 | 122 |
| 2025.07 | 15 | 60 | 142 |
| 2025.08 | 177 | 86 | 1196 |
| 2025.09 | 37 | 68 | 1307 |
| 2025.10 | 37 | 59 | 1375 |
| 2025.11 | 2 | 100 | — |
| 2025.12 | 33 | 45 | 1347 |
| 2026.01 | 8 | 38 | 1330 |
| 2026.02 | 2 | 50 | 1330 |
| 2026.03 | 3 | 67 | 1344 |
| 2026.04 | 17 | 65 | 1419 |
| 2026.05 | 58 | 64 | 1602 |
| 2026.06 | 16 | 50 | 1635 |
| 2026.07 | 1 | 0 | 1635 |
| 2026.08 | 114 | 63 | 1729 |

Pic : **2025.08, 177 parties**. Amplitude de 1 à 177 parties/mois → il joue **en rafales**, pas quotidiennement.

Heures de jeu (UTC ; Guyane = UTC−3) : 00h→34 · 01h→14 · 02h→6 · 11h→7 · 12h→30 · 13h→34 · 14h→30 · 15h→19 · 16h→28 · 17h→27 · 18h→36 · 19h→56 · 20h→29 · 21h→38 · 22h→104 · 23h→42

## 3. Répertoire d'ouvertures

### Blancs — 266 parties, 69 % V

| ECO | n | % du répertoire | V | % V | Nom |
|---|---|---|---|---|---|
| C45 | 80 | 30 % | 63 | 79 % | Scotch Game 3...exd4 4.Nxd4 Nxd4 5.Qxd4 |
| B01 | 28 | 11 % | 19 | 68 % | Scandinavian Defense Mieses Kotrc Variation  |
| C41 | 17 | 6 % | 12 | 71 % | Philidor Defense 3.d4 |
| B00 | 17 | 6 % | 12 | 71 % | Kings Pawn Opening |
| C42 | 13 | 5 % | 9 | 69 % | Petrovs Defense Classical Variation |
| B22 | 12 | 5 % | 9 | 75 % | Alapin Sicilian Defense 2...Nc6 3.Nf3 |
| B10 | 10 | 4 % | 8 | 80 % | Caro Kann Defense |
| C40 | 8 | 3 % | 5 | 63 % | Kings Pawn Opening Kings Knight Variation |
| B12 | 7 | 3 % | 4 | 57 % | Caro Kann Defense Fantasy Variation |
| C47 | 6 | 2 % | 5 | 83 % | Four Knights Game |

### Noirs — 268 parties, 66 % V

| ECO | n | % du répertoire | V | % V | Nom |
|---|---|---|---|---|---|
| B20 | 40 | 15 % | 28 | 70 % | Sicilian Defense Bowdler Attack 2...e6 |
| B30 | 39 | 15 % | 27 | 69 % | Sicilian Defense Old Sicilian Variation 3.Bc |
| A45 | 22 | 8 % | 16 | 73 % | Indian Game |
| A00 | 20 | 7 % | 11 | 55 % | Van t Kruijs Opening 1...c5 |
| B21 | 18 | 7 % | 12 | 67 % | Sicilian Defense Smith Morra Gambit 2...cxd4 |
| B22 | 15 | 6 % | 11 | 73 % | Alapin Sicilian Defense 2...Nc6 3.Nf3 Nf6 |
| B23 | 12 | 4 % | 9 | 75 % | Closed Sicilian Defense Traditional Line 3.N |
| B34 | 11 | 4 % | 6 | 55 % | Sicilian Defense Open Accelerated Dragon Exc |
| A46 | 8 | 3 % | 6 | 75 % | Indian Game Knights Variation 2...e6 |
| A57 | 8 | 3 % | 7 | 88 % | Benko Gambit |

### Premier coup

| Camp | Coup | n | % |
|---|---|---|---|
| Blancs | `e4` | 259 | 97 % |
| Blancs | `e3` | 3 | 1 % |
| Blancs | `f3` | 2 | 1 % |
| Blancs | `h4` | 1 | 0 % |
| Noirs (réponse) | `c5` | 171 | 64 % |
| Noirs (réponse) | `Nf6` | 58 | 22 % |
| Noirs (réponse) | `e5` | 11 | 4 % |
| Noirs (réponse) | `d5` | 8 | 3 % |

**Deux signatures massives :**

- Blancs : **Écossaise (C44/C45/C47) — 87 parties sur 266, soit 33 %**, 78 % de victoires
- Noirs : **Sicilienne (B2x–B9x) — 154 parties sur 268, soit 57 %**

## 4. Marqueurs de style

| Marqueur | n | % des parties | % V quand présent |
|---|---|---|---|
| Petit roque (O-O) | 318 | 60 % | 68 % |
| Grand roque (O-O-O) | 72 | 13 % | 79 % |
| Jamais roqué | 142 | 27 % | 61 % |
| Dame sortie avant le coup 8 | 133 | 25 % | 73 % |
| Frappe en f7 / f2 | 96 | 18 % | 81 % |
| Frappe sur le roque (g7/h7/g2/h2) | 115 | 22 % | 80 % |
| Promotion | 50 | 9 % | 92 % |

Longueur : médiane **25 coups** (min 1, max 82).
Ses victoires : **29 coups en moyenne** · ses défaites : 21.

## 5. Précision de jeu (champ `accuracies`, gratuit)

Disponible sur **213 parties sur 534** (40 %). C'est le score global du Game Review que Chess.com facture coup par coup mais expose en agrégat.

| Segment | n | Précision moyenne |
|---|---|---|
| Toutes | 213 | 81.2 % |
| Victoires | 148 | 84.3 % |
| Défaites | 54 | 73.2 % |
| Rapide | 151 | 81.7 % |
| Blitz | 61 | 79.7 % |
| À l'Écossaise | 37 | 80.5 % |

### Ses 10 parties les mieux jouées (gagnées, adversaire ≥ 1200)

Filtre sur l'Elo adverse : une précision de 100 % contre un joueur à 450 traduit une
partie courte et forcée, pas une performance.

| Précision | Adv. | Cadence | Camp | Coups | Adversaire | ECO | ID |
|---|---|---|---|---|---|---|---|
| 98.3 % | 61.0 % | rapid | N | 12 | fxtsilas (1548) | A57 | `155303796803` |
| 97.7 % | 99.8 % | rapid | B | 6 | David_Paiva (1337) | C43 | `144419109792` |
| 95.1 % | 80.1 % | rapid | N | 17 | userabdou369 (1223) | B30 | `143238563590` |
| 95.0 % | 81.0 % | rapid | B | 17 | Rajesh1593 (1378) | B01 | `146997710544` |
| 94.6 % | 75.7 % | rapid | N | 29 | Avi_thapa (1238) | B20 | `143242102036` |
| 94.5 % | 79.4 % | rapid | N | 19 | Sourabh1311 (1593) | A57 | `170199407776` |
| 94.4 % | 71.0 % | rapid | B | 16 | mortimer08 (1281) | C45 | `144145540714` |
| 94.1 % | 84.1 % | rapid | N | 21 | Mfdoom69 (1321) | B22 | `143909575328` |
| 93.8 % | 38.4 % | rapid | B | 11 | fahim_081 (1316) | C40 | `143909014072` |
| 93.1 % | 84.4 % | rapid | B | 21 | CYD0308 (1477) | C05 | `168716926648` |

## 6. Adversaires

**492 adversaires distincts.** Ceux qu'il a affrontés 4 fois ou plus :

| Adversaire | Parties | V | D | Elo max affronté |
|---|---|---|---|---|
| Dam97_3 | 13 | 10 | 2 | 1764 |
| Frexduque | 8 | 8 | 0 | 1417 |
| Link34500 | 5 | 5 | 0 | 486 |
| Armenmikaelya | 4 | 2 | 2 | 855 |
| euroinvest | 4 | 2 | 2 | 1404 |

**27 victoires contre un adversaire coté 100 points ou plus au-dessus de lui.** Top 6 :

| Date | Cadence | Lui | Adversaire | Écart | Coups | ID |
|---|---|---|---|---|---|---|
| 2026.08.12 | blitz | 982 | Pham-thai-AN (1328) | +346 | 21 | `172865545780` |
| 2025.08.16 | rapid | 758 | Tundall1 (1013) | +255 | 18 | `149687298523` |
| 2025.08.23 | blitz | 873 | bezobraznolosh (1114) | +241 | 34 | `150268092515` |
| 2026.08.13 | blitz | 987 | Ali_gtlo (1214) | +227 | 33 | `172912229690` |
| 2025.08.08 | rapid | 361 | Rexxar20 (586) | +225 | 10 | `148986503577` |
| 2025.08.24 | rapid | 955 | NickG1111 (1176) | +221 | 25 | `150377291479` |

Contre plus fort : **40 % V** (n=221) · contre plus faible : **88 % V** (n=310)

## 7. Parties candidates pour le script du jeu

Critères : **il gagne**, **par mat**, entre 12 et 30 coups. Le score privilégie le
sacrifice, la brièveté, la force de l'adversaire et la précision mesurée.

**79 parties remplissent les critères.** Top 15 par score :

| # | Date | Cadence | Camp | Coups | Lui | Adversaire | ECO | Sacr. | Précision | Score | ID |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 2025.09.02 | rapid | B | 15 | 1243 | 21andNati (1204) | B10 | oui | 82 % | 83 | `142635297182` |
| 2 | 2026.06.14 | rapid | B | 19 | 1618 | jrcktb (1607) | C47 | oui | 82 % | 83 | `170199171468` |
| 3 | 2026.08.16 | rapid | B | 22 | 1669 | thrvoic1 (1692) | C45 | oui | 69 % | 79 | `173090642936` |
| 4 | 2026.05.13 | rapid | B | 25 | 1496 | rrf_1982 (1472) | C45 | oui | 76 % | 75 | `168667365598` |
| 5 | 2025.08.28 | rapid | N | 24 | 1057 | parth48 (1050) | A01 | oui | 87 % | 74 | `142437231814` |
| 6 | 2026.05.01 | rapid | B | 19 | 1496 | Anonyme973 (122) | B02 | oui | 91 % | 70 | `168106961376` |
| 7 | 2026.08.25 | blitz | B | 19 | 1050 | Dam97_3 (1173) | C45 | oui | 86 % | 70 | `173523236924` |
| 8 | 2026.01.05 | rapid | N | 20 | 1321 | XxPiMolitorPatelxX (100) | B20 | oui | 88 % | 69 | `147629904404` |
| 9 | 2026.08.25 | blitz | N | 24 | 1056 | Dam97_3 (1155) | B30 | oui | 93 % | 67 | `173522866754` |
| 10 | 2025.08.29 | rapid | B | 17 | 1130 | Handsoment (1093) | B08 | oui | — | 64 | `142497147286` |
| 11 | 2026.08.25 | blitz | B | 25 | 1107 | Gourav_888 (1018) | B06 | oui | 78 % | 61 | `173526395712` |
| 12 | 2025.04.24 | rapid | B | 26 | 122 | MayhemMachine9000 (100) | C42 | oui | 67 % | 58 | `137746403984` |
| 13 | 2025.08.12 | rapid | B | 16 | 606 | Faira_cfx (378) | B00 | oui | — | 58 | `141804234888` |
| 14 | 2026.05.01 | rapid | N | 27 | 1496 | Frexduque (1372) | B20 | oui | — | 57 | `168101229164` |
| 15 | 2025.08.12 | rapid | B | 18 | 531 | MajinLo (380) | B00 | oui | — | 56 | `149275106425` |

### Les 3 meilleures, en détail

#### `142635297182` — 2025.09.02, 15 coups

- Blancs · rapid · lui 1243 vs 21andNati 1204
- Caro Kann Defense Two Knights Attack 3...dxe4 4.Nxe4 Nf6 (`B10`)
- pedagopaul won by checkmate · précision 82.4 %
- https://www.chess.com/game/live/142635297182

```
1. e4 1... c6 2. Nf3 2... d5 3. Nc3 3... dxe4 4. Nxe4 4... Nf6 5. Neg5 5... Bf5 6. Nxf7 6... Kxf7 7. Bc4+ 7... Be6 8. Ng5+ 8... Kg6 9. Nxe6 9... Qd6 10. Qf3 10... h5 11. c3 11... Kh7 12. Ng5+ 12... Kg6 13. Bf7+ 13... Kxg5 14. d4+ 14... Kh4 15. Qh3# 1-0
```

#### `170199171468` — 2026.06.14, 19 coups

- Blancs · rapid · lui 1618 vs jrcktb 1607
- Four Knights Game Scotch Variation Accepted 5.Nxd4 Bc5 6.Be3 (`C47`)
- pedagopaul won by checkmate · précision 81.5 %
- https://www.chess.com/game/live/170199171468

```
1. e4 1... e5 2. Nf3 2... Nc6 3. d4 3... exd4 4. Nxd4 4... Nf6 5. Nc3 5... Bc5 6. Be3 6... Nxd4 7. Bxd4 7... Bxd4 8. Qxd4 8... d6 9. O-O-O 9... a5 10. h4 10... b6 11. e5 11... Nd7 12. exd6 12... cxd6 13. Re1+ 13... Kf8 14. Qxd6+ 14... Kg8 15. Bc4 15... Bb7 16. Rh3 16... Nf6 17. Qf4 17... g6 18. h5 18... Nxh5 19. Qxf7# 1-0
```

#### `173090642936` — 2026.08.16, 22 coups

- Blancs · rapid · lui 1669 vs thrvoic1 1692
- Scotch Game 3...exd4 4.Nxd4 Nxd4 5.Qxd4 (`C45`)
- pedagopaul won by checkmate · précision 68.6 %
- https://www.chess.com/game/live/173090642936

```
1. e4 1... e5 2. Nf3 2... Nc6 3. d4 3... exd4 4. Nxd4 4... Nxd4 5. Qxd4 5... h6 6. Nc3 6... b6 7. Be2 7... Bc5 8. Qd3 8... Qf6 9. O-O 9... Qg6 10. Nd5 10... Bd6 11. f4 11... c6 12. f5 12... Qh7 13. Nxb6 13... Bc5+ 14. Be3 14... Bxb6 15. Bxb6 15... axb6 16. e5 16... Ne7 17. Bh5 17... Ba6 18. c4 18... b5 19. Bxf7+ 19... Kxf7 20. e6+ 20... dxe6 21. fxe6+ 21... Ke8 22. Qd7# 1-0
```

## 8. Matériau d'énigmes vérifiable

Chiffres exacts extraits du corpus. La colonne de droite applique la règle : **une
réponse doit être un fait dont *il* est certain, pas un fait vrai.**

| Fait | Valeur | Utilisable ? |
|---|---|---|
| Ouverture-signature aux blancs | Écossaise — 33 % de ses parties blanches | **oui** — identitaire |
| Défense-signature aux noirs | Sicilienne — 57 % | **oui** — identitaire |
| Club | Kayen Echec Club (Cayenne) | **oui** |
| Rôle en sélection | capitaine de la sélection de Guyane | **oui** |
| Pic Elo FFE | 2100 (déclaré sans hésiter) | **oui** |
| Titre de la saison | vice-champion académique | **oui** |
| Classement U20 Guyane | n°1 en Elo | **oui** |
| Adversaire le plus affronté | Dam97_3 (13 parties) | oui **si** c'est un proche |
| Parties jouées sur Chess.com | 534 | à confirmer avec lui |
| Meilleur Elo rapide Chess.com | 1729 | moyen — il consulte peu |
| Elo FFE actuel | ~1900 | **non** — « j'ai pas vérifié mon dernier classement » |
| % de victoires à l'Écossaise | 78 % | **non** — personne ne connaît ce chiffre sur soi |
| Victoires par mat | 142 | **non** |

Ses propres mots à conserver : « le Elo FFE est pas comme le FIDE », « les classements
nationaux sont plus volatils que les classements internationaux », « en Guyane on est
pas hyper nombreux et on joue essentiellement entre nous ». → **Ne jamais bâtir une
énigme sur son classement courant.**

