/**
 * La révélation — la fin du jeu, et sa raison d'être.
 *
 * La partie est terminée. Tout ce qui précède existe pour amener ici.
 *
 * Le bot joue pour l'équilibre et **peut gagner** : l'issue est réelle. Seule la
 * phrase d'accueil change — le cadeau se dévoile dans tous les cas.
 *
 * Deux battements : le grand chiffre de l'âge, puis le cadeau. Le cadeau n'arrive
 * qu'en **octobre**, donc on ne montre pas une photo ni un reçu : on montre un
 * **compte à rebours** qui tourne. C'est la promesse, pas l'objet.
 */

import { useEffect, useState } from 'react'
import { useJeu } from '../store'
import { Bouton } from '../juice/Bouton'
import { feedback } from '../juice/feedback'
import { NOMBRE_DE_COUPS } from '../types'
import { BarreAvantage } from './BarreAvantage'

/** L'âge qu'il a aujourd'hui. Le chiffre du jour. */
export const AGE = 17

/** Le jour où l'échiquier arrive. Modifier ici si la date bouge. */
export const DATE_CADEAU = new Date('2026-10-10T00:00:00')

export const NOM_CADEAU = 'Ton échiquier'

export function Revelation() {
  /** `age` : le grand chiffre. `blague` : la fausse peur. `cadeau` : le compte à rebours. */
  const [etape, setEtape] = useState<'age' | 'blague' | 'cadeau'>('age')
  const issue = useJeu((s) => s.issue())

  // Le grand feu d'artifice, une seule fois, à l'entrée.
  useEffect(() => {
    feedback('finale', { texte: `${AGE} ANS !!!` })
  }, [])

  if (etape === 'age') {
    // La fausse peur n'a de sens que s'il a vraiment perdu.
    return <Age onSuite={() => setEtape(issue === 'defaite' ? 'blague' : 'cadeau')} />
  }
  if (etape === 'blague') return <Blague onSuite={() => setEtape('cadeau')} />
  return <Cadeau />
}

/**
 * La blague, en cas de défaite : on lui annonce qu'il n'a pas de cadeau, puis on
 * se dédit.
 *
 * ⚠️ **Elle enchaîne toute seule.** Aucun bouton pour en sortir : devant huit
 * personnes, laisser quelqu'un cliquer sur « pas de cadeau » transformerait le gag
 * en malaise. Deux secondes et demie, c'est le temps d'un « quoi ?! » collectif —
 * au-delà ce n'est plus drôle.
 */
function Blague({ onSuite }: { onSuite: () => void }) {
  const [dedit, setDedit] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setDedit(true), 2500)
    const t2 = setTimeout(onSuite, 4600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onSuite])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <p
        className={`font-titre text-4xl leading-tight transition-all duration-500 ${
          dedit ? 'scale-90 text-texte-clair/40 line-through' : 'text-bot'
        }`}
      >
        Du coup, pas de cadeau.
      </p>

      <p
        className={`font-titre text-3xl text-lisere transition-opacity duration-700 ${
          dedit ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Mais si, évidemment.
      </p>
    </div>
  )
}

/**
 * Ce qui s'affiche au-dessus du grand chiffre, selon l'issue.
 *
 * Le bot joue pour l'équilibre depuis qu'il a été mesuré en train de rendre la
 * partie coup après coup. Il **peut donc gagner** — et dans ce cas on ne fait pas
 * semblant : on le dit, et le cadeau se dévoile quand même.
 */
const ACCUEIL: Record<'victoire' | 'nulle' | 'defaite', string> = {
  victoire: 'Tu as gagné.',
  nulle: 'Match nul. Vous vous êtes rendu coup pour coup.',
  defaite: "Bon. C'était pas prévu que tu perdes."
}

/**
 * Le grand chiffre, seul à l'écran, sur les confettis lancés à l'entrée. C'est le
 * battement entre la fin de la partie et le cadeau : rien d'autre ne doit s'y trouver.
 */
function Age({ onSuite }: { onSuite: () => void }) {
  const [pret, setPret] = useState(false)
  const issue = useJeu((s) => s.issue())

  // Le bouton n'apparaît qu'après quelques secondes : sinon on traverse le moment
  // sans le voir, et c'est tout son intérêt.
  useEffect(() => {
    const t = setTimeout(() => setPret(true), 2600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="max-w-sm font-titre text-2xl text-accent">{ACCUEIL[issue]}</p>

      <p
        className="font-titre leading-none text-lisere drop-shadow-[0_6px_0_rgba(58,35,19,0.85)]"
        style={{ fontSize: 'min(44vw, 32vh)' }}
      >
        {AGE}
      </p>

      <p className="font-titre text-3xl text-texte-clair">ans</p>

      <div
        className={`mt-8 w-full max-w-sm transition-opacity duration-700 ${
          pret ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Bouton taille="lg" pleineLargeur onClick={onSuite} disabled={!pret}>
          Et ce n'est pas tout…
        </Bouton>
      </div>
    </div>
  )
}

