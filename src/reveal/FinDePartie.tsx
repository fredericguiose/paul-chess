/**
 * L'écran de fin de partie : la position, le verdict, les chiffres.
 *
 * Il s'insère **avant** le grand chiffre de l'âge, et il sert à séparer deux choses
 * qui étaient mélangées. Avant lui, la barre d'avantage et les statistiques
 * s'affichaient sur l'écran du cadeau : on lui annonçait son cadeau et on lui
 * demandait dans le même souffle de relire son score. Les deux moments se
 * gênaient.
 *
 * Ici on ferme la partie, proprement, comme le fait Chess.com : la position finale
 * telle qu'elle est restée, la barre qui penche du côté du gagnant, les chiffres.
 * Ensuite seulement vient l'anniversaire.
 *
 * Aucun chiffre n'est calculé ici hors de l'historique réel : pas de statistique
 * inventée pour remplir la grille.
 */

import { useJeu } from '../store'
import { Bouton } from '../juice/Bouton'
import { Echiquier2D } from '../board2d/Echiquier2D'
import {
  CAMP_JOUEUR,
  NOMBRE_DE_COUPS,
  type CoupJoue,
  type NumeroCoup,
  type ProgressionEnigme
} from '../types'
import { BarreAvantage } from './BarreAvantage'

/** Ce qu'on annonce en haut, selon qui menait au dernier coup. */
const TITRE: Record<'victoire' | 'nulle' | 'defaite', string> = {
  victoire: 'Tu as gagné',
  nulle: 'Match nul',
  defaite: 'Il a gagné'
}

export interface StatistiquesFin {
  coups: number
  prisesJoueur: number
  prisesBot: number
  resolues: number
  sansIndice: number
  passees: number
  /** Le dernier coup joué, pour le surligner. `null` si l'historique est vide. */
  dernier: CoupJoue | null
  /** La partie s'est-elle finie par un mat ? */
  parMat: boolean
}

/**
 * Les chiffres de fin de partie, comptés sur l'historique réel.
 *
 * ⚠️ **Fonction pure, hors du composant, volontairement.** Ces comptes sont la
 * seule chose de cet écran qu'un test puisse vérifier : un rendu SSR de React sert
 * l'état **initial** du store (zustand répond à `getServerSnapshot` par
 * `getInitialState`), donc l'historique y arrive toujours vide et un test qui lit
 * le HTML mesure zéro quoi qu'il se passe. Ici, `src/reveal/verifier.mjs` appelle
 * la fonction directement et vérifie de vrais nombres.
 *
 * Rien n'est estimé : un coup a pris une pièce si et seulement si `capture` n'est
 * pas nulle, une énigme est passée si et seulement si `passee` est vrai.
 */
export function statistiquesFin(
  historique: readonly CoupJoue[],
  progression: Readonly<Partial<Record<NumeroCoup, ProgressionEnigme>>>
): StatistiquesFin {
  const dernier = historique.length > 0 ? historique[historique.length - 1] : null
  const enigmes = Object.values(progression).filter(Boolean) as ProgressionEnigme[]

  return {
    coups: historique.filter((c) => c.camp === CAMP_JOUEUR).length,
    prisesJoueur: historique.filter((c) => c.camp === CAMP_JOUEUR && c.capture).length,
    prisesBot: historique.filter((c) => c.camp !== CAMP_JOUEUR && c.capture).length,
    resolues: enigmes.filter((p) => p.resolue).length,
    sansIndice: enigmes.filter((p) => p.resolue && p.indicesReveles === 0).length,
    // `passee`, pas `!resolue` : une énigme jamais atteinte n'a pas été passée.
    passees: enigmes.filter((p) => p.passee).length,
    dernier,
    // Le mat termine la partie avant la limite : le dire, sinon le compte de coups
    // ressemble à une erreur.
    parMat: Boolean(dernier?.mat)
  }
}

export function FinDePartie({ onSuite }: { onSuite: () => void }) {
  const fen = useJeu((s) => s.fen)
  const historique = useJeu((s) => s.historique)
  const evalBot = useJeu((s) => s.evalBot)
  const progression = useJeu((s) => s.progression)
  const issue = useJeu((s) => s.issue())

  const { coups, prisesJoueur, prisesBot, resolues, sansIndice, passees, dernier, parMat } =
    statistiquesFin(historique, progression)

  return (
    <div className="mx-auto flex h-full max-w-md flex-col gap-4 overflow-y-auto px-5 py-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="font-titre text-3xl leading-none text-lisere drop-shadow-[0_4px_0_rgba(58,35,19,0.8)]">
          {TITRE[issue]}
        </h1>
        <p className="text-base text-texte-clair/70">
          {parMat
            ? `Échec et mat au ${coups}ᵉ coup`
            : `Fin au ${coups}ᵉ coup sur ${NOMBRE_DE_COUPS}`}
        </p>
      </header>

      {/* La position telle qu'elle est restée, dernier coup surligné. */}
      <div className="mx-auto w-full max-w-xs">
        <Echiquier2D
          fen={fen}
          desactive
          coordonnees
          dernierCoup={dernier ? [dernier.from, dernier.to] : null}
          etiquette="Position finale"
          // Position figée : `desactive` coupe déjà la saisie, ce rappel n'est
          // jamais appelé.
          onCase={() => {}}
        />
      </div>

      <BarreAvantage evalBot={evalBot} issue={issue} />

      <div className="grid grid-cols-2 gap-2">
        <Stat valeur={coups} libelle="coups joués" />
        <Stat valeur={`${prisesJoueur} / ${prisesBot}`} libelle="prises, toi / lui" />
        <Stat valeur={sansIndice} libelle="énigmes sans indice" />
        {passees > 0 ? (
          <Stat valeur={passees} libelle={passees > 1 ? 'énigmes passées' : 'énigme passée'} />
        ) : (
          <Stat valeur={resolues} libelle="énigmes résolues" />
        )}
      </div>

      <Bouton taille="lg" pleineLargeur onClick={onSuite}>
        Suivant
      </Bouton>
    </div>
  )
}

/** Un chiffre et son libellé, dans une case bois. */
function Stat({ valeur, libelle }: { valeur: number | string; libelle: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-2xl border-2 border-lisere/50 bg-bois/70 px-2 py-2.5">
      <span className="font-titre text-2xl leading-none tabular-nums text-lisere">
        {valeur}
      </span>
      <span className="text-center text-xs leading-tight text-texte-clair/70">{libelle}</span>
    </div>
  )
}
