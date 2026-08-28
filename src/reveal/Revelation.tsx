/**
 * La révélation — la fin du jeu, et sa raison d'être.
 *
 * Le bot a abandonné après le 15ᵉ coup. Tout ce qui précède existe pour amener ici.
 *
 * **Les images sont interchangeables** : le cadeau n'était pas encore commandé au
 * moment d'écrire ce composant. On commence par un reçu recadré, on remplace par une
 * photo du plateau quand il arrive — sans toucher au code. Plusieurs images sont
 * possibles : les autres participants n'avaient pas encore confirmé leurs cadeaux.
 *
 * ⚠️ Un reçu contient une adresse de livraison, un numéro de commande, parfois des
 * chiffres de carte. **Recadrer avant de déposer le fichier** : le site est en ligne.
 */

import { useEffect, useState } from 'react'
import { useJeu } from '../store'
import { Bouton } from '../juice/Bouton'
import { feedback } from '../juice/feedback'
import { NOMBRE_DE_COUPS } from '../types'

/**
 * Les cadeaux à dévoiler, dans l'ordre. Déposer les fichiers dans `public/reveal/`
 * et ajouter une entrée ici — c'est le seul changement nécessaire.
 */
export interface Cadeau {
  /** Chemin depuis `public/`, par exemple `/reveal/echiquier.jpg`. */
  image?: string
  titre: string
  texte?: string
  /** Qui offre. Affiché discrètement sous le texte. */
  de?: string
}

export const CADEAUX: Cadeau[] = [
  {
    titre: 'Joyeux anniversaire',
    texte:
      "Cette partie, tu viens de la gagner. Le cadeau, lui, t'attend depuis un moment.",
    de: undefined
  }
  // ▼▼▼ AJOUTER LES CADEAUX ICI ▼▼▼
  // { image: '/reveal/recu.jpg', titre: 'Ton échiquier', texte: '…', de: 'Frédéric' },
  // ▲▲▲ ─────────────────────── ▲▲▲
]

/** L'âge qu'il a aujourd'hui. Le chiffre du jour. */
export const AGE = 17

export function Revelation() {
  /** `age` : le grand chiffre. `cadeaux` : ce qui vient après. */
  const [etape, setEtape] = useState<'age' | 'cadeaux'>('age')
  const [index, setIndex] = useState(0)
  const historique = useJeu((s) => s.historique)
  const progression = useJeu((s) => s.progression)

  const cadeau = CADEAUX[index]
  const dernier = index >= CADEAUX.length - 1

  // Le grand feu d'artifice, une seule fois, à l'entrée.
  useEffect(() => {
    feedback('finale', { texte: `${AGE} ANS !!!` })
  }, [])

  if (etape === 'age') return <Age onSuite={() => setEtape('cadeaux')} />

  const coups = historique.filter((c) => c.camp === 'blancs').length
  const sansIndice = Object.values(progression).filter(
    (p) => p.resolue && p.indicesReveles === 0
  ).length

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-10 text-center">
      <p className="font-titre text-xl text-accent">Le bot abandonne.</p>

      <h1 className="font-titre text-4xl leading-tight text-lisere">{cadeau.titre}</h1>

      {cadeau.image ? (
        <img
          src={cadeau.image}
          alt={cadeau.titre}
          className="max-h-[45vh] w-full max-w-sm rounded-2xl border-4 border-lisere object-contain shadow-[0_10px_0_rgba(58,35,19,0.6)]"
        />
      ) : (
        // Aucune image déposée : on ne montre pas un cadre vide, on l'assume.
        <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-2xl border-4 border-dashed border-lisere/50 px-6 py-10 text-texte-clair/60">
          <span className="text-5xl">🎁</span>
          <span className="text-sm">
            (l'image du cadeau se dépose dans <code>public/reveal/</code>)
          </span>
        </div>
      )}

      {cadeau.texte && (
        <p className="max-w-sm text-lg leading-snug text-texte-clair">{cadeau.texte}</p>
      )}

      {cadeau.de && (
        <p className="text-base text-texte-clair/70">de la part de {cadeau.de}</p>
      )}

      {/* Le score : des objectifs, jamais des conditions. Ratés, ils ne coûtent rien. */}
      <div className="mt-2 flex flex-col gap-1 text-sm text-texte-clair/70">
        <span>
          Gagné en <strong className="text-lisere">{coups} coups</strong>
          {coups <= NOMBRE_DE_COUPS && ' — dans les temps'}
        </span>
        {sansIndice > 0 && (
          <span>
            <strong className="text-lisere">{sansIndice}</strong> énigme
            {sansIndice > 1 ? 's' : ''} trouvée{sansIndice > 1 ? 's' : ''} sans indice
          </span>
        )}
      </div>

      {!dernier && (
        <Bouton
          taille="lg"
          pleineLargeur
          onClick={() => {
            setIndex((i) => i + 1)
            feedback('grand')
          }}
        >
          Il y a autre chose…
        </Bouton>
      )}
    </div>
  )
}

/**
 * Le grand chiffre, seul à l'écran, sur les confettis lancés à l'entrée de la
 * révélation. C'est le battement entre « le bot abandonne » et le cadeau : il ne
 * faut rien d'autre dessus.
 */
function Age({ onSuite }: { onSuite: () => void }) {
  const [pret, setPret] = useState(false)

  // Le bouton n'apparaît qu'après quelques secondes : sinon on passe à travers le
  // moment sans le voir, et c'est tout l'intérêt de cet écran.
  useEffect(() => {
    const t = setTimeout(() => setPret(true), 2600)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-titre text-2xl text-accent">Tu as gagné.</p>

      <p
        className="font-titre leading-none text-lisere drop-shadow-[0_6px_0_rgba(58,35,19,0.85)]"
        style={{ fontSize: 'min(44vw, 34vh)' }}
      >
        {AGE}
      </p>

      <p className="font-titre text-3xl text-texte-clair">ans</p>

      <div className={`mt-6 w-full max-w-sm transition-opacity duration-700 ${pret ? 'opacity-100' : 'opacity-0'}`}>
        <Bouton taille="lg" pleineLargeur onClick={onSuite} disabled={!pret}>
          Et ce n'est pas tout…
        </Bouton>
      </div>
    </div>
  )
}
