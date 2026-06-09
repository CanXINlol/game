export function CashMeter(props: { cash: number; netCash: number }) {
  const hasCashChange = props.netCash !== 0;

  return (
    <section className="panel visual-meter cash-meter">
      <div className="section-heading">
        <div>
          <p className="section-label">现金</p>
          <h2>{props.cash.toFixed(1)}</h2>
        </div>
        {hasCashChange ? (
          <span className="status-pill">
            {props.netCash > 0 ? '+' : ''}
            {props.netCash.toFixed(1)}
          </span>
        ) : null}
      </div>
      <p className="muted">用于买牌、买工具、删牌、升级和降低风险。</p>
    </section>
  );
}
