import * as React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './ErrorBoundary.jsx'

// PWA Service Worker 등록
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);

  // SW가 공유한 이미지/텍스트를 앱으로 전달
  navigator.serviceWorker.addEventListener('message', (e) => {
    window.dispatchEvent(new CustomEvent('sw-share', { detail: e.data }));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
