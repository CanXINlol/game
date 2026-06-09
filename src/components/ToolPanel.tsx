import type { EventTool } from '../game/effects';

export function ToolPanel(props: { tools: EventTool[] }) {
  return (
    <section className="panel tool-panel">
      <div className="section-heading">
        <div>
          <p className="section-label">Tools</p>
          <h2>当前拥有工具</h2>
        </div>
        <span className="status-pill">{props.tools.length}</span>
      </div>
      <div className="tools-list">
        {props.tools.map((tool) => (
          <article key={tool.id} className="tool-item">
            <strong>{tool.name}</strong>
            <p>{tool.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
