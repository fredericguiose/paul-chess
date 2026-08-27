/**
 * Vérification du lot A — moteur. Sans navigateur, sans dépendance ajoutée.
 *
 *   node src/engine/verifier.mjs
 *
 * Les modules du moteur sont chargés par **Vite** en mode SSR (`ssrLoadModule`) :
 * c'est le seul moyen de résoudre les imports sans extension (`../types`) comme
 * l'application le fait, sans toucher à `tsconfig.json`. Vite est déjà une
 * devDependency du projet — aucun paquet à installer.
 *
 * Ce que ça couvre :
 *   1. livre d'ouverture : 4 coups scriptés, variante Nc3, sortie de livre ;
 *   2. pilotage UCI : découpage du tampon sur `\n`, parsing `score cp|mate`,
 *      bornage des mats, MultiPV (avec un faux Worker qui parle UCI) ;
 *   3. faute volontaire sur 20 parties simulées ;
 *   4. garde-fou, y compris « le joueur donne une pièce au 12ᵉ coup » ;
 *   5. abandon : verrou temporel, et les deux bugs historiques.
 */

import { createServer } from 'vite'

let ok = 0
const echecs = []

function verifier(nom, condition, detail = '') {
  if (condition) {
    ok++
    console.log(`  ok   ${nom}`)
  } else {
    echecs.push(nom + (detail ? ` — ${detail}` : ''))
    console.log(`  ÉCHEC ${nom}${detail ? ` — ${detail}` : ''}`)
  }
}

// ─────────────────────────────────────────── polyfills navigateur minimaux

/** Le store zustand est persisté dans `localStorage`. */
function installerLocalStorage() {
  const memoire = new Map()
  globalThis.localStorage = {
    getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
    setItem: (k, v) => memoire.set(k, String(v)),
    removeItem: (k) => memoire.delete(k),
    clear: () => memoire.clear(),
    key: (i) => [...memoire.keys()][i] ?? null,
    get length() {
      return memoire.size
    }
  }
}

/**
 * Faux Stockfish : parle UCI, et renvoie exprès ses lignes **mal découpées** —
 * plusieurs lignes dans un message, une ligne coupée en deux — pour vérifier que le
 * tampon est bien recollé puis découpé sur `\n`.
 */
function installerFauxWorker(scenario) {
  globalThis.Worker = class FauxWorker {
    constructor(url) {
      this.url = url
      this.onmessage = null
      this.onerror = null
      this.multipv = 1
    }

    emettre(lignes) {
      // Fidèle au transport réel, vérifié dans le navigateur : `stockfish.js` envoie
      // **une ligne complète par postMessage**, sans `\n` final, et ne coupe jamais
      // au milieu d'une ligne — contrairement à un flux stdout brut.
      //
      // Une version antérieure de ce faux worker coupait exprès à 37 % et 71 % du
      // texte. C'était plus sévère que la réalité, et ça a coûté cher : la
      // « correction » faite pour lui plaire a empêché le vrai moteur de démarrer.
      // Un test doit reproduire le transport, pas en inventer un pire.
      //
      // On garde en revanche le cas « plusieurs lignes dans un seul message », lui
      // bien réel, en les groupant deux par deux.
      for (let i = 0; i < lignes.length; i += 2) {
        const paquet = lignes.slice(i, i + 2).join('\n')
        setTimeout(() => this.onmessage?.({ data: paquet }), 0)
      }
    }

    postMessage(cmd) {
      if (cmd === 'uci') return this.emettre(['id name FauxFish', 'option name Hash', 'uciok'])
      if (cmd === 'isready') return this.emettre(['readyok'])
      const mpv = /^setoption name MultiPV value (\d+)/.exec(cmd)
      if (mpv) {
        this.multipv = Number(mpv[1])
        return
      }
      if (cmd.startsWith('go')) return this.emettre(scenario(this.multipv))
      // position, ucinewgame, autres setoption, quit : rien à renvoyer
    }

    terminate() {}
  }
}

// ─────────────────────────────────────────── scénarios de recherche

/** N coups candidats, du meilleur au pire, avec des scores imposés. */
const scenarioCandidats = (cps, coups) => (multipv) => {
  const lignes = ['info depth 4 multipv 1 score cp 0 pv a2a3']
  const n = Math.min(multipv, cps.length)
  for (let i = 0; i < n; i++) {
    lignes.push(
      `info depth 10 seldepth 14 multipv ${i + 1} score cp ${cps[i]} nodes 1000 pv ${coups[i]} e7e5`
    )
  }
  lignes.push(`bestmove ${coups[0]} ponder e7e5`)
  return lignes
}

