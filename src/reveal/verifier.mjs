/**
 * Vérification des écrans de fin, sans navigateur.
 *
 *   node src/reveal/verifier.mjs
 *
 * ⚠️ Pourquoi ce fichier existe. La fin du jeu a déjà été livrée **cassée une
 * fois** : `src/reveal/` n'existait pas, `App.tsx` n'avait pas de cas
 * `revelation`, et la partie terminée affichait une carte marron vide. Personne
 * ne l'a vu parce qu'atteindre cet écran demande de jouer vingt coups à la main.
 *
 * ⚠️ **Ce que ce fichier peut et ne peut pas vérifier.** Un rendu SSR de React
 * sert l'état **initial** du store : `useSyncExternalStore` appelle
 * `getServerSnapshot`, auquel zustand répond par `getInitialState()`. L'historique
 * arrive donc toujours vide dans le HTML, quoi qu'on ait mis dans le store. Un
 * test qui lit des nombres dans cette sortie mesure zéro et le prend pour un
 * résultat — il a d'abord été écrit comme ça, et il « échouait » sur un composant
 * correct.
 *
 * D'où la séparation :
 *   - les **chiffres** se vérifient sur `statistiquesFin()`, fonction pure ;
 *   - le **rendu** ne répond qu'à la question qui a déjà eu une mauvaise réponse :
 *     est-ce que ça affiche quelque chose, sans lever ?
 *
 * C'est la même leçon que le tampon du moteur : un test doit reproduire ce qui se
 * passe vraiment, pas inventer un contexte plus sévère et se croire plus rigoureux.
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

/** Le store zustand se persiste dans `localStorage`, absent de Node. */
function installerLocalStorage() {
  const memoire = new Map()
  globalThis.localStorage = {
    getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
    setItem: (k, v) => memoire.set(k, String(v)),
    removeItem: (k) => memoire.delete(k),
    clear: () => memoire.clear()
  }
}

/**
 * Un historique de partie terminée.
 *
 * Les coups n'ont pas besoin d'être légaux entre eux : seuls le camp, la capture,
 * le mat et le dernier coup sont lus. `mat` coupe l'historique après le coup du
 * joueur, parce qu'un mat ne laisse pas l'adversaire répondre — c'est ce détail
 * qui avait fait passer un faux échec la première fois.
 */
function historiqueDe(coups, { mat = false, prisesJoueurTous = 4, prisesBotTous = 6 } = {}) {
  const h = []
  for (let coup = 1; coup <= coups; coup++) {
    h.push({
      ply: (coup - 1) * 2,
      coup,
      camp: 'blancs',
      san: 'e4',
      from: 'e2',
      to: 'e4',
      piece: 'p',
      capture: coup % prisesJoueurTous === 0 ? 'p' : null,
      echec: false,
      mat: mat && coup === coups,
      fen: ''
    })
    if (mat && coup === coups) break
    h.push({
      ply: (coup - 1) * 2 + 1,
      coup,
      camp: 'noirs',
      san: 'e5',
      from: 'e7',
      to: 'e5',
      piece: 'p',
      capture: coup % prisesBotTous === 0 ? 'p' : null,
      echec: false,
      mat: false,
      fen: ''
    })
  }
  return h
}

/** Une progression d'énigmes : `avecIndice` premiers slots aidés, `passees` derniers passés. */
function progressionDe(total, { avecIndice = 0, passees = 0 } = {}) {
  const p = {}
  for (let coup = 1; coup <= total; coup++) {
    const passee = coup > total - passees
    p[coup] = {
      resolue: !passee,
      echecs: coup <= avecIndice ? 2 : 0,
      indicesReveles: coup <= avecIndice ? 1 : 0,
      passee
    }
  }
  return p
}

/** Position réelle après 1.e4 e5 : le plateau doit parser un vrai FEN. */
const FEN_TEST = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'

/**
 * `react` et `react-dom` sont **externalisés**. Chargés par le runner de Vite ils
 * forment une seconde instance de React : les composants appellent alors des hooks
 * d'un React que le moteur de rendu ne connaît pas, et tout casse sur un message
 * sans rapport.
 */
const serveur = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  ssr: { external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'] }
})

