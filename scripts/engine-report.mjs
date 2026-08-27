// Transforme data/engine-moves.json en rapport lisible : où Paul se trompe.
// Écrit data/profil-erreurs.md.
import { readFile, writeFile } from 'node:fs/promises'

const moves = JSON.parse(await readFile('data/engine-moves.json', 'utf8'))
const games = JSON.parse(await readFile('data/games.json', 'utf8'))
const byGame = new Map(games.map((g) => [g.id, g]))

const out = []
const say = (s = '') => out.push(s)
const moy = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const pct = (n, t) => (t ? Math.round((100 * n) / t) : 0)
const med = (a) => {
  const s = [...a].sort((x, y) => x - y)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

function table (headers, rows) {
  say('| ' + headers.join(' | ') + ' |')
  say('|' + headers.map(() => '---').join('|') + '|')
  for (const r of rows) say('| ' + r.join(' | ') + ' |')
  say()
}

const gaffes = moves.filter((m) => m.classe === 'gaffe')
const erreurs = moves.filter((m) => m.classe === 'erreur')
const impr = moves.filter((m) => m.classe === 'imprécision')

say('# Profil d\'erreurs de Paul-Erwan')
say()
say('Analyse Stockfish 18, profondeur 16, sur ses ' +
  new Set(moves.map((m) => m.id)).size +
  ' parties de la période fiable (mai→août 2026, classement en ligne ≥ 1450).')
say()
say('**Comment lire les chiffres.** L\'unité est le *centième de pion* : 100 = la valeur')
say('d\'un pion entier, 300 = la valeur d\'un fou ou d\'un cavalier. Quand on dit qu\'un coup')
say('« coûte 250 », ça veut dire qu\'après ce coup sa position vaut deux pions et demi de')
say('moins qu\'avec le meilleur coup disponible.')
say()
say('- **imprécision** : coûte 50 à 100 (un demi-pion à un pion)')
say('- **erreur** : coûte 100 à 300 (un à trois pions)')
say('- **gaffe** : coûte 300 ou plus (une pièce entière ou davantage)')
say()

// ── vue d'ensemble
say('## 1. Sa moyenne')
say()
const pertes = moves.map((m) => m.loss)
say('**Perte moyenne par coup : ' + moy(pertes).toFixed(0) + '** (médiane ' + med(pertes) + ')')
say()
table(['Catégorie', 'Nombre de coups', 'Part de ses coups'], [
  ['Coups corrects (coûtent < 50)', moves.length - impr.length - erreurs.length - gaffes.length,
    pct(moves.length - impr.length - erreurs.length - gaffes.length, moves.length) + ' %'],
  ['Imprécisions (50-100)', impr.length, pct(impr.length, moves.length) + ' %'],
  ['Erreurs (100-300)', erreurs.length, pct(erreurs.length, moves.length) + ' %'],
  ['**Gaffes (300+)**', '**' + gaffes.length + '**', '**' + pct(gaffes.length, moves.length) + ' %**']
])
say('Il joue ' + moves.length + ' coups au total, dont ' + (erreurs.length + gaffes.length) +
  ' lui coûtent au moins un pion. Soit **une erreur sérieuse tous les ' +
  Math.round(moves.length / (erreurs.length + gaffes.length)) + ' coups**.')
say()

// ── par phase : LE point clé
say('## 2. À quel moment de la partie il se trompe')
say()
say('C\'est la donnée qui compte pour régler un adversaire informatique.')
say()
const phases = ['ouverture (1-10)', 'milieu (11-25)', 'fin de milieu (26-40)', 'finale (41+)']
table(['Moment', 'Coups joués', 'Perte moyenne', 'Gaffes', 'Taux de gaffe'],
  phases.map((p) => {
    const s = moves.filter((m) => m.phase === p)
    const g = s.filter((m) => m.classe === 'gaffe')
    return [p, s.length, moy(s.map((m) => m.loss)).toFixed(0), g.length,
      pct(g.length, s.length) + ' %']
  }))

const parPhase = phases.map((p) => {
  const s = moves.filter((m) => m.phase === p)
  return { p, n: s.length, m: moy(s.map((x) => x.loss)), g: pct(s.filter((x) => x.classe === 'gaffe').length, s.length) }
}).filter((x) => x.n >= 20)
const pire = parPhase.reduce((a, b) => (b.m > a.m ? b : a))
const meilleur = parPhase.reduce((a, b) => (b.m < a.m ? b : a))
say('**Il est le plus solide en ' + meilleur.p + '** (perte moyenne ' + meilleur.m.toFixed(0) +
  ') et **le plus fragile en ' + pire.p + '** (perte moyenne ' + pire.m.toFixed(0) +
  ', ' + pire.g + ' % de gaffes).')
say()

// ── par tranche de 5 coups
say('### Détail par tranche de 5 coups')
say()
const tranches = []
for (let d = 1; d <= 60; d += 5) {
  const s = moves.filter((m) => m.coup >= d && m.coup < d + 5)
  if (s.length < 10) continue
  tranches.push([d + '-' + (d + 4), s.length, moy(s.map((m) => m.loss)).toFixed(0),
    pct(s.filter((m) => m.classe === 'gaffe').length, s.length) + ' %'])
}
table(['Coups', 'n', 'Perte moyenne', 'Taux de gaffe'], tranches)

// ── victoires vs défaites
say('## 3. Ses parties gagnées contre ses parties perdues')
say()
table(['Issue', 'Coups', 'Perte moyenne', 'Taux de gaffe'], [
  ['Parties gagnées', count('won', true), moy(sel('won', true).map((m) => m.loss)).toFixed(0),
    pct(sel('won', true).filter((m) => m.classe === 'gaffe').length, count('won', true)) + ' %'],
  ['Parties non gagnées', count('won', false), moy(sel('won', false).map((m) => m.loss)).toFixed(0),
    pct(sel('won', false).filter((m) => m.classe === 'gaffe').length, count('won', false)) + ' %']
])
function sel (k, v) { return moves.filter((m) => m[k] === v) }
function count (k, v) { return sel(k, v).length }

say('## 4. Cadence')
say()
say('Le filtre de fiabilite (classement >= 1450) ne retient que des parties en **rapide** :')
say('son meilleur classement blitz est 1110, jamais atteint le seuil. Aucune comparaison')
say('rapide/blitz possible sur la periode fiable.')
say()
say()
table(['Cadence', 'Coups', 'Perte moyenne', 'Taux de gaffe'],
  ['rapid', 'blitz'].map((tc) => {
    const s = moves.filter((m) => m.timeClass === tc)
    return [tc, s.length, moy(s.map((m) => m.loss)).toFixed(0),
      pct(s.filter((m) => m.classe === 'gaffe').length, s.length) + ' %']
  }).filter((r) => r[1] > 0))

// ── ses pires coups
say('## 5. Ses 15 pires coups')
say()
table(['Partie', 'Coup n°', 'Il a joué', 'Le moteur voulait', 'Coût', 'Date'],
  gaffes.sort((a, b) => b.loss - a.loss).slice(0, 15).map((m) => {
    const g = byGame.get(m.id)
    return ['`' + m.id + '`', m.coup, '`' + m.san + '`', '`' + (m.meilleur ?? '?') + '`',
      m.loss >= 1500 ? 'position perdue' : m.loss, g?.date ?? '?']
  }))

// ── ses parties les plus propres
say('## 6. Ses parties les mieux jouées selon le moteur')
say()
const parPartie = [...new Set(moves.map((m) => m.id))].map((id) => {
  const s = moves.filter((m) => m.id === id)
  const g = byGame.get(id)
  return {
    id,
    date: g?.date,
    coups: g?.moveCount,
    oppElo: g?.oppElo,
    won: g?.won,
    perte: moy(s.map((m) => m.loss)),
    gaffes: s.filter((m) => m.classe === 'gaffe').length,
    erreurs: s.filter((m) => m.classe === 'erreur').length
  }
}).sort((a, b) => a.perte - b.perte)

say('Parmi ses **victoires** contre un adversaire de son niveau (≥ 1400) :')
say()
table(['Partie', 'Date', 'Coups', 'Adversaire', 'Perte moyenne', 'Gaffes', 'Erreurs'],
  parPartie.filter((p) => p.won && (p.oppElo ?? 0) >= 1400).slice(0, 10)
    .map((p) => ['`' + p.id + '`', p.date, p.coups, p.oppElo, p.perte.toFixed(0),
      p.gaffes, p.erreurs]))

await writeFile('data/profil-erreurs.md', out.join('\n') + '\n')
console.log(out.join('\n'))
