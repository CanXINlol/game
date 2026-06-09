import type { ReactNode } from 'react';

export function ViewOverlay(props: {
  open: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!props.open) return null;

  return (
    <div className="viewer-backdrop" role="dialog" aria-modal="true" aria-label={props.title}>
      <section className="panel viewer-panel">
        <header className="viewer-header">
          <div>
            <p className="section-label">查看器</p>
            <h2>{props.title}</h2>
            {props.hint ? <p className="muted">{props.hint}</p> : null}
          </div>
          <button className="ghost-button" type="button" onClick={props.onClose}>
            关闭
          </button>
        </header>
        {props.children}
      </section>
    </div>
  );
}