interface Reste {
  jours: number
  heures: number
  minutes: number
  secondes: number
  arrive: boolean
}

function calculerReste(cible: Date): Reste {
  const ms = cible.getTime() - Date.now()
  if (ms <= 0) return { jours: 0, heures: 0, minutes: 0, secondes: 0, arrive: true }
  const s = Math.floor(ms / 1000)
  return {
    jours: Math.floor(s / 86400),
    heures: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    secondes: s % 60,
    arrive: false
  }
}

/**
 * Le cadeau : un compte à rebours vivant, pas une image.
 *
 * Il ne reçoit l'échiquier qu'en octobre. Montrer une photo ou un reçu aujourd'hui
 * serait montrer un objet qu'il n'a pas ; un compteur qui tourne montre l'attente,
 * et il peut revenir le regarder.
 */
function Cadeau() {
  const [reste, setReste] = useState(() => calculerReste(DATE_CADEAU))
  const issue = useJeu((s) => s.issue())
  const evalBot = useJeu((s) => s.evalBot)
  const historique = useJeu((s) => s.historique)
  const progression = useJeu((s) => s.progression)

  useEffect(() => {
    const t = setInterval(() => setReste(calculerReste(DATE_CADEAU)), 1000)
    return () => clearInterval(t)
  }, [])

  const coups = historique.filter((c) => c.camp === 'blancs').length
  const sansIndice = Object.values(progression).filter(
    (p) => p.resolue && p.indicesReveles === 0
  ).length

  const dateLisible = DATE_CADEAU.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8 text-center">
      <div className="flex flex-col gap-1">
        <p className="font-titre text-xl text-accent">
          {issue === 'defaite' ? "…mais tu as quand même reçu" : 'Ton cadeau'}
        </p>
        <h1 className="font-titre text-4xl leading-tight text-lisere">{NOM_CADEAU}</h1>
      </div>

      {reste.arrive ? (
        <p className="font-titre text-3xl text-lisere">Il est là. 🎁</p>
      ) : (
        <>
          <p className="text-lg text-texte-clair">Il arrive dans</p>

          <div className="flex items-start justify-center gap-2">
            <Case valeur={reste.jours} libelle="jours" grand />
            <Case valeur={reste.heures} libelle="h" />
            <Case valeur={reste.minutes} libelle="min" />
            <Case valeur={reste.secondes} libelle="s" />
          </div>

          <p className="text-base text-texte-clair/70">le {dateLisible}</p>
        </>
      )}

      {/* Le verdict de la partie : qui avait l'avantage au dernier coup. */}
      <BarreAvantage evalBot={evalBot} issue={issue} />

      <div className="flex flex-col gap-1 text-sm text-texte-clair/70">
        <span>
          {issue === 'defaite' ? 'Partie de ' : 'Gagné en '}
          <strong className="text-lisere">{coups} coups</strong>
          {issue !== 'defaite' && coups <= NOMBRE_DE_COUPS && ' — dans les temps'}
        </span>
        {sansIndice > 0 && (
          <span>
            <strong className="text-lisere">{sansIndice}</strong> énigme
            {sansIndice > 1 ? 's' : ''} trouvée{sansIndice > 1 ? 's' : ''} sans indice
          </span>
        )}
      </div>
    </div>
  )
}

/** Une case du compte à rebours : le nombre en gros, son unité dessous. */
function Case({
  valeur,
  libelle,
  grand = false
}: {
  valeur: number
  libelle: string
  grand?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`rounded-2xl border-2 border-lisere/70 bg-bois px-3 py-2 font-titre tabular-nums text-texte-clair shadow-[0_5px_0_rgba(58,35,19,0.6)] ${
          grand ? 'text-5xl' : 'text-3xl'
        }`}
      >
        {grand ? valeur : String(valeur).padStart(2, '0')}
      </div>
      <span className="text-xs text-texte-clair/70">{libelle}</span>
    </div>
  )
}
