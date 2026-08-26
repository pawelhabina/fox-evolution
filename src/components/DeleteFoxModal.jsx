import { formatNumber } from '../game/format';
import GuiIcon from './GuiIcon';

export default function DeleteFoxModal({ info, onConfirm, onClose }) {
  if (!info) {
    return null;
  }

  return (
    <div className="game-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="game-modal game-modal--delete" role="dialog" aria-modal="true" aria-labelledby="delete-fox-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="game-modal-icon game-modal-icon--delete" aria-hidden="true">
          <GuiIcon name="foxSell" alt="" size={40} />
        </div>
        <p className="game-modal-kicker">NIEODWRACALNA DECYZJA</p>
        <h3 id="delete-fox-title">Usunąć tego lisa?</h3>
        <p className="game-modal-lead">
          {info.tierData.name} (tier {info.fox.tier}) zniknie z planszy. W zamian otrzymasz <strong>{formatNumber(info.sellValue)} monet</strong>.
        </p>
        <div className="game-modal-actions">
          <button type="button" className="game-modal-cancel" onClick={onClose}>Anuluj</button>
          <button type="button" className="game-modal-confirm game-modal-confirm--delete" onClick={onConfirm}>Usuń i sprzedaj</button>
        </div>
      </section>
    </div>
  );
}
