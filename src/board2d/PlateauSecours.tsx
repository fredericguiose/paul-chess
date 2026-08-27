/**
 * Plateau de secours — lot E.
 *
 * Le filet sans WebGL : si `Board3D` ne démarre pas (téléphone ancien, WebGL bloqué,
 * contexte perdu), ce composant prend sa place et le jeu se termine quand même. Le
 * soir de l'anniversaire, c'est la seule pièce qui n'a pas le droit d'être décorative.
 *
 * Il n'écrit **aucune règle d'échecs** : `resoudreToucher`, `destinationsLegales` et
 * `caseRoiEnEchec` viennent de `board/interaction.ts`, purs et sans three.js — c'est
 * exactement ce que leur en-tête annonce. Ici il ne reste que la lecture du store et
 * l'habillage d'`Echiquier2D`.
 *
 * Les props reprennent celles de `Board3D` (`onCoup`, `onCaseDesignee`, `saisieActive`)
 * pour que l'orchestration puisse basculer de l'un à l'autre sans se réécrire.
 */

import { useMemo, useState } from 'react'
import { Echiquier2D } from './Echiquier2D'
import {
  campAuTrait,
  caseRoiEnEchec,
  casesLegalesDepuis,
  resoudreToucher
} from '../board/interaction'
import { useJeu } from '../store'
import { couleurs, polices } from '../theme'
import { CAMP_JOUEUR, type Case, type Piece } from '../types'

export interface ProprietesPlateauSecours {
  /** Coup légal désigné. Comme en 3D, **ce composant ne le joue pas**. */
  onCoup?: (from: Case, to: Case, promotion?: Piece) => void
  /** Énigme `square-live` : le toucher désigne une case et ne joue rien. */
  onCaseDesignee?: (c: Case) => void
  /** Par défaut : la saisie n'est ouverte que si le joueur a le trait. */
  saisieActive?: boolean
}

interface PromotionEnAttente {
  from: Case
  to: Case
  choix: Piece[]
}

const NOM_PIECE: Record<Piece, string> = {
  q: 'Dame',
  r: 'Tour',
  b: 'Fou',
  n: 'Cavalier',
  p: 'Pion',
  k: 'Roi'
}

export function PlateauSecours({
  onCoup,
  onCaseDesignee,
  saisieActive
}: ProprietesPlateauSecours) {
  const fen = useJeu((s) => s.fen)
  const historique = useJeu((s) => s.historique)
  const selection = useJeu((s) => s.selection)
  const setSelection = useJeu((s) => s.setSelection)

  const [promotion, setPromotion] = useState<PromotionEnAttente | null>(null)

  const modeDesignation = Boolean(onCaseDesignee)
  const saisiePermise =
    saisieActive ?? (!modeDesignation && campAuTrait(fen) === CAMP_JOUEUR)

  const legales = useMemo(
    () => (selection ? casesLegalesDepuis(fen, selection) : []),
    [fen, selection]
  )
  const echec = useMemo(() => caseRoiEnEchec(fen), [fen])
  const dernier = historique.length > 0 ? historique[historique.length - 1] : null

  const toucher = (touchee: Case) => {
    // Une énigme `square-live` détourne le toucher : on désigne, on ne joue pas.
    if (onCaseDesignee) {
      onCaseDesignee(touchee)
      return
    }
    // Un sélecteur de promotion ouvert absorbe le toucher ; toucher ailleurs l'annule.
    if (promotion) {
      setPromotion(null)
      return
    }
    if (!saisiePermise) return

    const action = resoudreToucher(fen, selection, touchee)
    switch (action.type) {
      case 'selectionner':
        return setSelection(action.case)
      case 'deselectionner':
        return setSelection(null)
      case 'jouer':
        setSelection(null)
        return onCoup?.(action.from, action.to)
      case 'promotion':
        return setPromotion({ from: action.from, to: action.to, choix: action.choix })
      case 'rien':
        return
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Echiquier2D
        fen={fen}
        onCase={toucher}
        selection={selection}
        legales={legales}
        dernierCoup={dernier ? [dernier.from, dernier.to] : null}
        echec={echec}
        coordonnees
        etiquette="Plateau de jeu"
      />

      {promotion && (
        <div
          role="dialog"
          aria-label="Choisis la pièce de promotion"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: `${couleurs.contour}cc`,
            fontFamily: polices.titre
          }}
        >
          {promotion.choix.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                const { from, to } = promotion
                setPromotion(null)
                setSelection(null)
                onCoup?.(from, to, p)
              }}
              style={{
                // 44 px de haut : la cible tactile minimale, même dans le secours.
                minHeight: 44,
                minWidth: '60%',
                borderRadius: 12,
                border: `3px solid ${couleurs.contour}`,
                background: couleurs.accent,
                color: couleurs.texte,
                fontFamily: polices.titre,
                fontSize: 20,
                cursor: 'pointer'
              }}
            >
              {NOM_PIECE[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlateauSecours
