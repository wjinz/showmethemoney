/**
 * NumPad — 공통 숫자 키패드 컴포넌트 (Task 3-3)
 *
 * InputModal.jsx, EntryView.jsx, TxEditModal.jsx에 중복된 키패드 코드를 단일 컴포넌트로 통합.
 * THEME_TOKENS를 활용하여 렌더마다 새 객체를 생성하지 않도록 최적화.
 */
import { THEME_TOKENS as T } from "../styles/tokens";

/** @type {(string | number)[]} */
const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"];

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: T.spacing.sm,
};

/**
 * @param {{ value: string, onChange: (v: string) => void, maxLength?: number }} props
 */
export function NumPad({ value, onChange, maxLength = 9 }) {
  /**
   * @param {string | number} key
   */
  const press = (key) => {
    if (key === "C")  { onChange(""); return; }
    if (key === "⌫") { onChange(value.slice(0, -1)); return; }
    if (value.length >= maxLength) return;
    onChange(value + String(key));
  };

  return (
    <div style={gridStyle}>
      {KEYS.map((k) => (
        <button
          key={k}
          onClick={() => press(k)}
          style={{
            padding: `${T.spacing.md}px`,
            fontSize: 20,
            borderRadius: T.radius.md,
            border: `1px solid ${T.color.border}`,
            background: k === "C" ? T.color.surfaceAlt : T.color.surface,
            color: k === "C" ? T.color.danger : T.color.text,
            cursor: "pointer",
            fontWeight: k === "⌫" ? 700 : 400,
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
