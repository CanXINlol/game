import type { ReactNode } from 'react';

export function MainCombatLayout(props: {
  top: ReactNode;
  center: ReactNode;
  hand: ReactNode;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <section className="main-combat-layout">
      <header className="combat-top">{props.top}</header>
      <aside className="combat-left">{props.left}</aside>
      <section className="combat-center">{props.center}</section>
      <aside className="combat-right">{props.right}</aside>
      <section className="combat-hand">{props.hand}</section>
    </section>
  );
}
