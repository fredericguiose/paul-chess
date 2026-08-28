/**
 * Positions « quel est le meilleur coup ? » — **fichier généré, ne pas éditer à la main.**
 *
 * Source : `node scripts/positions-qcm.mjs`. Chaque position est tirée de ses propres
 * parties (rapide, classement en ligne >= 1450), au trait des blancs, hors ouverture.
 *
 * Le coup correct et les trois leurres sortent du **MultiPV de Stockfish à la
 * profondeur 18** : les leurres sont les 2ᵉ, 3ᵉ et 4ᵉ choix du moteur. Ils sont donc
 * plausibles par construction, et inférieurs par construction. Une position n’est
 * retenue que si le meilleur coup devance le deuxième d’au moins 250
 * centipions — sans cet écart, « le meilleur coup » se discute, et une correction
 * contestée devant huit personnes est le seul incident qui peut casser la soirée.
 *
 * 40 positions retenues sur 516 examinées. Triées par écart décroissant,
 * donc **par difficulté croissante** : la première se voit, la dernière se cherche.
 */

export interface PositionQcm {
  id: string
  /** Position à afficher, trait aux blancs. */
  fen: string
  /** Les quatre coups proposés, en notation algébrique, déjà mélangés. */
  choix: string[]
  /** Index du bon coup dans `choix`. */
  bonneReponse: number
  /** Avance du meilleur coup sur le deuxième, en centipions. Sert au tri. */
  ecart: number
  indices: string[]
}

