// localStorage shim for legacy storage API compatibility
window.storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v ? { key, value: v } : null;
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { deleted: true };
  },
};

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ReyesDelBarrio, { ErrorBoundary } from '../tournament.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ReyesDelBarrio />
    </ErrorBoundary>
  </StrictMode>
);
