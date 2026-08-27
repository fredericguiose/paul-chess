// Analyse le corpus de parties et produit data/analysis.md.
// Aucun moteur d'échecs : tout est dérivé des en-têtes PGN, de la notation SAN
// et du champ `accuracies` que l'API publique Chess.com fournit gratuitement.
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const USER = 'pedagopaul'
const games = JSON.parse(await readFile('data/games.json', 'utf8'))
const profile = JSON.parse(await readFile('data/profile.json', 'utf8'))

// Le champ accuracies et les tournois ne sont que dans les archives brutes.
const extra = new Map()
for (const f of await readdir('data/raw')) {
  const data = JSON.parse(await readFile(join('data/raw', f), 'utf8'))
  for (const g of data.games) {
    const side = g.white.username.toLowerCase() === USER ? 'white' : 'black'
    extra.set(g.url.split('/').pop(), {
      accuracy: g.accuracies?.[side] ?? null,
      oppAccuracy: g.accuracies?.[side === 'white' ? 'black' : 'white'] ?? null,
      tournament: g.tournament ?? null
    })
  }
}
for (const g of games) Object.assign(g, extra.get(g.id) ?? {})

const out = []
const say = (s = '') => out.push(s)
const pct = (n, total) => (total ? Math.round((100 * n) / total) : 0)
const count = (arr, fn) => arr.filter(fn).length
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)

const DRAWS = ['agreed', 'repetition', 'stalemate', 'insufficient', 'timevsinsufficient', '50move']
const isDraw = (g) => DRAWS.includes(g.result)
const isLoss = (g) => !g.won && !isDraw(g)