async function main() {
  installerLocalStorage()

  const serveur = await createServer({
    configFile: false,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true }
  })

  const charger = (f) => serveur.ssrLoadModule('/src/engine/' + f)

  const types = await serveur.ssrLoadModule('/src/types.ts')
  const { REGLES_BOT, CLAMP_EVAL, NOMBRE_DE_COUPS, LIVRE_OUVERTURE } = types

  // ── 1. livre d'ouverture
  console.log('\n1. livre d’ouverture')
  const livre = await charger('livreOuverture.ts')
  {
    const sans = []
    let bon = true
    for (const { joueur, bot } of LIVRE_OUVERTURE) {
      sans.push(joueur)
      const r = livre.reponseDuLivre(sans)
      if (r !== bot) bon = false
      sans.push(r ?? '??')
    }
    verifier('les 4 coups scriptés sortent du livre', bon, sans.join(' '))
    verifier(
      'moteur interrogé au 5ᵉ coup sur la ligne principale',
      livre.premierCoupInterroge(sans) === LIVRE_OUVERTURE.length + 1,
      'coup ' + livre.premierCoupInterroge(sans)
    )
    verifier('rien de scripté au 5ᵉ coup', livre.reponseDuLivre([...sans, 'Bc4']) === null)
  }
  {
    const sans = ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3']
    verifier('variante Nc3 → Nf6', livre.reponseDuLivre(sans) === 'Nf6')
    verifier(
      'moteur interrogé au 4ᵉ coup sur la variante Nc3',
      livre.premierCoupInterroge([...sans, 'Nf6']) === 4,
      'coup ' + livre.premierCoupInterroge([...sans, 'Nf6'])
    )
  }
  {
    const hors = ['d4']
    verifier('hors livre dès 1.d4 → aucune réponse scriptée', livre.reponseDuLivre(hors) === null)
    verifier('hors livre détecté', livre.estDansLeLivre(hors) === false)
    verifier(
      'sortie de livre au 3ᵉ coup (1.e4 e5 2.Nf3 Nc6 3.Bc4)',
      livre.reponseDuLivre(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']) === null
    )
    verifier(
      'le bot ne joue pas hors de son tour',
      livre.reponseDuLivre(['e4', 'e5']) === null
    )
  }

  // ── 2. pilotage UCI
  console.log('\n2. pilotage UCI (faux Worker, transport fidèle au réel)')
  installerFauxWorker(scenarioCandidats([30, -120, -390, -640, -1200], [
    'g8f6',
    'd7d6',
    'f8c5',
    'b8a6',
    'h7h5'
  ]))
  const workerMod = await charger('worker.ts')
  {
    const pilote = new workerMod.PiloteUci()
    await pilote.init()
    verifier('init : uci → uciok, isready → readyok', pilote.etat === 'pret', pilote.etat)
    const ev = await pilote.evaluate('startpos-bidon')
    verifier('evaluate renvoie cp et bestmove', ev.cp === 30 && ev.best === 'g8f6', JSON.stringify(ev))
    const cands = await pilote.evaluerCandidats('startpos-bidon', 5)
    verifier(
      'MultiPV : 5 candidats classés du meilleur au pire',
      cands.length === 5 && cands[0].cp === 30 && cands[4].cp === -1200 && cands[2].uci === 'f8c5',
      JSON.stringify(cands)
    )
    verifier('rangs MultiPV renseignés', cands.every((c, i) => c.rang === i))
    pilote.arreter()
    verifier('arreter → état arreté', pilote.etat === 'arrete')
  }
  {
    // Bornage des mats : `score mate 3` ne doit pas produire des milliers de cp.
    installerFauxWorker(() => [
      'info depth 10 multipv 1 score mate 3 pv g8f6',
      'bestmove g8f6'
    ])
    const p = new workerMod.PiloteUci()
    await p.init()
    const ev = await p.evaluate('bidon')
    verifier('mate + borné à +CLAMP_EVAL', ev.cp === CLAMP_EVAL, String(ev.cp))
    p.arreter()

    installerFauxWorker(() => [
      'info depth 10 multipv 1 score mate -2 pv g8f6',
      'bestmove g8f6'
    ])
    const q = new workerMod.PiloteUci()
    await q.init()
    const ev2 = await q.evaluate('bidon')
    verifier('mate − borné à −CLAMP_EVAL', ev2.cp === -CLAMP_EVAL, String(ev2.cp))
    q.arreter()
  }

  // ── 3. faute volontaire, 20 parties simulées
  console.log('\n3. faute volontaire (20 parties simulées)')
  const faute = await charger('faute.ts')
  {
    // Coup planifié toujours dans la fenêtre autorisée.
    let coupsOk = true
    for (let i = 0; i < 200; i++) {
      const c = faute.planifierFaute(() => i / 200)
      if (c < REGLES_BOT.fauteEntreCoups.debut || c > REGLES_BOT.fauteEntreCoups.fin) {
        coupsOk = false
      }
    }
    verifier('la faute tombe toujours dans REGLES_BOT.fauteEntreCoups', coupsOk)
    verifier(
      'planifierFaute(0) = début, planifierFaute(0.999) = fin',
      faute.planifierFaute(() => 0) === REGLES_BOT.fauteEntreCoups.debut &&
        faute.planifierFaute(() => 0.999) === REGLES_BOT.fauteEntreCoups.fin
    )

    let dansFenetre = 0
    let jamaisLePire = true
    let jamaisLeMeilleur = true
    const alea = (() => {
      let s = 12345
      return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    })()

    for (let partie = 0; partie < 20; partie++) {
      // Éventail réaliste : le meilleur coup est correct, puis ça se dégrade.
      const n = 8 + Math.floor(alea() * 8)
      const cps = []
      let cp = Math.round(alea() * 60 - 20)
      for (let i = 0; i < n; i++) {
        cps.push(cp)
        cp -= Math.round(40 + alea() * 260)
      }
      const coups = cps.map((_, i) => `x${i}y${i}`)
      const candidats = cps.map((c, i) => ({ uci: coups[i], cp: c, rang: i }))
      const res = faute.choisirFaute(candidats, { couvreTousLesCoups: true, forcer: true })
      if (!res.choix) {
        jamaisLePire = false
        continue
      }
      if (res.dansLaFenetre) dansFenetre++
      if (res.choix.rang === n - 1) jamaisLePire = false
      if (res.choix.rang === 0) jamaisLeMeilleur = false
    }
    verifier('la faute n’est jamais le pire coup légal', jamaisLePire)
    verifier('la faute n’est jamais le meilleur coup', jamaisLeMeilleur)
    verifier(
      'la faute tombe dans REGLES_BOT.fauteCible dans la grande majorité des cas',
      dansFenetre >= 16,
      `${dansFenetre}/20`
    )

    // Cas explicite : un seul coup dans la fenêtre, c'est lui.
    const cible = [
      { uci: 'a', cp: 20, rang: 0 },
      { uci: 'b', cp: -80, rang: 1 },
      { uci: 'c', cp: -410, rang: 2 },
      { uci: 'd', cp: -1400, rang: 3 }
    ]
    const r = faute.choisirFaute(cible, { couvreTousLesCoups: true, forcer: true })
    verifier('coup à −410 retenu, pas le −1400', r.choix?.uci === 'c' && r.dansLaFenetre)

    // Sans candidat dans la fenêtre et sans forçage : on repousse au coup suivant.
    const rien = faute.choisirFaute(
      [
        { uci: 'a', cp: 10, rang: 0 },
        { uci: 'b', cp: -20, rang: 1 },
        { uci: 'c', cp: -60, rang: 2 }
      ],
      { couvreTousLesCoups: true, forcer: false }
    )
    verifier('rien dans la fenêtre et pas de forçage → faute repoussée', rien.choix === null)
    verifier(
      'forçage au dernier coup autorisé : un coup est choisi malgré tout',
      faute.choisirFaute(
        [
          { uci: 'a', cp: 10, rang: 0 },
          { uci: 'b', cp: -20, rang: 1 },
          { uci: 'c', cp: -60, rang: 2 }
        ],
        { couvreTousLesCoups: false, forcer: true }
      ).choix !== null
    )
    verifier(
      'fauteAForcer vrai à la fin de la fenêtre, faux avant',
      faute.fauteAForcer(REGLES_BOT.fauteEntreCoups.fin) &&
        !faute.fauteAForcer(REGLES_BOT.fauteEntreCoups.debut)
    )
    verifier(
      'fauteDejaJouee déduite de l’évaluation',
      faute.fauteDejaJouee(-400) && !faute.fauteDejaJouee(-100)
    )
    verifier(
      'doitJouerLaFaute : pas deux fois',
      faute.doitJouerLaFaute(7, 6, false) && !faute.doitJouerLaFaute(7, 6, true)
    )
  }

  // ── 4. garde-fou
  console.log('\n4. garde-fou')
  const gf = await charger('gardeFou.ts')
  {
    verifier(
      'garde-fou inactif avant la faute (évaluation ~0)',
      !gf.gardeFouActif(0) && !gf.gardeFouActif(-50)
    )
    verifier('garde-fou actif après la faute', gf.gardeFouActif(-400))

    // Le joueur donne une pièce au 12ᵉ coup : plusieurs coups font remonter le bot.
    const apresCadeau = [
      { uci: 'gagnant', cp: 500, rang: 0 },
      { uci: 'bon', cp: 120, rang: 1 },
      { uci: 'neutre', cp: -50, rang: 2 },
      { uci: 'sage', cp: -260, rang: 3 },
      { uci: 'mauvais', cp: -700, rang: 4 }
    ]
    const choix = gf.coupSousPlafond(apresCadeau)
    verifier(
      'le bot ne remonte jamais au-dessus du plafond',
      choix.respecte && choix.choix.cp <= REGLES_BOT.plafondGardeFou,
      JSON.stringify(choix.choix)
    )
    verifier(
      'parmi les coups sous le plafond, il joue le meilleur (pas le plus nul)',
      choix.choix.uci === 'sage'
    )

    const toutRemonte = [
      { uci: 'a', cp: 500, rang: 0 },
      { uci: 'b', cp: 300, rang: 1 },
      { uci: 'c', cp: 100, rang: 2 }
    ]
    const repli = gf.coupSousPlafond(toutRemonte)
    verifier(
      'aucun coup sous le plafond → repli sur le moins bon coup disponible',
      !repli.respecte && repli.choix.uci === 'c'
    )
  }

  // ── 5. abandon
  console.log('\n5. abandon')
  const abandonMod = await charger('abandon.ts')
  const storeMod = await serveur.ssrLoadModule('/src/store.ts')
  const useJeu = storeMod.useJeu
  {
    const jouer = (nb) => {
      useJeu.getState().reinitialiser()
      for (let i = 0; i < nb * 2; i++) {
        useJeu.getState().enregistrerCoup({
          ply: i,
          coup: Math.floor(i / 2) + 1,
          camp: i % 2 === 0 ? 'blancs' : 'noirs',
          san: 'x',
          from: 'e2',
          to: 'e4',
          piece: 'p',
          capture: null,
          echec: false,
          mat: false,
          fen: 'bidon'
        })
      }
    }

    // Bug historique 1 : abandon juste après la faute scriptée.
    jouer(8)
    useJeu.getState().setEvalBot(-400)
    verifier(
      'PAS d’abandon juste après la faute (coup 8, éval −400)',
      abandonMod.botDoitAbandonner() === false
    )

    // Bug historique 2 : abandon dès la 13ᵉ énigme.
    jouer(13)
    useJeu.getState().setEvalBot(-1200)
    for (let c = 1; c <= 13; c++) useJeu.getState().resoudreEnigme(c)
    verifier(
      'PAS d’abandon au 13ᵉ coup, même à −1200 (énigmes 14 et 15 préservées)',
      abandonMod.botDoitAbandonner() === false
    )

    jouer(NOMBRE_DE_COUPS - 1)
    useJeu.getState().setEvalBot(-1500)
    verifier(
      `PAS d’abandon au ${NOMBRE_DE_COUPS - 1}ᵉ coup`,
      abandonMod.botDoitAbandonner() === false
    )

    jouer(NOMBRE_DE_COUPS)
    useJeu.getState().setEvalBot(-400)
    verifier(
      `abandon autorisé après le ${NOMBRE_DE_COUPS}ᵉ coup du joueur`,
      abandonMod.botDoitAbandonner() === true
    )

    // Jamais dans une position égale ou gagnante pour le bot.
    useJeu.getState().setEvalBot(0)
    verifier(
      'jamais d’abandon dans une position égale, même au bon moment',
      abandonMod.botDoitAbandonner() === false
    )
    useJeu.getState().setEvalBot(400)
    verifier(
      'jamais d’abandon dans une position gagnante pour le bot',
      abandonMod.botDoitAbandonner() === false &&
        !abandonMod.positionPerduePourLeBot(400)
    )

    useJeu.getState().setEvalBot(-900)
    const diag = abandonMod.diagnosticAbandon()
    verifier(
      'diagnostic cohérent avec le store',
      diag.autorise === true && diag.coupsJoueur === NOMBRE_DE_COUPS && diag.coupsRestants === 0,
      JSON.stringify(diag)
    )
    verifier('objectif tenu à 15 coups', abandonMod.objectifTenu() === true)
    jouer(NOMBRE_DE_COUPS + 3)
    verifier(
      'objectif raté au-delà, sans conséquence sur la partie',
      abandonMod.objectifTenu() === false
    )
    useJeu.getState().reinitialiser()
  }

  // ── 6. moteur : enchaînement complet livre → faute → garde-fou
  console.log('\n6. moteur (partie simulée de bout en bout)')
  {
    // Éventail toujours utilisable : un bon coup, un coup dans la fenêtre de faute,
    // un coup catastrophique. Les coups UCI doivent être légaux dans la position.
    const { Chess } = await import('chess.js')
    installerFauxWorker((multipv) => {
      const chess = new Chess(scenarioFen)
      const legaux = chess.moves({ verbose: true })
      const lignes = []
      const n = Math.min(multipv, legaux.length)
      const cps = [40, -120, -390, -520, -900, -1100]
      for (let i = 0; i < n; i++) {
        const cp = cps[Math.min(i, cps.length - 1)] - i * 5
        lignes.push(
          `info depth 10 multipv ${i + 1} score cp ${cp} pv ${legaux[i].from}${legaux[i].to}`
        )
      }
      lignes.push(`bestmove ${legaux[0].from}${legaux[0].to}`)
      return lignes
    })

    var scenarioFen = new Chess().fen()
    const moteur = await charger('moteur.ts')
    moteur.nouvellePartie(() => 0) // faute au premier coup autorisé
    const chess = new Chess()
    const sans = []
    const coupsJoueur = ['e4', 'Nf3', 'd4', 'Nxd4', 'Nc3', 'Bc4', 'Bf4', 'Qd2', 'O-O-O']
    let evalBot = 0
    let sources = []
    let interroge = null

    for (const [i, sanJoueur] of coupsJoueur.entries()) {
      let joue
      try {
        joue = chess.move(sanJoueur)
      } catch {
        joue = null
      }
      if (!joue) break
      sans.push(joue.san)
      scenarioFen = chess.fen()
      const d = await moteur.demanderCoupBot({
        fen: chess.fen(),
        sansJoues: sans,
        coup: i + 1,
        evalBot
      })
      if (!d) break
      if (d.moteurInterroge && interroge === null) interroge = i + 1
      sources.push(d.source)
      chess.move(d.san)
      sans.push(d.san)
      evalBot = d.cp
    }

    verifier(
      'les 4 premiers coups du bot viennent du livre',
      sources.slice(0, 4).every((s) => s === 'livre'),
      sources.join(' ')
    )
    verifier('le moteur n’est interrogé qu’au 5ᵉ coup', interroge === 5, 'coup ' + interroge)
    verifier(
      'la faute est jouée dès le premier coup autorisé',
      sources[REGLES_BOT.fauteEntreCoups.debut - 1] === 'faute',
      sources.join(' ')
    )
    verifier(
      'après la faute, le garde-fou prend le relais',
      sources.slice(REGLES_BOT.fauteEntreCoups.debut).every((s) => s === 'gardeFou'),
      sources.join(' ')
    )
    verifier(
      'le bot reste sous le plafond du garde-fou',
      evalBot <= REGLES_BOT.plafondGardeFou,
      'éval ' + evalBot
    )
    verifier('aucun coup de secours nécessaire', !sources.includes('secours'))

    // Moteur mort : la partie continue quand même.
    moteur.arreterMoteur()
    globalThis.Worker = class {
      constructor() {
        setTimeout(() => this.onerror?.(new Error('mort')), 0)
      }
      postMessage() {}
      terminate() {}
    }
    const mort = await charger('moteur.ts')
    console.log('  (une erreur de démarrage va s’afficher, c’est le test)')
    const secours = await mort.demanderCoupBot({
      fen: new Chess().fen(),
      sansJoues: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4'],
      coup: 5,
      evalBot: -400
    })
    verifier(
      'moteur mort → coup de secours légal, jamais de blocage',
      secours !== null && secours.source === 'secours',
      JSON.stringify(secours)
    )
  }

  await serveur.close()

  console.log(`\n${ok} vérifications passées, ${echecs.length} échec(s)`)
  for (const e of echecs) console.log('  - ' + e)
  process.exit(echecs.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
