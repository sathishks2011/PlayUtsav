import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './tvApp';
import './tv.css';
import { init } from '@noriginmedia/norigin-spatial-navigation';

init({
  // debug: true,
  // visualDebug: true,
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

