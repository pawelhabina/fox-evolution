import hydraSprite from '../../assets/sprites/foxes/fox-elemental-hydra-boss.png';

export default function ElementalFusionTutorialModal({ onClose }) {
  return (
    <div className="game-modal-backdrop fusion-tutorial-backdrop" role="presentation">
      <section className="game-modal fusion-tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="fusion-tutorial-title">
        <p className="game-modal-kicker">NOWY CEL ODKRYTY</p>
        <h3 id="fusion-tutorial-title">Połączenie żywiołów</h3>
        <img className="fusion-tutorial-hydra" src={hydraSprite} alt="Hydra Trójżywiołu" draggable={false} />
        <p className="fusion-tutorial-lead">Pierwszy lis żywiołowy osiągnął poziom 20. Teraz przygotuj pełną drużynę.</p>
        <div className="fusion-tutorial-steps">
          <span><i className="is-fire" />Rozwiń Ognistego Lisa do Lv 20</span>
          <span><i className="is-electric" />Rozwiń Elektrycznego Lisa do Lv 20</span>
          <span><i className="is-water" />Rozwiń Wodnego Lisa do Lv 20</span>
          <span><b>⌨</b>Wpisuj na klawiaturze wskazane litery, zanim skończy się czas</span>
        </div>
        <p className="boss-hint">Po zwycięstwie trzy lisy połączą się na stałe w Hydrę Lv 1. Dwie Hydry tego samego poziomu możesz łączyć aż do Lv 5. Porażka blokuje kolejną próbę na godzinę.</p>
        <button type="button" className="boss-attack-btn" onClick={onClose}>Rozumiem — buduję drużynę</button>
      </section>
    </div>
  );
}
