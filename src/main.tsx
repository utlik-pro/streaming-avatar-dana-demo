import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AgoraProvider } from './contexts/AgoraContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AgoraProvider>
      <App />
    </AgoraProvider>
  </React.StrictMode>,
);
