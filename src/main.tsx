import { vi } from 'date-fns/locale';
import { StrictMode } from 'react';
import { registerLocale, setDefaultLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import './tailwind.css';
import './index.css';

// Vietnamese month/day names for every DatePicker in the app
registerLocale('vi', vi);
setDefaultLocale('vi');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
