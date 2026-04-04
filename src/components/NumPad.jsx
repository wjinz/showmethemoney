export function NumPad({ value, onChange }) {
  const press = (v, e) => {
    if (e) e.stopPropagation();
    if (v === "C") onChange("");
    else if (v === "⌫") onChange(value.slice(0, -1));
    else if (value.length < 9) onChange(value + v);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
      {[1,2,3,4,5,6,7,8,9,"C",0,"⌫"].map(v => (
        <button
          key={v}
          onClick={(e) => press(String(v), e)}
          style={{
            height: 52, borderRadius: 13,
            border: "1px solid var(--border)",
            background: v === "C"
              ? "rgba(217,95,95,0.08)"
              : v === "⌫"
              ? "rgba(200,168,75,0.08)"
              : "var(--bg2)",
            fontSize: 19, fontWeight: 700, cursor: "pointer",
            color: v === "C" ? "var(--red)"
              : v === "⌫" ? "var(--gold)"
              : "var(--text)",
            transition: "background .1s",
            WebkitTapHighlightColor: "transparent"
          }}
        >{v}</button>
      ))}
    </div>
  );
}
