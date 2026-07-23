import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './vidarix-refinement.css';
import './vidarix-brand-layout.css';
import './vidarix-social.css';
import './vidarix-mobile-community.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
