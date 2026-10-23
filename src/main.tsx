import React from 'react';
import ReactDOM from 'react-dom/client';
import './core/androidShareBridge';
import { App } from './App';

const rootEl = document.getElementById('root') || document.getElementById('app');

if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
