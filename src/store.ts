/**
 * Source unique de vérité — étape 0, non délégable.
 *
 * **Règle d'architecture valable pour tous les lots : aucune logique de jeu ne vit
 * dans un composant de rendu.** `chess.js` et ce store possèdent l'état ; le rendu
 * n'en est qu'un consommateur.
 *
 * Ce n'est pas de la propreté gratuite : le mini-échiquier 2D SVG sert de mode de
 * secours sans WebGL, et cette règle est ce qui le rend presque gratuit.
 */

import { Chess } from 'chess.js'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CAMP_JOUEUR,
  NOMBRE_DE_COUPS,
  plyVersCoup,
  REGLES_BOT,
  type Case,
  type CoupJoue,
  type NumeroCoup,
  type PhaseJeu,
  type PoseCamera,
  type ProgressionEnigme
} from './types'

/**
 * Seuils de révélation des indices. Aucune énigme ne peut bloquer le cadeau.
 *
 * Exportés parce que l'écran d'intro les **annonce** au joueur. Les réécrire là-bas
 * en dur les ferait diverger dès le premier réglage : le jeu expliquerait une règle
 * qu'il n'applique pas.
 */
export const ECHECS_AVANT_INDICE = 2
export const ECHECS_AVANT_PASSER = 6

interface EtatJeu {
  // ── déroulé
  phase: PhaseJeu
  /** Position courante, en FEN. Persistée : il doit pouvoir fermer l'onglet. */
  fen: string
  historique: CoupJoue[]
  /** Évaluation du bot au dernier coup, en centipions de son point de vue. */
  evalBot: number

  // ── énigmes
  /** Clé = numéro de coup (1..15). */
  progression: Record<NumeroCoup, ProgressionEnigme>

  // ── interface
  poseCamera: PoseCamera
  /** Case sélectionnée en attente d'une destination, ou `null`. */
  selection: Case | null
  /** Réglage d'accessibilité : coupe tremblement et flashs, garde les célébrations. */
  mouvementReduit: boolean
  sonActif: boolean

  // ── dérivés
  coupCourant: () => NumeroCoup
  enigmesVues: () => number
  peutPasser: (coup: NumeroCoup) => boolean
  indicesVisibles: (coup: NumeroCoup) => number
  /**
   * La partie est-elle finie ? **Verrou purement temporel** : `NOMBRE_DE_COUPS`
   * coups du joueur, point.
   *
   * Il n'y a plus d'abandon du bot. La limite de coups est une **vraie limite** :
   * au dernier coup, celui qui a l'avantage gagne. C'est ce qui rend la partie
   * sincère — et ça lève l'objection de départ, « une limite annoncée puis non
   * appliquée est pire qu'aucune limite ». Celle-ci est appliquée.
   */
  partieTerminee: () => boolean
  /**
   * L'issue de la partie, du point de vue du joueur. Le bot joue désormais pour
   * l'équilibre et **peut gagner** : seule la phrase d'accueil de la révélation
   * change, le cadeau se dévoile dans tous les cas.
   */
  issue: () => 'victoire' | 'nulle' | 'defaite'

  // ── actions
  setPhase: (phase: PhaseJeu) => void
  setPoseCamera: (pose: PoseCamera) => void
  setSelection: (c: Case | null) => void
  enregistrerCoup: (coup: CoupJoue) => void
  setEvalBot: (cp: number) => void
  echecEnigme: (coup: NumeroCoup) => void
  resoudreEnigme: (coup: NumeroCoup) => void
  passerEnigme: (coup: NumeroCoup) => void
  setMouvementReduit: (v: boolean) => void
  setSonActif: (v: boolean) => void
  /** Backdoor de secours : saute directement au coup N. À tester avant le soir J. */
  sauterAuCoup: (coup: NumeroCoup) => void
  reinitialiser: () => void
}

const POSITION_DEPART = new Chess().fen()

const progressionVierge = (): ProgressionEnigme => ({
  resolue: false,
  echecs: 0,
  indicesReveles: 0,
  passee: false
})

