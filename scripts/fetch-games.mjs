// Récupère toutes les données publiques Chess.com d'un joueur.
// API publique en lecture seule : ni clé, ni auth, ni compte premium requis.
// Contraintes vérifiées : pseudo en minuscules, requêtes en série (le parallèle -> 429),
// User-Agent explicite obligatoire.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const USER = (process.argv[2] ?? 'pedagopaul').toLowerCase()
const OUT = 'data'
const UA = 'paul-chess-dev/1.0 (frederic@portalstudio.fr)'
const BASE = 'https://api.chess.com/pub/player'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get (url, attempt = 1) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (res.status === 429 && attempt <= 4) {
    const wait = 1000 * 2 ** attempt
    console.warn(`  429 -> nouvelle tentative dans ${wait}ms`)
    await sleep(wait)
    return get(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} sur ${url}`)
  return res.json()
}

const HEADER_RE = /^\[(\w+)\s+"([^"]*)"\]$/gm

/** Parse tous les en-têtes PGN d'un coup : [Key "value"] -> objet. */
function headers (pgn) {
  const out = {}
  HEADER_RE.lastIndex = 0
  let m
  while ((m = HEADER_RE.exec(pgn ?? '')) !== null) out[m[1]] = m[2]
  return out
}

/** Corps du PGN sur une ligne, commentaires d'horloge retirés. */
function moveText (pgn) {
  const parts = (pgn ?? '').split(/\r?\n\r?\n/)
  const body = parts.length > 1 ? parts.slice(1).join('\n') : ''
  return body.replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim()
}

function flatten (game) {
  const pgn = game.pgn ?? ''
  const h = headers(pgn)
  const side = game.white.username.toLowerCase() === USER ? 'white' : 'black'
  const me = side === 'white' ? game.white : game.black
  const opp = side === 'white' ? game.black : game.white
  const moves = moveText(pgn)
  return {
    id: game.url.split('/').pop(),
    url: game.url,
    date: h.UTCDate ?? null,
    time: h.UTCTime ?? null,
    endTime: game.end_time ?? null,
    side,
    result: me.result,
    oppResult: opp.result,
    won: me.result === 'win',
    timeClass: game.time_class ?? null,
    timeControl: game.time_control ?? null,
    rated: game.rated ?? null,
    eco: h.ECO ?? null,
    ecoName: h.ECOUrl ? h.ECOUrl.split('/').pop() : null,
    ecoUrl: h.ECOUrl ?? null,
    termination: h.Termination ?? null,
    myElo: me.rating ?? null,
    oppElo: opp.rating ?? null,
    opponent: opp.username,
    moveCount: (moves.match(/\d+\.\s/g) ?? []).length,
    finalPosition: h.CurrentPosition ?? null,
    moves,
    pgn
  }
}

async function main () {
  await mkdir(join(OUT, 'raw'), { recursive: true })
  console.log(`Joueur : ${USER}`)

  const profile = await get(`${BASE}/${USER}`)
  await writeFile(join(OUT, 'profile.json'), JSON.stringify(profile, null, 2))
  await sleep(250)

  const stats = await get(`${BASE}/${USER}/stats`)
  await writeFile(join(OUT, 'stats.json'), JSON.stringify(stats, null, 2))
  await sleep(250)

  const { archives } = await get(`${BASE}/${USER}/games/archives`)
  console.log(`${archives.length} archives mensuelles`)

  const games = []
  for (const url of archives) {
    const [year, month] = url.split('/').slice(-2)
    const data = await get(url)
    await writeFile(
      join(OUT, 'raw', `${USER}-${year}-${month}.json`),
      JSON.stringify(data, null, 2)
    )
    games.push(...data.games)
    console.log(`  ${year}-${month} : ${data.games.length} parties`)
    await sleep(250)
  }

  const index = games
    .filter((g) => g.pgn)
    .map(flatten)
    .sort((a, b) => (a.endTime ?? 0) - (b.endTime ?? 0))

  await writeFile(join(OUT, 'games.json'), JSON.stringify(index, null, 2))
  console.log(`\n${index.length} parties écrites dans ${OUT}/games.json`)
  console.log(`(${games.length - index.length} sans PGN, ignorées)`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
