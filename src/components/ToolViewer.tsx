import type { EventTool } from '../game/effects';
import { localizeText } from '../game/localization';
import { ViewOverlay } from './ViewOverlay';

export function ToolViewer(props: {
  open: boolean;
  tools: EventTool[];
  onClose: () => void;
}) {
  return (
    <ViewOverlay
      open={props.open}
      title="工具查看器"
      hint="快捷键 T。工具是长期被动，不在主界面常驻。"
      onClose={props.onClose}
    >
      <div className="viewer-card-grid">
        {props.tools.map((tool) => (
          <article key={tool.id} className="viewer-card">
            <strong>{tool.name}</strong>
            <p>{localizeText(tool.description)}</p>
          </article>
        ))}
        {props.tools.length === 0 ? <p className="viewer-empty">当前没有工具。</p> : null}
      </div>
    </ViewOverlay>
  );
}
