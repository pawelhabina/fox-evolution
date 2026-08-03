import { useState } from 'react';
import { HELP_SECTIONS } from '../game/helpContent';
import GuiIcon from './GuiIcon';

export default function HelpModal({ onClose }) {
  const [activeId, setActiveId] = useState(HELP_SECTIONS[0].id);
  const active = HELP_SECTIONS.find((section) => section.id === activeId) || HELP_SECTIONS[0];

  return (
    <div className="help-backdrop" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={onClose}>
      <section className="help-modal pixel-frame" onMouseDown={(event) => event.stopPropagation()}>
        <header className="help-header">
          <div>
            <p>Poradnik Fox Evolution</p>
            <h2 id="help-title">Pomocne informacje</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Zamknij pomoc"><GuiIcon name="close" alt="" size={20} /></button>
        </header>

        <div className="help-layout">
          <nav className="help-nav" aria-label="Kategorie pomocy">
            {HELP_SECTIONS.map((section) => (
              <button key={section.id} type="button" className={section.id === active.id ? 'active' : ''} onClick={() => setActiveId(section.id)}>
                <GuiIcon name={section.icon} alt="" size={19} />
                <span>{section.title}</span>
              </button>
            ))}
          </nav>

          <article className="help-content">
            <div className="help-content-title">
              <span><GuiIcon name={active.icon} alt="" size={28} /></span>
              <div><small>PORADNIK</small><h3>{active.title}</h3></div>
            </div>
            <p className="help-summary">{active.summary}</p>
            <div className="help-tips">
              {active.tips.map(([title, description], index) => (
                <section key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><h4>{title}</h4><p>{description}</p></div>
                </section>
              ))}
            </div>
            <aside className="help-callout"><strong>WSKAZÓWKA</strong><p>{active.callout}</p></aside>
          </article>
        </div>
      </section>
    </div>
  );
}
