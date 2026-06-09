import type { CardPreviewInfo } from '../game/preview';
import { CardPreviewPanel } from './CardPreviewPanel';

export function CardPreview(props: { preview: CardPreviewInfo | null }) {
  return <CardPreviewPanel preview={props.preview} />;
}
