import type { ReactNode } from 'react'
import './DesignSystemScreen.scss'
import '../grille-en-direct/GrilleEnDirecteScreen.scss'
import '../creation-grille/CreationGrilleScreen.scss'
import '../bibliotheque/BibliothequeScreen.scss'

const COULEURS = [
  { nom: 'paper-bg', var: '--color-paper-bg', hex: '#F7EFDD' },
  { nom: 'paper-card', var: '--color-paper-card', hex: '#FFFDF6' },
  { nom: 'ink', var: '--color-ink', hex: '#4A3222' },
  { nom: 'ink-soft', var: '--color-ink-soft', hex: '#8A7256' },
  { nom: 'terracotta', var: '--color-terracotta', hex: '#C1502E' },
  { nom: 'mustard', var: '--color-mustard', hex: '#E8A33D' },
  { nom: 'sage', var: '--color-sage', hex: '#8A9A5B' },
  { nom: 'line', var: '--color-line', hex: '#DDD0B0' },
]

const TYPOGRAPHIES = [
  { nom: 'display', classe: 'ds-type--display', exemple: 'Nouvelle Grille' },
  { nom: 'headline', classe: 'ds-type--headline', exemple: 'Soirée de Karim' },
  { nom: 'body', classe: 'ds-type--body', exemple: 'On se retrouve tous autour du bingo.' },
  { nom: 'body-sm', classe: 'ds-type--body-sm', exemple: 'Le marié pleure avant le discours' },
  { nom: 'label-caps', classe: 'ds-type--label-caps', exemple: 'Nom de la grille' },
  { nom: 'caption', classe: 'ds-type--caption', exemple: 'Créée le 22 juillet 2026' },
]

const ESPACEMENTS = ['1', '2', '3', '4', '5', '6', 'screen-margin']
const RAYONS = ['sm', 'default', 'md', 'lg', 'full']

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="ds-section">
      <h2 className="ds-section__titre">{titre}</h2>
      <div className="ds-section__contenu">{children}</div>
    </section>
  )
}

export function DesignSystemScreen() {
  return (
    <div className="design-system-screen">
      <header className="design-system-screen__header">
        <h1 className="ds-type--display">Design System</h1>
        <p className="ds-type--caption">
          bingo — « carnet de fête » · page interne, non liée à la navigation.
        </p>
      </header>

      <Section titre="Couleurs">
        <div className="ds-swatches">
          {COULEURS.map((c) => (
            <div className="ds-swatch" key={c.nom}>
              <div className="ds-swatch__pastille" style={{ background: `var(${c.var})` }} />
              <span className="ds-swatch__nom">{c.nom}</span>
              <span className="ds-swatch__hex">{c.hex}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section titre="Typographie">
        <div className="ds-typos">
          {TYPOGRAPHIES.map((t) => (
            <div className="ds-typo" key={t.nom}>
              <span className="ds-typo__label">{t.nom}</span>
              <p className={t.classe}>{t.exemple}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section titre="Espacements">
        <div className="ds-spacings">
          {ESPACEMENTS.map((s) => (
            <div className="ds-spacing" key={s}>
              <span className="ds-spacing__label">space-{s}</span>
              <div className="ds-spacing__barre" style={{ width: `var(--space-${s})` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section titre="Rayons">
        <div className="ds-radii">
          {RAYONS.map((r) => (
            <div className="ds-radius" key={r}>
              <div
                className="ds-radius__carre"
                style={{ borderRadius: `var(--radius-${r})` }}
              />
              <span className="ds-radius__label">radius-{r}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section titre="Boutons">
        <div className="ds-row">
          <button className="cta-primary">CTA principal</button>
          <button className="cta-primary" disabled>
            CTA principal
          </button>
          <button className="cta-secondary">CTA secondaire</button>
          <button className="cta-secondary" disabled>
            CTA secondaire
          </button>
          <button className="cta-close-game">Clôturer la partie</button>
        </div>
      </Section>

      <Section titre="Badges">
        <div className="ds-row">
          <span className="live-badge">
            <span className="live-badge__point" />
            En direct
          </span>
          <span className="partie-terminee-badge">Partie terminée</span>
        </div>
      </Section>

      <Section titre="Chips de taille">
        <div className="size-chips">
          <button className="size-chip size-chip--active">4×4</button>
          <button className="size-chip">5×5</button>
          <button className="size-chip" disabled>
            6×6
          </button>
        </div>
      </Section>

      <Section titre="Champ de saisie">
        <div className="ds-field">
          <label className="creation-grille-screen__label" htmlFor="ds-input-exemple">
            Nom de la grille
          </label>
          <input
            id="ds-input-exemple"
            className="creation-grille-screen__input"
            defaultValue="Soirée de Karim"
          />
        </div>
      </Section>

      <Section titre="Cases de grille">
        <div className="ds-grid-cells">
          <button className="grid-cell" style={{ transform: 'rotate(-1deg)' }}>
            <span className="grid-cell__texte">Le marié pleure</span>
          </button>
          <button className="grid-cell" style={{ transform: 'rotate(0.6deg)' }}>
            <span className="grid-cell__texte">Danse improvisée</span>
            <span className="grid-cell__coche">✓</span>
          </button>
        </div>
      </Section>

      <Section titre="Pile d'avatars">
        <div className="avatar-stack">
          <span className="avatar-stack__avatar avatar-stack__avatar--terracotta">KA</span>
          <span className="avatar-stack__avatar avatar-stack__avatar--sage">SO</span>
          <span className="avatar-stack__avatar avatar-stack__avatar--mustard">LI</span>
          <span className="avatar-stack__compteur">+3</span>
        </div>
      </Section>

      <Section titre="Notifications">
        <div className="ds-notifs">
          <p className="toast ds-preview-static">Karim vient de cocher une case</p>
          <div className="bibliotheque-screen__rappel ds-preview-static">
            Une partie est en cours — reprends où tu en étais.
          </div>
          <div className="vainqueur-overlay ds-preview-static">
            <p className="vainqueur-overlay__texte">Sophie a gagné !</p>
          </div>
        </div>
      </Section>
    </div>
  )
}
