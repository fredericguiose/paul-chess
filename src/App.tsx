import { useJeu } from './store'
import { NOMBRE_DE_COUPS } from './types'

/**
 * Coquille de l'application — étape 0.
 *
 * Les lots B à F viennent brancher leurs composants ici. Cette coquille ne contient
 * **aucune logique de jeu** : elle lit le store et affiche la phase courante.
 */
export function App() {
  const phase = useJeu((s) => s.phase)
  const setPhase = useJeu((s) => s.setPhase)
  const coup = useJeu((s) => s.coupCourant())
  const vues = useJeu((s) => s.enigmesVues())

  if (phase === 'intro') return <Intro onCommencer={() => setPhase('enigme')} />

  return (
    <div className="flex h-full flex-col">
      {/* Lot B : <Board3D /> — plateau carré centré */}
      <div className="grid flex-1 place-items-center text-texte-clair/40">
        plateau — lot B
      </div>

      {/* Progression, visible en permanence */}
      <div className="px-4 py-2 text-center font-titre text-lg text-lisere">
        {vues} / {NOMBRE_DE_COUPS}
        <span className="ml-3 text-sm text-texte-clair/50">coup {coup}</span>
      </div>

      {/* Lot C : <BandeEnigme /> — sous le plateau, JAMAIS en modale plein écran :
          une modale cacherait le plateau, donc interdirait les énigmes `square-live`. */}
      <div className="min-h-[9rem] bg-bois px-4 py-4 text-texte-clair/40">
        bande d'énigme — lot C
      </div>

      {/* Lot D : <CoucheJuice /> — confettis et tremblement, en 2D par-dessus,
          hors de la scène 3D pour ne pas casser `frameloop="demand"`. */}
    </div>
  )
}

/**
 * Écran d'intro — **et écran de chargement déguisé**. C'est pendant les 15-20 secondes
 * de lecture que les 7,3 Mo de Stockfish se téléchargent (préchargés depuis
 * `index.html`). Seul endroit du parcours où ce téléchargement s'absorbe sans faire
 * attendre le joueur.
 */
function Intro({ onCommencer }: { onCommencer: () => void }) {
  const mouvementReduit = useJeu((s) => s.mouvementReduit)
  const setMouvementReduit = useJeu((s) => s.setMouvementReduit)

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-8 px-6">
      <h1 className="font-titre text-4xl leading-tight text-lisere">
        Bon anniversaire
      </h1>

      <p className="text-lg leading-snug">
        Tu vas jouer une partie d'échecs. Tu ne peux jouer ton prochain coup qu'en
        répondant à une énigme.
      </p>

      <p className="text-lg leading-snug">
        {NOMBRE_DE_COUPS} énigmes, {NOMBRE_DE_COUPS} coups. À la fin, il y a quelque
        chose pour toi.
      </p>

      <label className="flex items-center gap-3 text-base text-texte-clair/70">
        <input
          type="checkbox"
          checked={mouvementReduit}
          onChange={(e) => setMouvementReduit(e.target.checked)}
          className="size-5"
        />
        Réduire les tremblements et les flashs
      </label>

      <button
        onClick={onCommencer}
        className="rounded-2xl border-b-4 border-accent-sombre bg-accent px-6 py-4 font-titre text-2xl text-texte active:translate-y-0.5 active:border-b-2"
      >
        Commencer
      </button>
    </div>
  )
}