export const POSITIONS_QCM: readonly PositionQcm[] = [
  {
    id: 'position-01',
    fen: '3Q4/p4ppk/3P4/4P3/7p/7P/P5PK/2r3r1 w - - 2 32',
    choix: ['Qg8+', 'Qe7', 'Qh8+', 'Qxh4+'],
    bonneReponse: 3,
    ecart: 2044,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne une pièce lourde, ou mieux.']
  },
  {
    id: 'position-02',
    fen: 'r4rk1/5pp1/p2p4/q1p3P1/1p2P3/1P3P2/b1PQ4/2KR1B1R w - - 1 20',
    choix: ['Qd5', 'Qh2', 'Qf2', 'Qf4'],
    bonneReponse: 1,
    ecart: 1101,
    indices: ['Le bon coup ne prend rien : il menace.', 'Ce coup termine la partie.']
  },
  {
    id: 'position-03',
    fen: '7k/4r1p1/5p2/8/4B1P1/1KR4P/8/8 w - - 0 47',
    choix: ['Bc2', 'Rc8+', 'Bg6', 'Bf5'],
    bonneReponse: 1,
    ecart: 1076,
    indices: ['Le bon coup ne prend rien : il menace.', 'Ce coup termine la partie.']
  },
  {
    id: 'position-04',
    fen: '7k/pp1nPr1p/1qb3p1/8/8/1P2P3/P5PP/2R2RK1 w - - 0 25',
    choix: ['e8=R+', 'e8=Q+', 'Rfe1', 'Rce1'],
    bonneReponse: 1,
    ecart: 1068,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne une pièce lourde, ou mieux.']
  },
  {
    id: 'position-05',
    fen: '1Q3bk1/pp3p1p/q1b1p1p1/8/2NP4/P2nB3/1r3PPP/R1R3K1 w - - 4 29',
    choix: ['Nxb2', 'd5', 'Rc2', 'Bh6'],
    bonneReponse: 3,
    ecart: 995,
    indices: ['Le bon coup ne prend rien : il menace.', 'Ce coup termine la partie.']
  },
  {
    id: 'position-06',
    fen: 'r5k1/p4pr1/1p1p3R/2p5/5n2/3B1P2/PPP3P1/2K4R w - - 0 25',
    choix: ['g4', 'Rh8#', 'Bb5', 'Be4'],
    bonneReponse: 1,
    ecart: 990,
    indices: ['Le bon coup ne prend rien : il menace.', 'Ce coup termine la partie.']
  },
  {
    id: 'position-07',
    fen: '6k1/3Q3p/1p2b1n1/p7/K2PP3/P7/r6P/2r5 w - - 0 32',
    choix: ['Qd6', 'Qxe6+', 'Qe8+', 'Qd8+'],
    bonneReponse: 1,
    ecart: 925,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne une pièce lourde, ou mieux.']
  },
  {
    id: 'position-08',
    fen: '2k5/4p3/2K5/1P3ppp/8/5P1P/5P2/8 w - - 0 37',
    choix: ['Kb6', 'f4', 'b6', 'Kd5'],
    bonneReponse: 1,
    ecart: 904,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne une pièce lourde, ou mieux.']
  },
  {
    id: 'position-09',
    fen: 'r2q2kr/1b3p1p/1p4p1/p6n/2B2Q2/2N4R/PPP2PP1/2K1R3 w - - 0 19',
    choix: ['Bxf7+', 'Qe5', 'Rxh5', 'Qxf7#'],
    bonneReponse: 3,
    ecart: 766,
    indices: ['Le bon coup prend quelque chose.', 'Ce coup termine la partie.']
  },
  {
    id: 'position-10',
    fen: '1r3r1k/2p2pp1/2Bp1q1p/p2P4/7P/4b1R1/PPPQ1P2/2K4R w - - 0 21',
    choix: ['Rhg1', 'Qxe3', 'Rxe3', 'fxe3'],
    bonneReponse: 1,
    ecart: 730,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne l’équivalent d’une pièce.']
  },
  {
    id: 'position-11',
    fen: 'r4rk1/ppq2pp1/2p1pb1p/4n3/1PBP4/P1N5/2P1QP2/R3R1K1 w - - 0 20',
    choix: ['Rad1', 'dxe5', 'Ne4', 'Bb3'],
    bonneReponse: 1,
    ecart: 558,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne l’équivalent d’une pièce.']
  },
  {
    id: 'position-12',
    fen: '2r2rk1/pp3ppp/8/3PP3/6b1/3Q1N2/P5PP/2q2R1K w - - 0 23',
    choix: ['h3', 'Rxc1', 'e6', 'd6'],
    bonneReponse: 1,
    ecart: 498,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-13',
    fen: 'r6r/pp1b1k2/2p1p2p/4P1p1/4B3/8/PPP3PP/3RK3 w - - 0 18',
    choix: ['h4', 'Rd3', 'a4', 'Rxd7+'],
    bonneReponse: 3,
    ecart: 481,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-14',
    fen: 'r2r2k1/pp2ppbp/6p1/5b2/3P4/P3Bq1P/1P3PP1/2R1KB1R w K - 0 15',
    choix: ['Rc8', 'Rc4', 'gxf3', 'Rc7'],
    bonneReponse: 2,
    ecart: 460,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-15',
    fen: '2k4r/p4p2/Ppp4p/3r2p1/5qP1/1Q5P/1P3PK1/R3R3 w - - 0 28',
    choix: ['Re7', 'Qc3', 'Ra4', 'Re3'],
    bonneReponse: 1,
    ecart: 458,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-16',
    fen: '8/4pp1p/5kp1/pp6/8/PPK2P1P/5P2/8 w - - 0 27',
    choix: ['Kd4', 'Kd3', 'b4', 'h4'],
    bonneReponse: 2,
    ecart: 447,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-17',
    fen: '8/6kp/1p2Q1n1/p7/K2PP3/P7/r6P/2r5 w - - 1 33',
    choix: ['d5', 'Qd6', 'Qd7+', 'Qxa2'],
    bonneReponse: 3,
    ecart: 442,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-18',
    fen: 'r6k/pp1n1r1p/1qb1P1p1/8/8/1P2P3/P4QPP/2R2RK1 w - - 0 23',
    choix: ['Qd2', 'exf7', 'Qxf7', 'Qb2+'],
    bonneReponse: 1,
    ecart: 439,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-19',
    fen: '8/8/7P/6P1/3b1K2/2kb4/1p6/1B6 w - - 3 60',
    choix: ['Bxd3', 'Kg4', 'Ba2', 'g6'],
    bonneReponse: 2,
    ecart: 409,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-20',
    fen: '5rk1/rB4p1/3p1n2/3P4/p2p1P2/6R1/1PP5/2K4R w - - 3 29',
    choix: ['Ra3', 'Bc6', 'Rd1', 'Ba6'],
    bonneReponse: 1,
    ecart: 404,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-21',
    fen: '4r1k1/5p1p/3b2p1/8/P2R4/6P1/2r2PKP/5R2 w - - 0 29',
    choix: ['h4', 'a5', 'Rfd1', 'Rxd6'],
    bonneReponse: 3,
    ecart: 402,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-22',
    fen: '8/5p1p/6p1/K4P2/7k/8/8/1n6 w - - 0 46',
    choix: ['Kb5', 'Ka4', 'f6', 'Kb4'],
    bonneReponse: 2,
    ecart: 391,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-23',
    fen: '8/8/4k2p/2K5/5pp1/2B1p3/6PP/8 w - - 0 40',
    choix: ['Ba1', 'Kc4', 'Kd4', 'Bd4'],
    bonneReponse: 2,
    ecart: 388,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-24',
    fen: '7k/pp1n1Q1p/2b3p1/8/8/1P2q3/P5PP/2R2R1K w - - 2 28',
    choix: ['Rfe1', 'Rxc6', 'Rce1', 'Rc2'],
    bonneReponse: 2,
    ecart: 367,
    indices: ['Le bon coup ne prend rien : il menace.', 'Ce coup termine la partie.']
  },
  {
    id: 'position-25',
    fen: '6k1/3Q3p/1p2p1n1/p7/K1bPP1B1/P7/r6P/2r5 w - - 0 31',
    choix: ['Qd6', 'Qc8+', 'Qd8+', 'Bxe6+'],
    bonneReponse: 3,
    ecart: 366,
    indices: ['Le bon coup prend quelque chose.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-26',
    fen: '4r3/6bk/2pB4/3ppRR1/p3P1P1/1r1P4/4K3/8 w - - 2 34',
    choix: ['Bxe5', 'Rf7', 'Rh5+', 'exd5'],
    bonneReponse: 1,
    ecart: 365,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-27',
    fen: 'r1k3nB/p1p4p/1pn5/4p3/8/b1N4N/PPP2PPP/2KR1B1R w - - 0 12',
    choix: ['Bb5', 'Ba6+', 'bxa3', 'Kb1'],
    bonneReponse: 1,
    ecart: 363,
    indices: ['Le bon coup ne prend rien : il menace.', 'Le bon coup gagne trois pions d’avantage.']
  },
  {
    id: 'position-28',
    fen: 'r3kb1r/pp2qp1p/2n3p1/3n4/3P3P/1Q2BP1B/PP3P2/R3K2R w KQkq - 0 14',
    choix: ['Kf1', 'Qxd5', 'O-O-O', 'O-O'],
    bonneReponse: 1,
    ecart: 329,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-29',
    fen: '1r3r1k/pbp3pB/1p1bpq2/7P/3P4/2PQPN1R/PP2K3/6R1 w - - 0 22',
    choix: ['Rf1', 'd5', 'e4', 'Be4'],
    bonneReponse: 3,
    ecart: 314,
    indices: ['Le bon coup ne prend rien : il menace.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-30',
    fen: '4rrk1/6pn/p2p4/1ppP4/3b1P2/4B1R1/PPP1B3/2K4R w - - 1 24',
    choix: ['Kd1', 'Kd2', 'Bxd4', 'Rhh3'],
    bonneReponse: 2,
    ecart: 305,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-31',
    fen: 'r3r1k1/2nb2p1/1p2p1Qp/pP2q3/2P1p3/P2B3P/5PP1/R3R1K1 w - - 0 25',
    choix: ['Bc2', 'Bxe4', 'Rac1', 'g4'],
    bonneReponse: 1,
    ecart: 303,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-32',
    fen: 'r1b5/1p2n2p/pqn2rpk/8/2B1P3/N1Q5/PPP3PP/2K4R w - - 0 18',
    choix: ['Nb5', 'e5', 'Qxf6', 'Rd1'],
    bonneReponse: 2,
    ecart: 299,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-33',
    fen: 'r5k1/pp2pp1p/6p1/5b2/2r5/P4P1P/1P3P2/4KB1R w K - 0 18',
    choix: ['Kd2', 'Ke2', 'h4', 'Bxc4'],
    bonneReponse: 3,
    ecart: 291,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-34',
    fen: 'r3r1k1/p4pbp/1p4p1/2p1n3/2Pp1B2/3P4/PP1N1PPP/R3R1K1 w - - 5 19',
    choix: ['Nf3', 'Bxe5', 'b3', 'Rxe5'],
    bonneReponse: 1,
    ecart: 291,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-35',
    fen: 'r1b2rk1/p1pp3p/1p2p3/3n4/3P2p1/PQ2P3/PB1KB1qP/5R1R w - - 0 17',
    choix: ['Rfg1', 'Qd1', 'Rhg1', 'Rxf8+'],
    bonneReponse: 2,
    ecart: 288,
    indices: ['Le bon coup ne prend rien : il menace.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-36',
    fen: 'r1b5/1p2n1kp/pqn2rp1/8/2B1PB2/N1Q5/PPP3PP/2K4R w - - 0 17',
    choix: ['Bg5', 'Rf1', 'Bh6+', 'b4'],
    bonneReponse: 1,
    ecart: 285,
    indices: ['Le bon coup ne prend rien : il menace.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-37',
    fen: '3q1k2/5ppp/4p3/1Q1p4/1Pn5/5P2/5P1P/3R2K1 w - - 0 24',
    choix: ['Qc5+', 'f4', 'h4', 'Qxc4'],
    bonneReponse: 3,
    ecart: 273,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-38',
    fen: '3r1k2/1b3ppp/p1n1p3/1p3qN1/8/1P1P2P1/P2Q1PBP/4R1K1 w - - 5 20',
    choix: ['Qe3', 'Be4', 'Bh3', 'Qc1'],
    bonneReponse: 1,
    ecart: 262,
    indices: ['Le bon coup ne prend rien : il menace.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-39',
    fen: '6k1/5pp1/3q1b1p/1Bp2b2/2Pp4/2rP1N1P/r3QPP1/4R1K1 w - - 0 30',
    choix: ['Qe8+', 'Qxa2', 'Nd2', 'Qd1'],
    bonneReponse: 1,
    ecart: 254,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  },
  {
    id: 'position-40',
    fen: '8/4pp1p/5kp1/p7/1p1K4/PP3P1P/5P2/8 w - - 0 28',
    choix: ['a4', 'axb4', 'f4', 'Kd3'],
    bonneReponse: 1,
    ecart: 250,
    indices: ['Le bon coup prend quelque chose.', 'L’écart est net, mais il ne saute pas aux yeux.']
  }
]
