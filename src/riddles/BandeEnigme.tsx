/**
 * La bande d'énigme — lot C.
 *
 * ⚠️ **Ce n'est pas une modale, et ça ne doit jamais le devenir.** L'énigme vit dans
 * une bande **sous le plateau**, qui reste visible en permanence. Une modale plein
 * écran cacherait le plateau, donc interdirait les énigmes `square-live` — celles-là
 * mêmes qui justifient d'avoir une 3D.
 *
 * Le composant est le seul point du lot C qui écrit dans le store. Il enchaîne :
 * saisie → `verifierReponse` → `resoudreEnigme` + `feedbackPourCoup` → phase
 * `saisieCoup`. Il ne calcule aucune règle : les seuils d'indices et de « passer »
 * viennent de `indicesVisibles()` et `peutPasser()` (`src/store.ts`), le palier de
 * célébration de `palierPourCoup` (`src/types.ts`).
 *
 * **Aucune énigme ne peut bloquer le cadeau** : 2 échecs → indice 1, 4 → indice 2,
 * 6 → bouton « passer ». Et aucun chronomètre nulle part : rien ne se ferme ni ne se
 * valide tout seul.
 */

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { feedbackEchec, feedbackPourCoup } from '../juice/feedback'
import { Bouton } from '../juice/Bouton'
import { useJeu } from '../store'
import { NOMBRE_DE_COUPS, type Case, type NumeroCoup } from '../types'
import { ChampReponse } from './ChampReponse'
import { enigmePourCoup } from './grille'
import { verifierReponse } from './validation'

export interface BandeEnigmeProps {
  /**
   * `square-live` (slot 7) : la case attendue, calculée à la volée sur la position
   * réelle. Elle n'est pas connue à l'écriture de l'énigme — c'est le moteur qui
   * sait quelle pièce vient d'être laissée en prise.
   */
  caseLiveAttendue?: Case | null
  /** `square-live` : dernière case touchée sur le **plateau principal** (lot B). */
  caseTouchee?: Case | null
  /**
   * Signale au lot B qu'il doit passer en mode « désigne une case » : pendant une
   * énigme `square-live`, un toucher ne sélectionne pas une pièce, il répond.
   */
  onAttenteCaseLive?: (attend: boolean) => void
  /** L'énigme du coup vient d'être franchie. `passee` = sans l'avoir résolue. */
  onFranchie?: (coup: NumeroCoup, passee: boolean) => void
}

