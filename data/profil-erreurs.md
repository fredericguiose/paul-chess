# Profil d'erreurs de Paul-Erwan

Analyse Stockfish 18, profondeur 16, sur ses 86 parties de la période fiable (mai→août 2026, classement en ligne ≥ 1450).

**Comment lire les chiffres.** L'unité est le *centième de pion* : 100 = la valeur
d'un pion entier, 300 = la valeur d'un fou ou d'un cavalier. Quand on dit qu'un coup
« coûte 250 », ça veut dire qu'après ce coup sa position vaut deux pions et demi de
moins qu'avec le meilleur coup disponible.

- **imprécision** : coûte 50 à 100 (un demi-pion à un pion)
- **erreur** : coûte 100 à 300 (un à trois pions)
- **gaffe** : coûte 300 ou plus (une pièce entière ou davantage)

## 1. Sa moyenne

**Perte moyenne par coup : 47** (médiane 11)

| Catégorie | Nombre de coups | Part de ses coups |
|---|---|---|
| Coups corrects (coûtent < 50) | 1827 | 77 % |
| Imprécisions (50-100) | 245 | 10 % |
| Erreurs (100-300) | 241 | 10 % |
| **Gaffes (300+)** | **71** | **3 %** |

Il joue 2384 coups au total, dont 312 lui coûtent au moins un pion. Soit **une erreur sérieuse tous les 8 coups**.

## 2. À quel moment de la partie il se trompe

C'est la donnée qui compte pour régler un adversaire informatique.

| Moment | Coups joués | Perte moyenne | Gaffes | Taux de gaffe |
|---|---|---|---|---|
| ouverture (1-10) | 848 | 28 | 12 | 1 % |
| milieu (11-25) | 1015 | 56 | 34 | 3 % |
| fin de milieu (26-40) | 405 | 68 | 21 | 5 % |
| finale (41+) | 116 | 40 | 4 | 3 % |

**Il est le plus solide en ouverture (1-10)** (perte moyenne 28) et **le plus fragile en fin de milieu (26-40)** (perte moyenne 68, 5 % de gaffes).

### Détail par tranche de 5 coups

| Coups | n | Perte moyenne | Taux de gaffe |
|---|---|---|---|
| 1-5 | 430 | 14 | 0 % |
| 6-10 | 418 | 43 | 3 % |
| 11-15 | 391 | 49 | 2 % |
| 16-20 | 354 | 60 | 4 % |
| 21-25 | 270 | 59 | 4 % |
| 26-30 | 186 | 86 | 8 % |
| 31-35 | 133 | 56 | 4 % |
| 36-40 | 86 | 46 | 2 % |
| 41-45 | 50 | 39 | 4 % |
| 46-50 | 39 | 45 | 5 % |
| 51-55 | 20 | 35 | 0 % |

## 3. Ses parties gagnées contre ses parties perdues

| Issue | Coups | Perte moyenne | Taux de gaffe |
|---|---|---|---|
| Parties gagnées | 1643 | 39 | 2 % |
| Parties non gagnées | 741 | 65 | 5 % |

## 4. Cadence

Le filtre de fiabilite (classement >= 1450) ne retient que des parties en **rapide** :
son meilleur classement blitz est 1110, jamais atteint le seuil. Aucune comparaison
rapide/blitz possible sur la periode fiable.


| Cadence | Coups | Perte moyenne | Taux de gaffe |
|---|---|---|---|
| rapid | 2384 | 47 | 3 % |

## 5. Ses 15 pires coups

| Partie | Coup n° | Il a joué | Le moteur voulait | Coût | Date |
|---|---|---|---|---|---|
| `168905201698` | 9 | `Nb6` | `f6f2` | 1395 | 2026.05.18 |
| `173226931090` | 21 | `Ng4` | `b1a3` | 1372 | 2026.08.19 |
| `168855385702` | 24 | `Rxf7` | `b6e3` | 1289 | 2026.05.17 |
| `168905201698` | 30 | `Rxa2` | `g6f8` | 1158 | 2026.05.18 |
| `173227310994` | 27 | `Nd3` | `e6e5` | 1107 | 2026.08.19 |
| `173026255639` | 27 | `Qb2` | `d4g4` | 1101 | 2026.05.13 |
| `173287960424` | 27 | `Nxa5` | `c4e3` | 1037 | 2026.08.20 |
| `173227310994` | 29 | `Nxb2` | `d3c1` | 983 | 2026.08.19 |
| `173578670016` | 20 | `Qxc2` | `c7e6` | 928 | 2026.08.26 |
| `168854926402` | 34 | `f5` | `g6g5` | 865 | 2026.05.17 |
| `168905201698` | 25 | `Rf1+` | `a6d3` | 838 | 2026.05.18 |
| `169049118202` | 20 | `Qb5+` | `d2c4` | 751 | 2026.05.21 |
| `170251744494` | 24 | `Ra2` | `c7e5` | 744 | 2026.06.15 |
| `173226931090` | 17 | `Qg4` | `h6f7` | 699 | 2026.08.19 |
| `168101141922` | 10 | `Bxg7` | `d1d8` | 659 | 2026.05.01 |

## 6. Ses parties les mieux jouées selon le moteur

Parmi ses **victoires** contre un adversaire de son niveau (≥ 1400) :

| Partie | Date | Coups | Adversaire | Perte moyenne | Gaffes | Erreurs |
|---|---|---|---|---|---|---|
| `168100877714` | 2026.05.01 | 6 | 1403 | 2 | 0 | 0 |
| `168905476582` | 2026.05.18 | 13 | 1509 | 10 | 0 | 0 |
| `170252267212` | 2026.06.15 | 28 | 1624 | 11 | 0 | 0 |
| `168716926648` | 2026.05.14 | 21 | 1477 | 16 | 0 | 1 |
| `169049237808` | 2026.05.21 | 21 | 1513 | 17 | 0 | 1 |
| `169049110736` | 2026.05.21 | 5 | 1538 | 18 | 0 | 0 |
| `172538727708` | 2026.08.04 | 24 | 1655 | 19 | 0 | 1 |
| `168853721924` | 2026.05.17 | 12 | 1502 | 20 | 0 | 1 |
| `173718170445` | 2026.05.21 | 24 | 1675 | 21 | 0 | 0 |
| `172538151774` | 2026.08.04 | 34 | 1650 | 21 | 0 | 1 |

