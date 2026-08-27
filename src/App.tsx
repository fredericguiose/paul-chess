import { useCallback, useEffect } from 'react'
import { useJeu } from './store'
import { NOMBRE_DE_COUPS, type Case } from './types'
import { Board3D } from './board/Board3D'
import { PlateauSecours } from './board2d/PlateauSecours'
import { BandeEnigme } from './riddles/BandeEnigme'
import { CoucheJuice } from './juice/CoucheJuice'
import { useTremblement } from './juice/useTremblement'
import { Bouton } from './juice/Bouton'
import { demarrerMoteur, nouvellePartie } from './engine/moteur'
import { apresCoupDuBot, jouerCoupJoueur, tourDuBot } from './orchestration'
import { DUREE_COUP } from './theme'

/** Laisse à l'animation le temps de se jouer avant d'enchaîner. */
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * WebGL est-il utilisable ? Testé une fois, au chargement.
 *
 * Le soir de l'anniversaire, un téléphone qui ne rend pas la 3D ne doit pas arrêter
 * le jeu : `PlateauSecours` expose les mêmes props que `Board3D` et prend le relais
 * sans que l'orchestration change d'un caractère.
 */
function webglDisponible(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext && (c.getContext('webgl2') ?? c.getContext('webgl'))
    )
  } catch {
    return false
  }
}

const PLATEAU_3D = webglDisponible()

export function App() {
  const phase = useJeu((s) => s.phase)
  const vues = useJeu((s) => s.enigmesVues())
  const pose = useJeu((s) => s.poseCamera)
  const setPoseCamera = useJeu((s) => s.setPoseCamera)

  const refTremblement = useTremblement<HTMLDivElement>()

  /**
   * Le moteur démarre au montage, pas au 5ᵉ coup : les 7,3 Mo de wasm se
   * téléchargent pendant que le joueur lit l'écran d'intro. C'est le seul endroit
   * du parcours où ce téléchargement s'absorbe sans le faire attendre.
   */
  useEffect(() => {
    nouvellePartie()
    demarrerMoteur().catch((e) => {
      // Le jeu doit rester jouable même sans moteur : le livre couvre 4 coups et
      // `demanderCoupBot` a un coup de secours. Jamais de blocage devant le cadeau.
      console.error('[app] moteur indisponible, le jeu continue :', e)
    })
  }, [])

  // Enchaînement des phases : animation → tour du bot → énigme suivante.
  useEffect(() => {
    let annule = false

    if (phase === 'animationJoueur') {
      setPoseCamera('iso')
      void (async () => {
        await attendre(DUREE_COUP)
        if (!annule) await tourDuBot()
      })()
    }

    if (phase === 'animationBot') {
      void (async () => {
        await attendre(DUREE_COUP)
        if (!annule) apresCoupDuBot()
      })()
    }

    return () => {
      annule = true
    }
  }, [phase, setPoseCamera])

  const surCoup = useCallback((from: Case, to: Case, promotion?: string) => {
    jouerCoupJoueur(from, to, promotion)
  }, [])

  if (phase === 'intro') return <Intro />

  const carteVisible = phase === 'enigme'
  const Plateau = PLATEAU_3D ? Board3D : PlateauSecours

  return (
    <div ref={refTremblement} className="relative h-full w-full overflow-hidden">
      {/* L'échiquier 3D occupe tout l'écran : c'est le cadeau, c'est lui qu'on montre. */}
      <div className="absolute inset-0">
        <Plateau onCoup={surCoup} saisieActive={phase === 'saisieCoup'} />
      </div>

      {/*
        Toucher le plateau en vue 3D bascule en vue de dessus, où l'on joue. La couche
        ne capte le toucher que dans ce cas : en vue de dessus elle disparaît et le
        plateau reçoit les touchers directement.
      */}
      {pose === 'iso' && !carteVisible && (
        <button
          type="button"
          aria-label="Passer en vue de dessus pour jouer"
          onClick={() => setPoseCamera('topDown')}
          className="absolute inset-0 cursor-pointer bg-transparent"
        >
          {phase === 'saisieCoup' && (
            <span className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-contour/70 px-5 py-2 font-titre text-base text-lisere backdrop-blur-sm">
              touche le plateau pour jouer
            </span>
          )}
        </button>
      )}

      {/* Progression, toujours lisible, par-dessus le plateau. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-baseline justify-center gap-3 pt-3 font-titre text-lg text-lisere drop-shadow-[0_2px_0_rgba(58,35,19,0.9)]">
        <span>
          {vues} / {NOMBRE_DE_COUPS}
        </span>
        {phase === 'reflexionBot' && (
          <span className="animate-pulse text-sm font-normal text-texte-clair/80">
            l'adversaire réfléchit…
          </span>
        )}
      </div>

      {/*
        L'énigme est une carte flottante par-dessus le canevas, avec flou d'arrière-plan.
        Les énigmes qui portent sur une position s'affichent sur leur **propre** petit
        échiquier, dans la carte : le plateau principal n'est jamais détourné, donc la
        partie en cours n'est jamais perturbée.
      */}
      {carteVisible && (
        <>
          <div className="absolute inset-0 z-10 bg-contour/40 backdrop-blur-[3px]" />
          {/* La carte occupe l'espace principal : centrée, elle est ce qu'on regarde. */}
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border-2 border-lisere/70 bg-bois/90 shadow-[0_12px_0_rgba(58,35,19,0.6)] backdrop-blur-md">
              <BandeEnigme onFranchie={() => setPoseCamera('topDown')} />
            </div>
          </div>
        </>
      )}

      <CoucheJuice />
    </div>
  )
}

/**
 * Écran d'intro — **et écran de chargement déguisé** : les 7,3 Mo de Stockfish
 * arrivent pendant qu'il lit.
 */
function Intro() {
  const setPhase = useJeu((s) => s.setPhase)
  const mouvementReduit = useJeu((s) => s.mouvementReduit)
  const setMouvementReduit = useJeu((s) => s.setMouvementReduit)

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-7 px-6">
      <h1 className="font-titre text-4xl leading-tight text-lisere">Bon anniversaire</h1>

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

      <Bouton taille="lg" pleineLargeur onClick={() => setPhase('enigme')}>
        Commencer
      </Bouton>
    </div>
  )
}
