export const G = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  width: 100%;
  font-family: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  background: #e2e5ea;
  color: var(--text);
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

body { font-size: 14px; }

.app-root {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  position: relative;
}

@media (min-width: 431px) and (min-height: 845px) {
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .app-root { max-width: 390px; height: 844px; border-radius: 40px; box-shadow: 0 30px 80px rgba(0,0,0,.25); }
}

.view-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 100px;
}
.view-content::-webkit-scrollbar { display: none; }

.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 84px;
  background: var(--nav-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 8px 16px;
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  cursor: pointer;
  padding: 8px 4px;
  -webkit-tap-highlight-color: transparent;
}

.nav-fab {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-l));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -28px;
  box-shadow: 0 4px 16px rgba(28,43,74,.4);
  cursor: pointer;
  border: 4px solid var(--bg);
  transition: transform .15s;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}
.nav-fab:active { transform: scale(.93); }

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 200;
  transition: opacity .25s;
}

.sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--surface);
  border-radius: 28px 28px 0 0;
  z-index: 201;
  max-height: 92%;
  display: flex;
  flex-direction: column;
}

.sheet-handle {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: #D1D5DB;
  margin: 12px auto 4px;
  flex-shrink: 0;
}

button { border: none; background: none; cursor: pointer; font-family: inherit; color: inherit; }
input, textarea, select { font-family: inherit; color: var(--text); }
input::placeholder { color: var(--text-faint); }

::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 99px;
  outline: none;
  cursor: pointer;
  border: none;
  background: var(--border);
}
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid var(--surface);
  box-shadow: 0 2px 10px rgba(0,0,0,.2);
  cursor: pointer;
  transition: transform .15s;
}
input[type=range]::-webkit-slider-thumb:active { transform: scale(1.2); }
input[type=range]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid var(--surface);
  box-shadow: 0 2px 10px rgba(0,0,0,.2);
  cursor: pointer;
}
input[type=range]::-moz-range-track { height: 6px; border-radius: 99px; background: var(--border); }

@keyframes up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-10px); } 40% { transform: translateX(10px); } 60% { transform: translateX(-10px); } 80% { transform: translateX(10px); } }

.u1 { animation: up .35s ease both; }
.u2 { animation: up .35s .07s ease both; }
.u3 { animation: up .35s .14s ease both; }
.u4 { animation: up .35s .21s ease both; }
.u5 { animation: up .35s .28s ease both; }
.u6 { animation: up .35s .35s ease both; }
.shake { animation: shake .4s ease; }
`;
