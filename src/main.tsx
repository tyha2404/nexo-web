import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'react-datepicker/dist/react-datepicker.css';
import './index.css';
import App from './App.tsx';

// Force browser to bust favicon cache
if (typeof window !== 'undefined') {
  const links = document.querySelectorAll("link[rel*='icon']") as NodeListOf<HTMLLinkElement>;
  links.forEach((link) => {
    const rawHref = link.href.split('?')[0];
    link.href = `${rawHref}?v=${Date.now()}`;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
