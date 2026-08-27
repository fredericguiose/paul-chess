/**
 * Les entrées de réponse, une par type d'énigme — lot C.
 *
 * Ce composant ne valide rien et ne touche pas au store : il produit une chaîne et
 * la remonte à `BandeEnigme`. La convention de cette chaîne est celle de
 * `verifierReponse` (`validation.ts`) : texte tapé, chiffres, index de bouton, ou
 * case (`'d4'`).
 *
 * Contraintes de contexte, toutes structurantes ici :
 * - **téléphone, une main** : cibles tactiles larges, rien sous le pouce qui puisse
 *   être touché par erreur ;
 * - **huit personnes autour** : gros caractères, l'écran est montré ;
 * - **aucun chronomètre** : rien ne se ferme tout seul, rien ne se valide tout seul.
 */

import { useEffect, useRef, useState } from 'react'
// Le mini-échiquier vient du lot E. Contrat figé :
// <Echiquier2D fen={string} onCase={(c: Case) => void} surlignees?={Case[]} />
// @ts-ignore -- fourni par le lot E, résolu à l'assemblage
import { Echiquier2D } from '../board2d/Echiquier2D'
import { Bouton } from '../juice/Bouton'
import type { Case, Enigme } from '../types'

export interface ChampReponseProps {
  enigme: Enigme
  /** Appelé à chaque tentative. La validation se fait chez l'appelant. */
  onValider: (valeur: string) => void
  /** Pendant l'animation du coup, ou une fois l'énigme résolue. */
  desactive?: boolean
}

export function ChampReponse({ enigme, onValider, desactive = false }: ChampReponseProps) {
  switch (enigme.type) {
    case 'text':
    case 'offscreen':
      return <ChampTexte enigme={enigme} onValider={onValider} desactive={desactive} />
    case 'code':
      return <PaveNumerique onValider={onValider} desactive={desactive} />
    case 'choice':
      return <Choix enigme={enigme} onValider={onValider} desactive={desactive} />
    case 'square-puzzle':
      return <MiniPlateau enigme={enigme} onValider={onValider} desactive={desactive} />
    case 'square-live':
      return <AttenteCaseLive />
  }
}

// ─────────────────────────────────────────────────────────── text / offscreen

function ChampTexte({ enigme, onValider, desactive }: Required<ChampReponseProps>) {
  const [valeur, setValeur] = useState('')
  const champ = useRef<HTMLInputElement>(null)

  // Nouvelle énigme : on repart d'un champ vide. Sans ça, la réponse précédente
  // reste affichée et il la revalide par réflexe.
  useEffect(() => setValeur(''), [enigme.id])

  const valider = () => {
    if (desactive || valeur.trim() === '') return
    onValider(valeur)
    setValeur('')
    champ.current?.focus()
  }

  return (
    <div className="flex gap-2">
      <input
        ref={champ}
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') valider()
        }}
        disabled={desactive}
        // Le clavier du téléphone ne doit ni corriger ni mettre de majuscule : la
        // validation est déjà tolérante, l'autocorrection ne fait qu'ajouter du bruit.
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="send"
        placeholder={enigme.type === 'offscreen' ? 'Ce que tu as trouvé…' : 'Ta réponse…'}
        aria-label="Ta réponse"
        className="min-w-0 flex-1 rounded-xl border-2 border-contour/60 bg-texte-clair px-4 py-3 font-corps text-xl text-texte outline-none placeholder:text-texte/40 focus:border-accent"
      />
      <Bouton variante="validation" onClick={valider} disabled={desactive || valeur.trim() === ''}>
        OK
      </Bouton>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── code

const TOUCHES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'] as const

/**
 * Pavé numérique. Vibration coupée sur les chiffres : douze touches sollicitées en
 * rafale feraient buzzer le téléphone en continu. Elle reste sur `OK`, qui est
 * l'action.
 */
function PaveNumerique({
  onValider,
  desactive
}: {
  onValider: (v: string) => void
  desactive: boolean
}) {
  const [code, setCode] = useState('')

  const appuyer = (touche: string) => {
    if (desactive) return
    if (touche === '⌫') return setCode((c) => c.slice(0, -1))
    if (touche === 'OK') {
      if (code === '') return
      onValider(code)
      return setCode('')
    }
    // Un code plus long que 6 chiffres n'existe pas dans le jeu : au-delà, c'est une
    // faute de frappe et l'affichage déborderait.
    setCode((c) => (c.length >= 6 ? c : c + touche))
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        aria-live="polite"
        className="rounded-xl border-2 border-contour/60 bg-texte-clair px-4 py-2 text-center font-titre text-3xl tracking-[0.3em] text-texte"
      >
        {code === '' ? '—' : code}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TOUCHES.map((t) => (
          <Bouton
            key={t}
            variante={t === 'OK' ? 'validation' : t === '⌫' ? 'bois' : 'accent'}
            taille="sm"
            pleineLargeur
            vibration={t === 'OK'}
            disabled={desactive || (t === 'OK' && code === '')}
            onClick={() => appuyer(t)}
          >
            {t}
          </Bouton>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── choice

function Choix({ enigme, onValider, desactive }: Required<ChampReponseProps>) {
  const choix = enigme.choix ?? []
  /**
   * Les propositions déjà tentées restent grisées. Sans ça, à quatre boutons, il
   * suffit de tous les taper : l'énigme n'en est plus une, et le compteur d'échecs
   * fait apparaître les indices pour rien.
   */
  const [tentes, setTentes] = useState<number[]>([])
  useEffect(() => setTentes([]), [enigme.id])

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {choix.map((c, i) => (
        <Bouton
          key={c}
          variante="accent"
          pleineLargeur
          disabled={desactive || tentes.includes(i)}
          onClick={() => {
            setTentes((t) => [...t, i])
            onValider(String(i))
          }}
        >
          {c}
        </Bouton>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────── square-puzzle

function MiniPlateau({ enigme, onValider, desactive }: Required<ChampReponseProps>) {
  const [tentee, setTentee] = useState<Case | null>(null)
  useEffect(() => setTentee(null), [enigme.id])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full max-w-[16rem]">
        <Echiquier2D
          fen={enigme.fenPuzzle ?? ''}
          surlignees={tentee ? [tentee] : []}
          onCase={(c: Case) => {
            if (desactive) return
            setTentee(c)
            onValider(c)
          }}
        />
      </div>
      <p className="text-center text-sm text-texte-clair/70">Touche une case du petit plateau.</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── square-live

/**
 * Le slot 7. Rien à saisir ici : le toucher est capté sur le **plateau principal**
 * par le lot B, et remonte à `BandeEnigme` par la prop `caseTouchee`. C'est
 * exactement pour cette énigme que la bande n'est pas une modale — une modale
 * cacherait le plateau et la rendrait injouable.
 */
function AttenteCaseLive() {
  return (
    <p className="rounded-xl border-2 border-dashed border-lisere/60 px-4 py-3 text-center font-titre text-lg text-lisere">
      Touche la case sur le grand plateau ↑
    </p>
  )
}
