function App() {
  const [view, setView] = React.useState(() => localStorage.getItem('smtm_view') || 'home');
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetVisible, setSheetVisible] = React.useState(false);

  const navigate = (v) => {
    setView(v);
    localStorage.setItem('smtm_view', v);
  };

  const openSheet = () => {
    setSheetOpen(true);
    setTimeout(() => setSheetVisible(true), 10);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => setSheetOpen(false), 280);
  };

  const renderView = () => {
    switch (view) {
      case 'home':       return <HomeView onOpenInput={openSheet} onNav={navigate} />;
      case 'history':    return <HistoryView />;
      case 'private':    return <PrivateView />;
      case 'sos':        return <SOSView />;
      case 'settlement': return <SettlementView />;
      default:           return <HomeView onOpenInput={openSheet} onNav={navigate} />;
    }
  };

  const showNav = view !== 'private';

  return (
    <div className="phone-shell">
      {/* Main Content */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderView()}
      </div>

      {/* Bottom Nav */}
      {showNav && (
        <BottomNav
          active={view}
          onNav={navigate}
          onFab={openSheet}
        />
      )}

      {/* Input Bottom Sheet */}
      {sheetOpen && (
        <>
          <div
            className="overlay"
            style={{ opacity: sheetVisible ? 1 : 0 }}
            onClick={closeSheet}
          />
          <div
            className="sheet"
            style={{
              transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform .3s cubic-bezier(.32,0,.67,0)',
              height: '88%',
            }}
          >
            <InputSheet onClose={closeSheet} />
          </div>
        </>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
