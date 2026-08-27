// Profil d'erreurs : fait tourner Stockfish sur les parties de Paul et mesure,
// coup par coup, combien il perd par rapport au meilleur coup disponible.
//
// Principe : on évalue CHAQUE position de la partie une seule fois. Le score est
// toujours donné du point de vue du joueur qui doit jouer. Si eval(i) est le score
// avant son coup et eval(i+1) le score après (donc du point de vue adverse), sa
// perte vaut eval(i) - (-eval(i+1)). Une position évaluée = une perte calculée,
// donc deux fois moins de calcul qu'une analyse naïve.
//
// Usage : node scripts/engine-profile.mjs [depth] [nbParties] [instances]

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { Chess } from 'chess.js'

const DEPTH = Number(process.argv[2] ?? 16)
const LIMIT = Number(process.argv[3] ?? 0) // 0 = toutes
const WORKERS = Number(process.argv[4] ?? 8)
const THREADS_PER_WORKER = 1
const SF = 'tools/stockfish/stockfish-windows-x86-64-bmi2.exe'

// Un mat vaut mieux que n'importe quel avantage matériel, mais il faut le borner
// sinon la moindre erreur dans une position gagnée pèse des milliers de points.
const CLAMP = 1500

/** Une instance Stockfish pilotée en UCI. */
class Engine {
  constructor () {
    this.proc = spawn(SF, [], { stdio: ['pipe', 'pipe', 'ignore'] })
    this.buffer = ''
    this.waiting = null
    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString()
      let nl
      while ((nl = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, nl).trim()
        this.buffer = this.buffer.slice(nl + 1)
        this.waiting?.(line)
      }
    })
  }

  send (cmd) {
    this.proc.stdin.write(cmd + '\n')
  }

  /** Attend une ligne satisfaisant `test`, en accumulant les lignes `info`. */
  until (test) {
    return new Promise((resolve) => {
      const lines = []
      this.waiting = (line) => {
        lines.push(line)
        if (test(line)) {
          this.waiting = null
          resolve(lines)
        }
      }
    })
  }

  async init () {
    this.send('uci')
    await this.until((l) => l === 'uciok')
    this.send(`setoption name Threads value ${THREADS_PER_WORKER}`)
    this.send('setoption name Hash value 512')
    this.send('isready')
    await this.until((l) => l === 'readyok')
  }

  /** Score en centipions, du point de vue du camp qui doit jouer. */
  async evaluate (fen) {
    this.send('position fen ' + fen)
    this.send('go depth ' + DEPTH)
    const lines = await this.until((l) => l.startsWith('bestmove'))
    let cp = null
    let best = null
    for (const l of lines) {
      const m = /score (cp|mate) (-?\d+)/.exec(l)
      if (m) cp = m[1] === 'mate' ? (Number(m[2]) > 0 ? CLAMP : -CLAMP) : Number(m[2])
      const b = /^bestmove (\S+)/.exec(l)
      if (b) best = b[1]
    }
    return { cp: Math.max(-CLAMP, Math.min(CLAMP, cp ?? 0)), best }
  }

  quit () {
    this.send('quit')
    this.proc.kill()
  }
}

/** Rejoue le PGN et renvoie la liste des positions + qui joue. */
function positions (game) {
  const chess = new Chess()
  const sans = game.moves
    .split(' ')
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t))
  const steps = []
  for (const san of sans) {
    const fen = chess.fen()
    const turn = chess.turn() // 'w' | 'b'
    let mv
    try {
      mv = chess.move(san)
    } catch {
      break // PGN tronqué ou coup illisible : on arrête cette partie là
    }
    steps.push({ fen, turn, san, ply: steps.length })
  }
  steps.push({ fen: chess.fen(), turn: chess.turn(), san: null, ply: steps.length })
  return steps
}

const SEUILS = [
  ['gaffe', 300],
  ['erreur', 100],
  ['imprécision', 50]
]
const classe = (loss) => SEUILS.find(([, s]) => loss >= s)?.[0] ?? 'ok'

const phase = (ply) => {
  const coup = Math.floor(ply / 2) + 1
  if (coup <= 10) return 'ouverture (1-10)'
  if (coup <= 25) return 'milieu (11-25)'
  if (coup <= 40) return 'fin de milieu (26-40)'
  return 'finale (41+)'
}

async function main () {
  const all = JSON.parse(await readFile('data/games.json', 'utf8'))
  // Période fiable uniquement : son classement en ligne a rattrapé son vrai niveau.
  let games = all.filter((g) => g.myElo >= 1450)
  if (LIMIT) games = games.slice(0, LIMIT)

  const tasks = []
  for (const g of games) {
    const steps = positions(g)
    for (const s of steps) tasks.push({ id: g.id, ...s })
  }
  console.log(`${games.length} parties · ${tasks.length} positions · profondeur ${DEPTH} · ${WORKERS} instances × ${THREADS_PER_WORKER} threads`)

  const engines = []
  for (let i = 0; i < WORKERS; i++) {
    const e = new Engine()
    await e.init()
    engines.push(e)
  }

  const t0 = Date.now()
  const results = new Array(tasks.length)
  let next = 0
  let done = 0

  await Promise.all(engines.map(async (engine) => {
    while (true) {
      const i = next++
      if (i >= tasks.length) return
      const { cp, best } = await engine.evaluate(tasks[i].fen)
      results[i] = { cp, best }
      done++
      if (done % 200 === 0) {
        const secs = (Date.now() - t0) / 1000
        const rate = done / secs
        const eta = Math.round((tasks.length - done) / rate)
        console.log(`  ${done}/${tasks.length} · ${rate.toFixed(1)} pos/s · reste ~${Math.floor(eta / 60)}m${String(eta % 60).padStart(2, '0')}s`)
      }
    }
  }))

  for (const e of engines) e.quit()
  const secs = (Date.now() - t0) / 1000
  console.log(`\nTerminé en ${Math.floor(secs / 60)}m${String(Math.round(secs % 60)).padStart(2, '0')}s (${(tasks.length / secs).toFixed(1)} positions/s)\n`)

  // Recompose les pertes par coup.
  const byId = new Map()
  tasks.forEach((t, i) => {
    if (!byId.has(t.id)) byId.set(t.id, [])
    byId.get(t.id).push({ ...t, ...results[i] })
  })

  const gameMap = new Map(games.map((g) => [g.id, g]))
  const moves = []
  for (const [id, steps] of byId) {
    const g = gameMap.get(id)
    const monCamp = g.side === 'white' ? 'w' : 'b'
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].turn !== monCamp) continue
      const avant = steps[i].cp
      const apres = -steps[i + 1].cp
      const loss = Math.max(0, avant - apres)
      moves.push({
        id,
        ply: steps[i].ply,
        coup: Math.floor(steps[i].ply / 2) + 1,
        san: steps[i].san,
        meilleur: steps[i].best,
        avant,
        apres,
        loss,
        classe: classe(loss),
        phase: phase(steps[i].ply),
        won: g.won,
        timeClass: g.timeClass,
        oppElo: g.oppElo
      })
    }
  }

  await writeFile('data/engine-moves.json', JSON.stringify(moves, null, 2))
  console.log(`${moves.length} de ses coups analysés → data/engine-moves.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
