import type { EventTool } from '../game/effects';
import { localizeText } from '../game/localization';

export function ToolPanel(props: { tools: EventTool[]; compact?: boolean }) {
  if (props.compact) {
    return (
      <section className="panel tool-panel compact">
        <details>
          <summary>工具 {props.tools.length} 个</summary>
          <div className="tools-list">
            {props.tools.map((tool) => (
              <article key={tool.id} className="tool-item">
                <strong>{tool.name}</strong>
                <p>{localizeText(tool.description)}</p>
              </article>
            ))}
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="panel tool-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">工具</p>
          <h2>当前拥有工具</h2>
        </div>
        <span className="status-pill">{props.tools.length}</span>
      </div>
      <div className="tools-list">
        {props.tools.map((tool) => (
          <article key={tool.id} className="tool-item">
            <strong>{tool.name}</strong>
            <p>{localizeText(tool.description)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
