import { spawn } from 'node:child_process'
import { Chess } from 'chess.js'

const SF = 'tools/stockfish/stockfish-windows-x86-64-bmi2.exe'
const PARTIE = 'd4 d5 Nf3 e6 Qd3 Nf6 Ne5 c5 Nxf7 Kxf7 Qh3 e5 dxe5 Bxh3 gxh3 Nbd7 exf6 Qc7 fxg7 Nf6 gxh8=Q c4 Bh6 Rc8 Qg7+ Ke6 Qxh7 Qb6 Nc3 d4 Ne4 Qb4+ c3 Qxb2 Nc5+ Rxc5 Bxf8 Rg5 Qe4+ Kd7'.split(' ')

class E {
  constructor () {
    this.p = spawn(SF, [], { stdio: ['pipe', 'pipe', 'ignore'] })
    this.buf = ''; this.w = null
    this.p.stdout.on('data', c => {
      this.buf += c.toString()
      let n
      while ((n = this.buf.indexOf('\n')) !== -1) {
        const l = this.buf.slice(0, n).trim(); this.buf = this.buf.slice(n + 1)
        if (l) this.w?.(l)
      }
    })
  }
  send (c) { this.p.stdin.write(c + '\n') }
  until (t) { return new Promise(r => { const ls = []; this.w = l => { ls.push(l); if (t(l)) { this.w = null; r(ls) } } }) }
  async init () { this.send('uci'); await this.until(l => l === 'uciok'); this.send('setoption name Threads value 2'); this.send('isready'); await this.until(l => l === 'readyok') }
  async eval (fen) {
    this.send('position fen ' + fen); this.send('go depth 18')
    const ls = await this.until(l => l.startsWith('bestmove'))
    let cp = null, best = null
    for (const l of ls) {
      const m = /score (cp|mate) (-?\d+)/.exec(l)
      if (m) cp = m[1] === 'mate' ? (Number(m[2]) > 0 ? 10000 : -10000) : Number(m[2])
      const b = /^bestmove (\S+)/.exec(l); if (b) best = b[1]
    }
    return { cp, best }
  }
  quit () { this.send('quit'); this.p.kill() }
}

const e = new E(); await e.init()
const c = new Chess()
console.log('coup | camp | joué      | éval APRÈS (vue des BLANCS) | meilleur coup du moteur')
console.log('-----+------+-----------+-----------------------------+------------------------')
let i = 0
for (const san of PARTIE) {
  const avant = c.fen()
  const { best } = await e.eval(avant)
  const mv = c.move(san)
  const { cp } = await e.eval(c.fen())
  // cp est du point de vue du camp au trait APRES le coup -> on normalise en "vue des blancs"
  const vueBlancs = c.turn() === 'w' ? cp : -cp
  const camp = mv.color === 'w' ? 'JOUEUR' : ' bot  '
  const num = Math.floor(i / 2) + 1
  console.log(
    String(num).padStart(4) + ' | ' + camp + ' | ' + san.padEnd(9) + ' | ' +
    String(vueBlancs).padStart(8) + '                    | ' + (best ?? '')
  )
  i++
}
e.quit()
