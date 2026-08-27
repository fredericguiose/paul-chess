// Cherche la sequence de reponses des NOIRS qui rend les coups de Paul
// le plus previsibles possible, et jusqu'ou.
//
// Le bot joue les noirs : a chaque fois que c'est a lui, il CHOISIT. On cherche
// donc le choix qui maximise la previsibilite du coup suivant de Paul, tant que
// l'echantillon reste assez grand pour que le chiffre veuille dire quelque chose.
import { readFile } from 'node:fs/promises'

const MIN_N = Number(process.argv[2] ?? 8) // taille d'echantillon minimale
const games = JSON.parse(await readFile('data/games.json', 'utf8'))
const SAB = (g) => g.timeClass === 'rapid' && (g.date === '2025.04.24' || g.date === '2025.07.21')

const lignes = games
  .filter((g) => !SAB(g) && g.side === 'white')
  .map((g) => g.moves
    .split(' ')
    .filter((t) => t && !/^\d+\.+$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t)))

/** Parties dont les i premiers demi-coups correspondent au prefixe. */
const filtrer = (prefixe) =>
  lignes.filter((l) => l.length > prefixe.length && prefixe.every((m, i) => l[i] === m))

/** Distribution du demi-coup a l'index i, sur les parties retenues. */
function distribution (prefixe) {
  const sous = filtrer(prefixe)
  const t = new Map()
  for (const l of sous) {
    const m = l[prefixe.length]
    t.set(m, (t.get(m) ?? 0) + 1)
  }
  return { total: sous.length, tri: [...t.entries()].sort((a, b) => b[1] - a[1]) }
}

function explorer (prefixeDepart, nom) {
  console.log('\n=== ' + nom + ' ===')
  console.log('coup      qui       joue      part     n     cumul')
  let prefixe = [...prefixeDepart]
  let cumul = 1

  // Rejoue le prefixe impose pour afficher les probabilites de ses coups dedans.
  for (let i = 0; i < prefixeDepart.length; i++) {
    const p = prefixe.slice(0, i)
    const { total, tri } = distribution(p)
    const mv = prefixeDepart[i]
    const n = tri.find(([m]) => m === mv)?.[1] ?? 0
    const part = total ? n / total : 0
    if (i % 2 === 0) cumul *= part
    console.log(
      String(Math.floor(i / 2) + 1).padStart(4) + '   ' +
      (i % 2 === 0 ? 'PAUL ' : 'bot  ') + '   ' +
      mv.padEnd(8) + ' ' +
      (i % 2 === 0 ? (Math.round(part * 100) + '%').padStart(6) : '  (choix)') + '  ' +
      String(total).padStart(4) + '  ' +
      (i % 2 === 0 ? (Math.round(cumul * 100) + '%').padStart(6) : '')
    )
  }

  // Puis on avance : le bot choisit, Paul est mesure.
  while (true) {
    const tourDePaul = prefixe.length % 2 === 0
    const { total, tri } = distribution(prefixe)
    if (!tri.length || total < MIN_N) {
      console.log('       -> arret : echantillon tombe a ' + total + ' parties (seuil ' + MIN_N + ')')
      break
    }

    if (tourDePaul) {
      const [mv, n] = tri[0]
      const part = n / total
      cumul *= part
      prefixe.push(mv)
      console.log(
        String(Math.floor((prefixe.length - 1) / 2) + 1).padStart(4) + '   PAUL     ' +
        mv.padEnd(8) + ' ' + (Math.round(part * 100) + '%').padStart(6) + '  ' +
        String(total).padStart(4) + '  ' + (Math.round(cumul * 100) + '%').padStart(6))
    } else {
      // Le bot choisit la reponse qui rend le coup suivant de Paul le plus sur.
      let best = null
      for (const [mv, n] of tri) {
        if (n < MIN_N) continue
        const d = distribution([...prefixe, mv])
        if (d.total < MIN_N || !d.tri.length) continue
        // On maximise le NOMBRE de parties ou Paul joue son coup favori ensuite :
        // ca garde a la fois une forte previsibilite et un echantillon consequent.
        const masse = d.tri[0][1]
        const surete = d.tri[0][1] / d.total
        if (!best || masse > best.masse) best = { mv, n, masse, surete }
      }
      if (!best) {
        console.log('       -> arret : aucune reponse noire ne laisse assez de donnees')
        break
      }
      prefixe.push(best.mv)
      console.log(
        String(Math.floor((prefixe.length - 1) / 2) + 1).padStart(4) + '   bot      ' +
        best.mv.padEnd(8) + '  (choix)  ' + String(best.n).padStart(4))
    }
  }

  const coups = Math.ceil(prefixe.length / 2)
  console.log('\nSequence tenue : ' + coups + ' coups · fiabilite cumulee ' + Math.round(cumul * 100) + ' %')
  const jolie = prefixe.map((m, i) => (i % 2 === 0 ? (i / 2 + 1) + '.' + m : m)).join(' ')
  console.log(jolie)
  return { coups, cumul }
}

explorer(['e4', 'e5'], 'LIGNE A — le bot repond e5 (mene a l Ecossaise)')
explorer(['e4', 'c5'], 'LIGNE B — le bot repond c5 (Sicilienne)')
explorer(['e4', 'c6'], 'LIGNE C — le bot repond c6 (Caro-Kann)')
explorer(['e4', 'd5'], 'LIGNE D — le bot repond d5 (Scandinave)')
