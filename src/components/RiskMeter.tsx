export function RiskMeter(props: { risk: number; maxRisk: number }) {
  const ratio = Math.min(1, props.risk / props.maxRisk);
  const level = ratio >= 0.75 ? 'danger' : ratio >= 0.45 ? 'warning' : 'safe';

  return (
    <section className={`panel visual-meter risk-meter ${level}`}>
      <div className="section-heading">
        <div>
          <p className="section-label">风险条</p>
          <h2>
            {props.risk.toFixed(1)} / {props.maxRisk}
          </h2>
        </div>
        <span className="status-pill">
          {level === 'danger' ? '危险' : level === 'warning' ? '警戒' : '安全'}
        </span>
      </div>
      <div className="meter-bar">
        <div style={{ width: `${ratio * 100}%` }} />
      </div>
    </section>
  );
}
