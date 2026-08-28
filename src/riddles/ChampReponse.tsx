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
import { useJeu } from '../store'
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
      return <PlateauLive onValider={onValider} desactive={desactive} />
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

  /**
   * Énigme de position : le diagramme se met **au-dessus** des boutons, et il est
   * inerte. Le laisser cliquable inviterait à répondre en touchant une case, alors
   * que la réponse est un coup complet, choisi dans la liste — deux gestes pour une
   * seule question, dont un qui ne mène nulle part.
   */
  const diagramme = enigme.fenPuzzle ? (
    <Diagramme fen={enigme.fenPuzzle} etiquette="Position à examiner" />
  ) : null

  return (
    <div className="flex flex-col gap-3">
      {diagramme}
      {/*
        Une colonne, chaque choix sur toute la largeur, **et tous de la même hauteur**.
        En deux colonnes, un énoncé un peu long s'écrasait en bandeau étroit sur six
        lignes — illisible sur un téléphone, alors que ces réponses sont lues à voix
        haute devant le groupe.
        `auto-rows-fr` aligne toutes les lignes sur la plus haute : sans ça, une
        réponse courte donne un bouton deux fois plus petit que son voisin, et la
        taille du bouton devient un indice sur la bonne réponse.
      */}
      <div className="grid auto-rows-fr grid-cols-1 gap-2">
        {choix.map((c, i) => (
          <Bouton
            key={c}
            variante="accent"
            pleineLargeur
            // `h-full` : le bouton remplit sa cellule de grille, qui est déjà
            // alignée sur la plus haute par `auto-rows-fr`.
            className="h-full"
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
    </div>
  )
}

// ─────────────────────────────────────────────────────────── square-puzzle

function MiniPlateau({ enigme, onValider, desactive }: Required<ChampReponseProps>) {
  const [tentee, setTentee] = useState<Case | null>(null)
  useEffect(() => setTentee(null), [enigme.id])

  return (
    <Diagramme
      fen={enigme.fenPuzzle ?? ''}
      tentee={tentee}
      desactive={desactive}
      etiquette="Position de l’énigme"
      onCase={(c) => {
        setTentee(c)
        onValider(c)
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────── square-live

/**
 * Le slot 7. La position à examiner est celle de la **partie en cours** — le bot
 * vient d'y laisser une pièce en prise — mais elle est redonnée ici sous forme de
 * **diagramme généré**, dans la carte, comme les énigmes `square-puzzle`.
 *
 * Pourquoi ne pas se contenter de renvoyer au grand plateau : une énigme qui
 * n'affiche qu'un pavé pointillé (« touche la case là-haut ») ne ressemble plus à
 * une énigme. Les quatorze autres montrent quelque chose à lire ; celle-ci doit
 * montrer la position. Le diagramme est le même composant SVG, alimenté par le FEN
 * du store : aucune position n'est recopiée à la main, elle ne peut donc pas
 * diverger de la partie réelle.
 *
 * Le grand plateau reste actif en parallèle (`onAttenteCaseLive`) : toucher la bonne
 * case là-haut répond aussi. Deux entrées, une seule vérité.
 */
function PlateauLive({
  onValider,
  desactive
}: {
  onValider: (v: string) => void
  desactive: boolean
}) {
  const fen = useJeu((s) => s.fen)
  const [tentee, setTentee] = useState<Case | null>(null)

  return (
    <Diagramme
      fen={fen}
      tentee={tentee}
      desactive={desactive}
      etiquette="Position en cours"
      onCase={(c) => {
        setTentee(c)
        onValider(c)
      }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────── diagramme

/**
 * Le diagramme de position, partagé par les deux énigmes à case.
 *
 * `coordonnees` est activé : sans les lettres et les chiffres en bordure, il doit
 * compter les colonnes de tête pour désigner une case, et il répond à côté. C'est
 * aussi ce qui distingue un diagramme d'échiquier d'un damier décoratif.
 *
 * `max-w-[20rem]` : à 320 px de large, marge de coordonnées comprise, une case fait
 * environ 35 px. Plus étroit, les touchers déraillent d'une case — or ici une case
 * d'écart, c'est une mauvaise réponse.
 */
function Diagramme({
  fen,
  tentee = null,
  desactive = false,
  etiquette,
  onCase
}: {
  fen: string
  tentee?: Case | null
  desactive?: boolean
  etiquette: string
  /** Absent = diagramme **inerte**, à lire seulement (énigmes à choix multiple). */
  onCase?: (c: Case) => void
}) {
  const inerte = onCase == null
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full max-w-[20rem] overflow-hidden rounded-xl border-4 border-contour bg-contour shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
        <Echiquier2D
          fen={fen}
          coordonnees
          surlignees={tentee ? [tentee] : []}
          desactive={desactive || inerte}
          etiquette={etiquette}
          onCase={(c: Case) => {
            if (desactive || inerte) return
            onCase?.(c)
          }}
        />
      </div>
      {!inerte && (
        <p className="text-center text-sm text-texte-clair/70">Touche une case du diagramme.</p>
      )}
    </div>
  )
}
