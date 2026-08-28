import { createServer } from 'vite'
const memoire = new Map()
globalThis.localStorage = {
  getItem: (k) => (memoire.has(k) ? memoire.get(k) : null),
  setItem: (k, v) => memoire.set(k, String(v)),
  removeItem: (k) => memoire.delete(k), clear: () => memoire.clear(),
  key: (i) => [...memoire.keys()][i] ?? null, get length () { return memoire.size }
}
const s = await createServer({ configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true } })
const g = await s.ssrLoadModule('/src/riddles/grille.ts')
const { NOMBRE_DE_COUPS } = await s.ssrLoadModule('/src/types.ts')
console.log('slot | nature | type          | énoncé')
console.log('-----+--------+---------------+' + '-'.repeat(60))
let ko = 0
for (let c = 1; c <= NOMBRE_DE_COUPS; c++) {
  const e = g.enigmePourCoup(c)
  if (!e) { console.log(String(c).padStart(4) + ' | ⛔ AUCUNE ÉNIGME'); ko++; continue }
  const diag = e.fenPuzzle ? ' [diagramme]' : ''
  console.log(
    String(c).padStart(4) + ' | ' + (e.nature === 'perso' ? 'perso ' : 'échecs') +
    ' | ' + e.type.padEnd(13) + ' | ' + e.enonce.slice(0, 58) + diag
  )
  if (e.type === 'square-live') { console.log('       ⛔ square-live : injouable'); ko++ }
  if (e.type === 'choice' && (!e.choix || e.bonneReponse === undefined)) { console.log('       ⛔ QCM sans choix'); ko++ }
  if (['text','code','offscreen'].includes(e.type) && !e.reponses?.length) { console.log('       ⛔ sans réponse'); ko++ }
}
console.log('\n' + (ko ? ko + ' PROBLEME(S)' : 'les 15 slots sont jouables'))
await s.close()
