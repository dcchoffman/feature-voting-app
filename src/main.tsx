import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.tsx'
import './index.css'

// Suppress harmless browser extension runtime errors
if (typeof window !== 'undefined') {
  // Suppress unchecked runtime.lastError warnings from browser extensions
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('runtime.lastError') || message.includes('message channel closed')) {
      // Silently ignore browser extension errors
      return;
    }
    originalError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)