try {
  installerLocalStorage()

  const { renderToStaticMarkup } = await import('react-dom/server')
  const React = (await import('react')).default
  const { useJeu } = await serveur.ssrLoadModule('/src/store.ts')
  const { FinDePartie, statistiquesFin } = await serveur.ssrLoadModule(
    '/src/reveal/FinDePartie.tsx'
  )
  const { Revelation, AGE, DATE_CADEAU } = await serveur.ssrLoadModule(
    '/src/reveal/Revelation.tsx'
  )
  const { partJoueur } = await serveur.ssrLoadModule('/src/reveal/BarreAvantage.tsx')
  const { NOMBRE_DE_COUPS, REGLES_BOT } = await serveur.ssrLoadModule('/src/types.ts')

  const rendre = (composant, props = {}) =>
    renderToStaticMarkup(React.createElement(composant, props))

  // ────────────────────────────── 1. les chiffres, sur la fonction pure

  console.log('\nStatistiques de fin')

  const s1 = statistiquesFin(historiqueDe(20), progressionDe(20, { avecIndice: 7, passees: 3 }))
  verifier('20 coups du joueur comptés', s1.coups === 20, String(s1.coups))
  // Un coup sur 4 pour le joueur : 4, 8, 12, 16, 20.
  verifier('prises du joueur = 5', s1.prisesJoueur === 5, String(s1.prisesJoueur))
  // Un sur 6 pour le bot : 6, 12, 18.
  verifier('prises du bot = 3', s1.prisesBot === 3, String(s1.prisesBot))
  verifier('3 énigmes passées', s1.passees === 3, String(s1.passees))
  verifier('17 énigmes résolues', s1.resolues === 17, String(s1.resolues))
  // Les 7 premiers slots ont un indice ; les 3 passés sont les derniers, donc les
  // résolues sans indice sont les slots 8 à 17.
  verifier('10 énigmes sans indice', s1.sansIndice === 10, String(s1.sansIndice))
  verifier('pas de mat', s1.parMat === false)
  verifier('dernier coup = celui du bot', s1.dernier?.camp === 'noirs')

  const s2 = statistiquesFin(historiqueDe(14, { mat: true }), progressionDe(14))
  verifier('mat détecté', s2.parMat === true)
  verifier('mat : dernier coup = celui du joueur', s2.dernier?.camp === 'blancs')
  verifier('mat : 14 coups', s2.coups === 14, String(s2.coups))
  verifier('mat : 0 énigme passée', s2.passees === 0)

  const s3 = statistiquesFin([], {})
  verifier('historique vide ne lève pas', s3.coups === 0 && s3.dernier === null)
  verifier('historique vide : pas de mat', s3.parMat === false)

  // Une énigme jamais atteinte n'est pas « passée » : le compte doit distinguer
  // `passee` de `!resolue`, sinon le score annonce des abandons qui n'ont pas eu lieu.
  const s4 = statistiquesFin(historiqueDe(5), {
    1: { resolue: true, echecs: 0, indicesReveles: 0, passee: false },
    2: { resolue: false, echecs: 0, indicesReveles: 0, passee: false }
  })
  verifier('énigme en cours ≠ énigme passée', s4.passees === 0, String(s4.passees))

  // ────────────────────────────── 2. la barre penche du bon côté

  console.log("\nBarre d'avantage")
  verifier('0 centipion = 50 %', Math.abs(partJoueur(0) - 0.5) < 1e-9)
  verifier('joueur devant → plus de la moitié', partJoueur(-400) > 0.7)
  verifier('bot devant → moins de la moitié', partJoueur(400) < 0.3)
  verifier('monotone', partJoueur(-800) > partJoueur(-400) && partJoueur(-400) > partJoueur(0))
  verifier('bornée', partJoueur(-99999) < 1 && partJoueur(99999) > 0)

  // ────────────────────────────── 3. les trois issues et leur titre

  console.log('\nIssues')
  const ISSUES = [
    { nom: 'victoire', evalBot: -REGLES_BOT.seuilAvantage - 1, titre: 'Tu as gagné' },
    { nom: 'nulle', evalBot: 0, titre: 'Match nul' },
    { nom: 'defaite', evalBot: REGLES_BOT.seuilAvantage + 1, titre: 'Il a gagné' }
  ]

  for (const cas of ISSUES) {
    useJeu.setState({
      phase: 'revelation',
      fen: FEN_TEST,
      historique: historiqueDe(NOMBRE_DE_COUPS),
      evalBot: cas.evalBot,
      progression: progressionDe(NOMBRE_DE_COUPS)
    })
    verifier(`${cas.nom} : issue() concorde`, useJeu.getState().issue() === cas.nom)

    // `issue()` est une closure sur `get()`, donc elle traverse le rendu SSR : c'est
    // la seule valeur du store dont on puisse vérifier l'effet dans le HTML.
    const html = rendre(FinDePartie, { onSuite: () => {} })
    verifier(`${cas.nom} : le titre s'affiche`, html.includes(cas.titre))
    verifier(
      `${cas.nom} : la position finale est rendue`,
      html.includes('<svg') && html.split('<rect').length > 60,
      `${html.split('<rect').length - 1} rectangles`
    )
    verifier(`${cas.nom} : rien n'est vide`, html.length > 2000, `${html.length} caractères`)
  }

  // ────────────────────────────── 4. l'enchaînement des écrans

  console.log('\nEnchaînement')
  useJeu.setState({ evalBot: -400 })
  const htmlRev = rendre(Revelation)
  verifier(
    "Revelation entre par l'écran de partie, pas par l'âge",
    htmlRev.includes('Tu as gagné') && !htmlRev.includes(`>${AGE}<`)
  )
  verifier('AGE vaut 17', AGE === 17)
  verifier(
    'le cadeau est daté du 10 octobre 2026',
    DATE_CADEAU.getFullYear() === 2026 &&
      DATE_CADEAU.getMonth() === 9 &&
      DATE_CADEAU.getDate() === 10,
    DATE_CADEAU.toISOString()
  )
} finally {
  await serveur.close()
}

console.log(`\n${ok} vérifications passées, ${echecs.length} échec(s)`)
if (echecs.length > 0) {
  for (const e of echecs) console.log(`  - ${e}`)
  process.exit(1)
}
