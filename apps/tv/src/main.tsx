import React from 'react';
import ReactDOM from 'react-dom/client';
import { FocusContext, init } from '@noriginmedia/norigin-spatial-navigation';
import App from './tvApp';
import './tv.css';

init({
  visualDebug: false,
  throttle: 80,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FocusContext.Provider value={null}>
      <App />
    </FocusContext.Provider>
  </React.StrictMode>
);

