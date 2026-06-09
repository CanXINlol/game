import './styles/app.css';

export default function App() {
  return (
    <main className="app-shell">
      <section className="start-panel" aria-labelledby="game-title">
        <p className="eyebrow">轻量 roguelike 股市牌型构筑游戏</p>
        <h1 id="game-title">《涨停之前》</h1>
        <p className="description">虚构股市牌型 roguelike 游戏</p>
        <button className="primary-action" type="button">
          开始新局
        </button>
      </section>
    </main>
  );
}
