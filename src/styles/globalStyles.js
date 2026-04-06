export const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Noto+Sans+KR:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}

/* ── 전역 테마 변수 (기본 다크) ── */
:root{
  color-scheme: dark;
  --card-radius: 20px;
  --bg: #0F172A; /* theme.css와 동기화 */
  --text: #F8FAFC;
  --text2: #94A3B8;
  --text3: #64748B;
  --gold: #10B981;
  --red: #FB7185;
  --green: #34D399;
  --blue: #3B82F6;
  --pink: #F472B6;
  --purple: #8B5CF6;
  --h: var(--blue);
  --w: var(--pink);
  --dim: rgba(255,255,255,0.03);
}

/* ── 라이트 모드 오버라이드 ── */
.light{
  color-scheme: light;
  --bg: #F8FAFC;
  --text: #0F172A;
  --text2: #475569;
  --text3: #94A3B8;
  --dim: rgba(0,0,0,0.03);
}


/* ── 레트로 터미널 (Retro Terminal) ── */
.oldschool{
  --bg:#080a06;
  --bg2:#0f120c;
  --bg3:#161a12;
  --bg4:#1e2418;
  --border:rgba(180,220,80,0.25);
  --border2:rgba(180,220,80,0.45);
  --gold:#b4dc50;
  --goldL:#d4f070;
  --goldD:rgba(180,220,80,0.10);
  --red:#d95f5f;
  --redD:rgba(217,95,95,0.12);
  --green:#4dab87;
  --greenD:rgba(77,171,135,0.12);
  --blue:#5c8de8;
  --blueD:rgba(92,141,232,0.12);
  --pink:#d97fa8;
  --pinkD:rgba(217,127,168,0.12);
  --purple:#9b7ee0;
  --purpleD:rgba(155,126,224,0.12);
  --text:#c8e89a;
  --text2:#7a9a50;
  --text3:#3a5a28;
  --h:var(--blue);--hD:var(--blueD);
  --w:var(--pink);--wD:var(--pinkD);
  --nav-bg:rgba(8,10,6,0.97);
  --track:rgba(180,220,80,0.15);
  --dim:rgba(180,220,80,0.04);
  --card-radius:2px;
}

/* 폰트: 라틴/숫자 → Space Mono, 한글 → Noto Sans KR 자동 폴백 */
.oldschool,
.oldschool input,
.oldschool button,
.oldschool textarea,
.oldschool select {
  font-family: 'Space Mono','Noto Sans KR',monospace !important;
  letter-spacing:0.01em;
}

/* serif 헤더도 Space Mono로 */
.oldschool .serif {
  font-family: 'Space Mono','Noto Sans KR',monospace !important;
  font-style:normal !important;
}

/* 카드: 각진 2px 테두리, flat */
.oldschool .card {
  border-radius:var(--card-radius) !important;
  border:1px solid rgba(180,220,80,0.30) !important;
  background:var(--bg2) !important;
  box-shadow:0 0 0 1px rgba(180,220,80,0.06) !important;
}

/* 버튼: flat + 테두리만, outset/inset 제거 */
.oldschool button:not(.fab) {
  border-radius:var(--card-radius) !important;
  border:1px solid rgba(180,220,80,0.35) !important;
  background:var(--bg3) !important;
  color:var(--text) !important;
  box-shadow:none !important;
}
.oldschool button:not(.fab):active {
  background:rgba(180,220,80,0.12) !important;
  border-color:var(--gold) !important;
  transform:none !important;
}

/* input / select: 각진, 내부 미세하게 밝게 */
.oldschool input[type=text],
.oldschool input[type=number],
.oldschool input[type=date],
.oldschool input[type=range],
.oldschool select,
.oldschool textarea {
  border-radius:var(--card-radius) !important;
  border:1px solid rgba(180,220,80,0.35) !important;
  background:rgba(180,220,80,0.05) !important;
  color:var(--text) !important;
  caret-color:var(--gold);
}

/* scanline 오버레이 */
.oldschool::after {
  content:'';
  position:fixed;inset:0;
  pointer-events:none;
  z-index:9999;
  background:repeating-linear-gradient(
    to bottom,
    transparent 0px,transparent 3px,
    rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px
  );
}

/* 라이트 슬라이더 thumb */
.light input[type=range]::-webkit-slider-thumb{
  background:var(--bg2);border:3px solid var(--bg4);
  box-shadow:0 2px 8px rgba(0,0,0,0.18);
}
.light input[type=range]::-moz-range-thumb{
  background:var(--bg2);border:3px solid var(--bg4);
}

/* ★ body는 기본 배경만 — 텍스트 색은 .app-root가 관리 */
body{background:var(--bg);font-family:'Noto Sans KR',sans-serif;font-size:14px;-webkit-font-smoothing:antialiased}

/* ★ .app-root: 모든 텍스트 색상이 여기서 시작 — 라이트/다크 모두 정확히 cascade */
.app-root{color:var(--text);background:var(--bg)}

.serif{font-family:'DM Serif Display',serif}
input,button,textarea{font-family:'Noto Sans KR',sans-serif;color:var(--text)}
input::placeholder{color:var(--text3)}
::-webkit-scrollbar{width:3px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

input[type=range]{
  -webkit-appearance:none;appearance:none;
  width:100%;height:6px;border-radius:99px;
  outline:none;cursor:pointer;border:none;
}
input[type=range]::-webkit-slider-thumb{
  -webkit-appearance:none;appearance:none;
  width:22px;height:22px;border-radius:50%;
  background:#fff;border:3px solid var(--bg);
  box-shadow:0 2px 10px rgba(0,0,0,.4);
  cursor:pointer;transition:transform .15s;
}
input[type=range]::-webkit-slider-thumb:active{transform:scale(1.2)}
input[type=range]::-moz-range-thumb{
  width:20px;height:20px;border-radius:50%;
  background:#fff;border:3px solid var(--bg);
  box-shadow:0 2px 10px rgba(0,0,0,.4);cursor:pointer;
}
input[type=range]::-moz-range-track{height:6px;border-radius:99px;background:var(--track)}

@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
.u1{animation:up .35s ease both}
.u2{animation:up .35s .07s ease both}
.u3{animation:up .35s .14s ease both}
.u4{animation:up .35s .21s ease both}
.u5{animation:up .35s .28s ease both}
.u6{animation:up .35s .35s ease both}
`;