function tally (arr, key) {
  const m = new Map()
  for (const x of arr) {
    const k = key(x)
    if (k == null) continue
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

function table (headers, rows) {
  say('| ' + headers.join(' | ') + ' |')
  say('|' + headers.map(() => '---').join('|') + '|')
  for (const r of rows) say('| ' + r.join(' | ') + ' |')
  say()
}

/** Sépare les coups SAN entre les siens et ceux de l'adversaire. */
function sanMoves (g) {
  const toks = g.moves
    .split(' ')
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
  const mine = []
  const theirs = []
  toks.forEach((t, i) => {
    const isWhiteMove = i % 2 === 0
    if ((g.side === 'white') === isWhiteMove) mine.push(t)
    else theirs.push(t)
  })
  return { mine, theirs, all: toks }
}

const whites = games.filter((g) => g.side === 'white')
const blacks = games.filter((g) => g.side === 'black')
const wins = count(games, (g) => g.won)
const draws = count(games, isDraw)
const losses = games.length - wins - draws

// ── en-tête ────────────────────────────────────────────────────────────────
say('# Analyse du corpus — ' + profile.username + ' (' + (profile.name ?? '?') + ')')
say()
say(games.length + ' parties · ' + games[0].date + ' → ' + games.at(-1).date +
  ' · profil `' + profile.status + '` · pays `' + profile.country.split('/').pop() + '`')
say()
say('> Source : API publique Chess.com (lecture seule, sans authentification).')
say('> Aucun moteur d\'échecs utilisé — tout est dérivé des en-têtes PGN, de la notation')
say('> SAN, et du champ `accuracies` que Chess.com expose gratuitement sur une partie')
say('> des parties. Les jugements coup par coup exigeraient Stockfish.')
say()
say('**Ce corpus ne contient aucune partie officielle de Guyane.** Les 534 parties sont')
say('des parties en ligne ; les parties « de tournoi » présentes sont des arènes')
say('publiques mondiales Chess.com (`creator: CHESScom`), pas des événements de la ligue.')
say('Le champ `match` (matchs par équipes de club) est absent partout.')
say()

// ── 1. vue d'ensemble ──────────────────────────────────────────────────────
say('## 1. Vue d\'ensemble')
say()
say('**' + wins + 'V – ' + losses + 'D – ' + draws + 'N** → **' + pct(wins, games.length) +
  ' % de victoires** sur ' + games.length + ' parties.')
say()
table(['Cadence', 'n', 'V', 'D', 'N', '% V', 'Elo moyen', 'Elo max'],
  tally(games, (g) => g.timeClass).map(([tc, n]) => {
    const sub = games.filter((g) => g.timeClass === tc)
    const elos = sub.map((g) => g.myElo).filter(Boolean)
    return [tc, n, count(sub, (g) => g.won), count(sub, isLoss), count(sub, isDraw),
      pct(count(sub, (g) => g.won), n), Math.round(avg(elos)), Math.max(...elos)]
  }))

say('### Comment ses parties se terminent')
say()
table(['Issue', 'n', '%'], tally(games, (g) => g.result)
  .map(([r, n]) => [r, n, pct(n, games.length) + ' %']))

const myMates = count(games, (g) => g.won && /checkmate/i.test(g.termination ?? ''))
const myTimeouts = count(games, (g) => g.result === 'timeout')
say('Il **mate** dans ' + myMates + ' de ses ' + wins + ' victoires (' + pct(myMates, wins) +
  ' %) : il joue pour le mat, il ne se contente pas d\'une position gagnante.')
say('Il perd ' + myTimeouts + ' parties au temps, soit ' + pct(myTimeouts, losses) +
  ' % de ses défaites.')
say()

// ── 2. activité ────────────────────────────────────────────────────────────
say('## 2. Activité dans le temps')
say()
const byMonth = tally(games, (g) => (g.date ?? '').slice(0, 7))
  .sort((a, b) => a[0].localeCompare(b[0]))
table(['Mois', 'n', '% V', 'Elo rapide fin de mois'], byMonth.map(([mo, n]) => {
  const sub = games.filter((g) => (g.date ?? '').startsWith(mo))
  const rapid = sub.filter((g) => g.timeClass === 'rapid')
  return [mo, n, pct(count(sub, (g) => g.won), n), rapid.length ? rapid.at(-1).myElo : '—']
}))
const peak = byMonth.reduce((a, b) => (b[1] > a[1] ? b : a))
say('Pic : **' + peak[0] + ', ' + peak[1] + ' parties**. Amplitude de 1 à ' + peak[1] +
  ' parties/mois → il joue **en rafales**, pas quotidiennement.')
say()
const byHour = tally(games, (g) => (g.time ?? '').slice(0, 2))
  .sort((a, b) => a[0].localeCompare(b[0]))
say('Heures de jeu (UTC ; Guyane = UTC−3) : ' +
  byHour.map(([h, n]) => h + 'h→' + n).join(' · '))
say()

// ── 3. ouvertures ──────────────────────────────────────────────────────────
say('## 3. Répertoire d\'ouvertures')
say()
for (const [side, label, sub] of [['white', 'Blancs', whites], ['black', 'Noirs', blacks]]) {
  say('### ' + label + ' — ' + sub.length + ' parties, ' +
    pct(count(sub, (g) => g.won), sub.length) + ' % V')
  say()
  table(['ECO', 'n', '% du répertoire', 'V', '% V', 'Nom'],
    tally(sub, (g) => g.eco).filter(([, n]) => n >= 6).slice(0, 10).map(([eco, n]) => {
      const s = sub.filter((g) => g.eco === eco)
      const name = tally(s, (g) => g.ecoName)[0][0].replace(/-/g, ' ').slice(0, 44)
      return [eco, n, pct(n, sub.length) + ' %', count(s, (g) => g.won),
        pct(count(s, (g) => g.won), n) + ' %', name]
    }))
}

say('### Premier coup')
say()
table(['Camp', 'Coup', 'n', '%'], [
  ...tally(whites, (g) => sanMoves(g).mine[0]).slice(0, 4)
    .map(([m, n]) => ['Blancs', '`' + m + '`', n, pct(n, whites.length) + ' %']),
  ...tally(blacks, (g) => sanMoves(g).mine[0]).slice(0, 4)
    .map(([m, n]) => ['Noirs (réponse)', '`' + m + '`', n, pct(n, blacks.length) + ' %'])
])

const SCOTCH = ['C44', 'C45', 'C47']
const scotch = count(whites, (g) => SCOTCH.includes(g.eco))
const scotchGames = whites.filter((g) => SCOTCH.includes(g.eco))
const sicilian = count(blacks, (g) => /^B[2-9]/.test(g.eco ?? ''))
say('**Deux signatures massives :**')
say()
say('- Blancs : **Écossaise (C44/C45/C47) — ' + scotch + ' parties sur ' + whites.length +
  ', soit ' + pct(scotch, whites.length) + ' %**, ' +
  pct(count(scotchGames, (g) => g.won), scotch) + ' % de victoires')
say('- Noirs : **Sicilienne (B2x–B9x) — ' + sicilian + ' parties sur ' + blacks.length +
  ', soit ' + pct(sicilian, blacks.length) + ' %**')
say()

// ── 4. style ───────────────────────────────────────────────────────────────
say('## 4. Marqueurs de style')
say()
const withMoves = games.filter((g) => g.moves)
const marker = (label, fn) => {
  const sub = withMoves.filter(fn)
  return [label, sub.length, pct(sub.length, withMoves.length) + ' %',
    pct(count(sub, (g) => g.won), sub.length) + ' %']
}
table(['Marqueur', 'n', '% des parties', '% V quand présent'], [
  marker('Petit roque (O-O)', (g) => sanMoves(g).mine.includes('O-O')),
  marker('Grand roque (O-O-O)', (g) => sanMoves(g).mine.includes('O-O-O')),
  marker('Jamais roqué', (g) => !sanMoves(g).mine.some((m) => m.startsWith('O-O'))),
  marker('Dame sortie avant le coup 8', (g) => sanMoves(g).mine.slice(0, 7).some((m) => m.startsWith('Q'))),
  marker('Frappe en f7 / f2', (g) => sanMoves(g).mine.some((m) => /x(f7|f2)/.test(m))),
  marker('Frappe sur le roque (g7/h7/g2/h2)', (g) => sanMoves(g).mine.some((m) => /x(g7|h7|g2|h2)/.test(m))),
  marker('Promotion', (g) => sanMoves(g).mine.some((m) => m.includes('=')))
])

const lens = withMoves.map((g) => g.moveCount).sort((a, b) => a - b)
say('Longueur : médiane **' + lens[Math.floor(lens.length / 2)] + ' coups** (min ' +
  lens[0] + ', max ' + lens.at(-1) + ').')
say('Ses victoires : **' + Math.round(avg(withMoves.filter((g) => g.won).map((g) => g.moveCount))) +
  ' coups en moyenne** · ses défaites : ' +
  Math.round(avg(withMoves.filter(isLoss).map((g) => g.moveCount))) + '.')
say()

// ── 5. précision (accuracies) ──────────────────────────────────────────────
say('## 5. Précision de jeu (champ `accuracies`, gratuit)')
say()
const acc = games.filter((g) => g.accuracy != null)
say('Disponible sur **' + acc.length + ' parties sur ' + games.length + '** (' +
  pct(acc.length, games.length) + ' %). C\'est le score global du Game Review que ' +
  'Chess.com facture coup par coup mais expose en agrégat.')
say()
table(['Segment', 'n', 'Précision moyenne'], [
  ['Toutes', acc.length, avg(acc.map((g) => g.accuracy)).toFixed(1) + ' %'],
  ['Victoires', count(acc, (g) => g.won), avg(acc.filter((g) => g.won).map((g) => g.accuracy)).toFixed(1) + ' %'],
  ['Défaites', count(acc, isLoss), avg(acc.filter(isLoss).map((g) => g.accuracy)).toFixed(1) + ' %'],
  ['Rapide', count(acc, (g) => g.timeClass === 'rapid'), avg(acc.filter((g) => g.timeClass === 'rapid').map((g) => g.accuracy)).toFixed(1) + ' %'],
  ['Blitz', count(acc, (g) => g.timeClass === 'blitz'), avg(acc.filter((g) => g.timeClass === 'blitz').map((g) => g.accuracy)).toFixed(1) + ' %'],
  ['À l\'Écossaise', count(acc, (g) => SCOTCH.includes(g.eco)), avg(acc.filter((g) => SCOTCH.includes(g.eco)).map((g) => g.accuracy)).toFixed(1) + ' %']
])
say('### Ses 10 parties les mieux jouées (gagnées, adversaire ≥ 1200)')
say()
say('Filtre sur l\'Elo adverse : une précision de 100 % contre un joueur à 450 traduit une')
say('partie courte et forcée, pas une performance.')
say()
table(['Précision', 'Adv.', 'Cadence', 'Camp', 'Coups', 'Adversaire', 'ECO', 'ID'],
  acc.filter((g) => g.won && (g.oppElo ?? 0) >= 1200)
    .sort((a, b) => b.accuracy - a.accuracy).slice(0, 10)
    .map((g) => [g.accuracy.toFixed(1) + ' %', (g.oppAccuracy ?? 0).toFixed(1) + ' %',
      g.timeClass, g.side === 'white' ? 'B' : 'N', g.moveCount,
      g.opponent + ' (' + g.oppElo + ')', g.eco, '`' + g.id + '`']))

// ── 6. adversaires ─────────────────────────────────────────────────────────
say('## 6. Adversaires')
say()
const oppTally = tally(games, (g) => g.opponent).filter(([, n]) => n >= 4)
say('**' + tally(games, (g) => g.opponent).length + ' adversaires distincts.** Ceux qu\'il a affrontés 4 fois ou plus :')
say()
table(['Adversaire', 'Parties', 'V', 'D', 'Elo max affronté'],
  oppTally.slice(0, 12).map(([o, n]) => {
    const s = games.filter((g) => g.opponent === o)
    return [o, n, count(s, (g) => g.won), count(s, isLoss),
      Math.max(...s.map((g) => g.oppElo ?? 0))]
  }))

const upsets = games
  .filter((g) => g.won && g.oppElo && g.myElo && g.oppElo - g.myElo >= 100)
  .sort((a, b) => (b.oppElo - b.myElo) - (a.oppElo - a.myElo))
say('**' + upsets.length + ' victoires contre un adversaire coté 100 points ou plus au-dessus de lui.** Top 6 :')
say()
table(['Date', 'Cadence', 'Lui', 'Adversaire', 'Écart', 'Coups', 'ID'],
  upsets.slice(0, 6).map((g) => [g.date, g.timeClass, g.myElo,
    g.opponent + ' (' + g.oppElo + ')', '+' + (g.oppElo - g.myElo), g.moveCount, '`' + g.id + '`']))

const strong = games.filter((g) => g.oppElo && g.myElo && g.oppElo > g.myElo)
const weak = games.filter((g) => g.oppElo && g.myElo && g.oppElo < g.myElo)
say('Contre plus fort : **' + pct(count(strong, (g) => g.won), strong.length) + ' % V** (n=' +
  strong.length + ') · contre plus faible : **' + pct(count(weak, (g) => g.won), weak.length) +
  ' % V** (n=' + weak.length + ')')
say()

// ── 7. candidates pour le script ───────────────────────────────────────────
say('## 7. Parties candidates pour le script du jeu')
say()
say('Critères : **il gagne**, **par mat**, entre 12 et 30 coups. Le score privilégie le')
say('sacrifice, la brièveté, la force de l\'adversaire et la précision mesurée.')
say()
const cands = games
  .filter((g) => g.won && /checkmate/i.test(g.termination ?? '') &&
    g.moveCount >= 12 && g.moveCount <= 30)
  .map((g) => {
    const { mine } = sanMoves(g)
    const sac = mine.some((m) => /x(f7|f2|h7|h2|g7|g2)/.test(m))
    const promo = mine.some((m) => m.includes('='))
    const score = (sac ? 30 : 0) + (promo ? 10 : 0) +
      Math.max(0, 30 - g.moveCount) +
      Math.round((g.oppElo ?? 0) / 100) +
      (g.timeClass === 'rapid' ? 10 : 0) +
      (g.accuracy ? Math.round(g.accuracy / 5) : 0)
    return { ...g, sac, promo, score }
  })
  .sort((a, b) => b.score - a.score)

say('**' + cands.length + ' parties remplissent les critères.** Top 15 par score :')
say()
table(['#', 'Date', 'Cadence', 'Camp', 'Coups', 'Lui', 'Adversaire', 'ECO', 'Sacr.', 'Précision', 'Score', 'ID'],
  cands.slice(0, 15).map((g, i) => [i + 1, g.date, g.timeClass, g.side === 'white' ? 'B' : 'N',
    g.moveCount, g.myElo, g.opponent + ' (' + g.oppElo + ')', g.eco,
    g.sac ? 'oui' : '—', g.accuracy ? g.accuracy.toFixed(0) + ' %' : '—',
    g.score, '`' + g.id + '`']))

say('### Les 3 meilleures, en détail')
say()
for (const g of cands.slice(0, 3)) {
  say('#### `' + g.id + '` — ' + g.date + ', ' + g.moveCount + ' coups')
  say()
  say('- ' + (g.side === 'white' ? 'Blancs' : 'Noirs') + ' · ' + g.timeClass +
    ' · lui ' + g.myElo + ' vs ' + g.opponent + ' ' + g.oppElo)
  say('- ' + (g.ecoName ?? '').replace(/-/g, ' ') + ' (`' + g.eco + '`)')
  say('- ' + g.termination + (g.accuracy ? ' · précision ' + g.accuracy.toFixed(1) + ' %' : ''))
  say('- ' + g.url)
  say()
  say('```')
  say(g.moves)
  say('```')
  say()
}

// ── 8. matériau d'énigmes ──────────────────────────────────────────────────
say('## 8. Matériau d\'énigmes vérifiable')
say()
say('Chiffres exacts extraits du corpus. La colonne de droite applique la règle : **une')
say('réponse doit être un fait dont *il* est certain, pas un fait vrai.**')
say()
const rapidMax = Math.max(...games.filter((g) => g.timeClass === 'rapid').map((g) => g.myElo))
table(['Fait', 'Valeur', 'Utilisable ?'], [
  ['Ouverture-signature aux blancs', 'Écossaise — ' + pct(scotch, whites.length) + ' % de ses parties blanches', '**oui** — identitaire'],
  ['Défense-signature aux noirs', 'Sicilienne — ' + pct(sicilian, blacks.length) + ' %', '**oui** — identitaire'],
  ['Club', 'Kayen Echec Club (Cayenne)', '**oui**'],
  ['Rôle en sélection', 'capitaine de la sélection de Guyane', '**oui**'],
  ['Pic Elo FFE', '2100 (déclaré sans hésiter)', '**oui**'],
  ['Titre de la saison', 'vice-champion académique', '**oui**'],
  ['Classement U20 Guyane', 'n°1 en Elo', '**oui**'],
  ['Adversaire le plus affronté', oppTally.length ? oppTally[0][0] + ' (' + oppTally[0][1] + ' parties)' : '—', 'oui **si** c\'est un proche'],
  ['Parties jouées sur Chess.com', games.length, 'à confirmer avec lui'],
  ['Meilleur Elo rapide Chess.com', rapidMax, 'moyen — il consulte peu'],
  ['Elo FFE actuel', '~1900', '**non** — « j\'ai pas vérifié mon dernier classement »'],
  ['% de victoires à l\'Écossaise', pct(count(scotchGames, (g) => g.won), scotch) + ' %', '**non** — personne ne connaît ce chiffre sur soi'],
  ['Victoires par mat', myMates, '**non**']
])
say('Ses propres mots à conserver : « le Elo FFE est pas comme le FIDE », « les classements')
say('nationaux sont plus volatils que les classements internationaux », « en Guyane on est')
say('pas hyper nombreux et on joue essentiellement entre nous ». → **Ne jamais bâtir une')
say('énigme sur son classement courant.**')
say()

await writeFile('data/analysis.md', out.join('\n') + '\n')
console.log('data/analysis.md écrit — ' + out.length + ' lignes')