export function BandeEnigme({
  caseLiveAttendue = null,
  caseTouchee = null,
  onAttenteCaseLive,
  onFranchie
}: BandeEnigmeProps) {
  const phase = useJeu((s) => s.phase)
  const coup = useJeu((s) => s.coupCourant())
  const progression = useJeu((s) => s.progression[coup])
  const indices = useJeu((s) => s.indicesVisibles(coup))
  const peutPasser = useJeu((s) => s.peutPasser(coup))
  const echecEnigme = useJeu((s) => s.echecEnigme)
  const resoudreEnigme = useJeu((s) => s.resoudreEnigme)
  const passerEnigme = useJeu((s) => s.passerEnigme)
  const setPhase = useJeu((s) => s.setPhase)

  const enigme = enigmePourCoup(coup)
  const franchie = Boolean(progression?.resolue || progression?.passee)
  const active = phase === 'enigme' && enigme != null && !franchie

  const tenter = useCallback(
    (valeur: string) => {
      if (!enigme || !active) return
      if (verifierReponse(enigme, valeur, caseLiveAttendue)) {
        resoudreEnigme(coup)
        // Un seul appel : `feedback` empile lui-même vibration, confettis, texte et
        // tremblement. Le palier vient du numéro de coup, l'escalade n'est pas
        // décidée ici.
        feedbackPourCoup(coup)
        setPhase('saisieCoup')
        onFranchie?.(coup, false)
      } else {
        echecEnigme(coup)
        feedbackEchec()
      }
    },
    [enigme, active, caseLiveAttendue, coup, resoudreEnigme, setPhase, onFranchie, echecEnigme]
  )

  // ── square-live : le toucher arrive du plateau principal, pas d'ici.
  const attendCaseLive = active && enigme?.type === 'square-live'
  useEffect(() => {
    onAttenteCaseLive?.(attendCaseLive)
  }, [attendCaseLive, onAttenteCaseLive])

  // Une même case retouchée doit compter comme une nouvelle tentative, mais un
  // simple re-rendu ne doit rien déclencher : on ne réagit qu'au changement de prop.
  const derniereCase = useRef<Case | null>(null)
  useEffect(() => {
    if (!attendCaseLive || caseTouchee == null) return
    if (derniereCase.current === caseTouchee) return
    derniereCase.current = caseTouchee
    tenter(caseTouchee)
  }, [attendCaseLive, caseTouchee, tenter])

  const passer = () => {
    if (!active) return
    passerEnigme(coup)
    setPhase('saisieCoup')
    onFranchie?.(coup, true)
  }

  // ── états repliés : la bande ne disparaît jamais, sinon la page saute.
  //
  // ⚠️ Ne JAMAIS rendre une carte vide. Quand la grille n'a plus d'énigme pour ce
  // coup — parce que la partie a dépassé les 15 —, l'écran affichait un cadre brun
  // vide et plus rien ne se passait, pile au moment du cadeau. L'orchestration a un
  // filet qui révèle passé 15 énigmes ; ceci est la seconde ceinture, côté rendu.
  if (!enigme) {
    return (
      <Bande>
        <p className="py-3 text-center font-titre text-xl text-lisere">
          Tu les as toutes eues.
        </p>
      </Bande>
    )
  }

  if (!active) {
    return (
      <Bande>
        <p className="py-2 text-center font-titre text-xl text-lisere">{messageReplie(phase)}</p>
      </Bande>
    )
  }

  return (
    <Bande>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-titre text-sm uppercase tracking-wider text-lisere/80">
            Énigme {coup} / {NOMBRE_DE_COUPS}
          </span>
          {peutPasser && (
            <Bouton variante="bois" taille="sm" onClick={passer}>
              Passer
            </Bouton>
          )}
        </div>

        {/* Gros et gras : il sera lu à voix haute, et l'écran est montré au groupe. */}
        <p className="font-titre text-2xl leading-tight text-texte-clair">{enigme.enonce}</p>

        {/* `key` : chaque énigme repart d'une saisie vierge. */}
        <ChampReponse key={enigme.id} enigme={enigme} onValider={tenter} />

        {indices > 0 && (
          <ul className="flex flex-col gap-1">
            {enigme.indices.slice(0, indices).map((indice, i) => (
              <li
                key={indice}
                className="rounded-lg bg-bois-sombre/60 px-3 py-2 text-base text-texte-clair/90"
              >
                <span className="mr-2 font-titre text-lisere">Indice {i + 1}</span>
                {indice}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Bande>
  )
}

/**
 * Le cadre. Hauteur minimale fixe : la bande se replie entre deux énigmes, elle ne
 * se démonte pas — sinon le plateau saute de place à chaque coup.
 */
function Bande({ children }: { children: ReactNode }) {
  return (
    <section
      aria-live="polite"
      className="min-h-[9rem] w-full rounded-t-2xl border-t-4 border-lisere/70 bg-bois px-4 pb-5 pt-3 shadow-[0_-6px_16px_rgba(0,0,0,0.35)]"
    >
      {children}
    </section>
  )
}

function messageReplie(phase: string): string {
  switch (phase) {
    case 'saisieCoup':
      return 'À toi de jouer ton coup.'
    case 'reflexionBot':
      return 'Le bot réfléchit…'
    case 'animationJoueur':
    case 'animationBot':
      return '…'
    case 'revelation':
      return 'C’est fini. Regarde.'
    default:
      return ''
  }
}