const etatInitial = {
  phase: 'intro' as PhaseJeu,
  fen: POSITION_DEPART,
  historique: [] as CoupJoue[],
  evalBot: 0,
  progression: {} as Record<NumeroCoup, ProgressionEnigme>,
  // L'échiquier 3D est la vue par défaut : c'est le cadeau qu'on montre.
  // On ne bascule en vue de dessus que pour jouer un coup.
  poseCamera: 'iso' as PoseCamera,
  selection: null as Case | null,
  mouvementReduit: false,
  sonActif: false
}

export const useJeu = create<EtatJeu>()(
  persist(
    (set, get) => ({
      ...etatInitial,

      // ── dérivés
      coupCourant: () => plyVersCoup(get().historique.length),

      enigmesVues: () =>
        Object.values(get().progression).filter((p) => p.resolue || p.passee).length,

      peutPasser: (coup) => (get().progression[coup]?.echecs ?? 0) >= ECHECS_AVANT_PASSER,

      indicesVisibles: (coup) => {
        const echecs = get().progression[coup]?.echecs ?? 0
        return Math.min(2, Math.floor(echecs / ECHECS_AVANT_INDICE))
      },

      partieTerminee: () => {
        // Compte les coups DU JOUEUR effectivement joués.
        const coupsJoueur = get().historique.filter((c) => c.camp === CAMP_JOUEUR).length
        return coupsJoueur >= NOMBRE_DE_COUPS
      },

      issue: () => {
        const { evalBot } = get()
        // `evalBot` est du point de vue du bot : négatif = le joueur mène.
        if (evalBot <= -REGLES_BOT.seuilAvantage) return 'victoire'
        if (evalBot >= REGLES_BOT.seuilAvantage) return 'defaite'
        return 'nulle'
      },

      // ── actions
      setPhase: (phase) => set({ phase }),
      setPoseCamera: (poseCamera) => set({ poseCamera }),
      setSelection: (selection) => set({ selection }),
      setEvalBot: (evalBot) => set({ evalBot }),
      setMouvementReduit: (mouvementReduit) => set({ mouvementReduit }),
      setSonActif: (sonActif) => set({ sonActif }),

      enregistrerCoup: (coup) =>
        set((s) => ({
          historique: [...s.historique, coup],
          fen: coup.fen,
          selection: null
        })),

      echecEnigme: (coup) =>
        set((s) => {
          const p = s.progression[coup] ?? progressionVierge()
          return {
            progression: {
              ...s.progression,
              [coup]: { ...p, echecs: p.echecs + 1 }
            }
          }
        }),

      resoudreEnigme: (coup) =>
        set((s) => ({
          progression: {
            ...s.progression,
            [coup]: { ...(s.progression[coup] ?? progressionVierge()), resolue: true }
          }
        })),

      passerEnigme: (coup) =>
        set((s) => ({
          progression: {
            ...s.progression,
            [coup]: { ...(s.progression[coup] ?? progressionVierge()), passee: true }
          }
        })),

      sauterAuCoup: (coup) => {
        const cible = Math.max(1, Math.min(NOMBRE_DE_COUPS, coup))
        set((s) => {
          const progression = { ...s.progression }
          for (let c = 1; c < cible; c++) {
            progression[c] = { ...(progression[c] ?? progressionVierge()), passee: true }
          }
          return { progression, phase: 'enigme' }
        })
      },

      reinitialiser: () => set({ ...etatInitial, progression: {} })
    }),
    {
      name: 'paul-chess',
      // La position de la partie doit survivre à un rechargement, pas seulement
      // la progression : le jeu est interruptible à tout instant (pas de chronomètre).
      partialize: (s) => ({
        phase: s.phase,
        fen: s.fen,
        historique: s.historique,
        evalBot: s.evalBot,
        progression: s.progression,
        mouvementReduit: s.mouvementReduit,
        sonActif: s.sonActif
      })
    }
  )
)
