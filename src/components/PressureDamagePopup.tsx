export function PressureDamagePopup(props: { damage: number }) {
  if (props.damage <= 0) {
    return null;
  }

  return <div className="pressure-damage-popup">市场压力 -{props.damage.toFixed(1)}</div>;
}
