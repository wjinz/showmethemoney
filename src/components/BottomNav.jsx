import { IcoHome, IcoHistory, IcoLock, IcoSettle, IcoPlus } from "./Icons.jsx";

/**
 * @typedef {'home'|'history'|'private'|'settlement'} NavId
 * @typedef {{ id: NavId, label: string, Ico: (p: { color?: string }) => React.JSX.Element }} NavItem
 */

/** @type {NavItem[]} */
const LEFT_ITEMS = [
  { id: "home",    label: "홈",   Ico: IcoHome },
  { id: "history", label: "내역", Ico: IcoHistory },
];

/** @type {NavItem[]} */
const RIGHT_ITEMS = [
  { id: "private",    label: "프라이빗", Ico: IcoLock },
  { id: "settlement", label: "정산",     Ico: IcoSettle },
];

/**
 * @param {{ active: string, onNav: (id: string) => void, onFab: () => void }} props
 */
export function BottomNav({ active, onNav, onFab }) {
  return (
    <nav className="bottom-nav">
      {LEFT_ITEMS.map(item => <NavButton key={item.id} item={item} active={active} onNav={onNav} />)}
      <div className="nav-fab" onClick={onFab} role="button" aria-label="입력"><IcoPlus /></div>
      {RIGHT_ITEMS.map(item => <NavButton key={item.id} item={item} active={active} onNav={onNav} />)}
    </nav>
  );
}

/**
 * @param {{ item: NavItem, active: string, onNav: (id: string) => void }} props
 */
function NavButton({ item, active, onNav }) {
  const on = active === item.id;
  const color = on ? "#1C2B4A" : "#9CA3AF";
  return (
    <div className="nav-item" onClick={() => onNav(item.id)}>
      <item.Ico color={color} />
      <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, color }}>{item.label}</span>
    </div>
  );
}
