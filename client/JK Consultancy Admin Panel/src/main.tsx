import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {AuthProvider } from './context/AuthContext';

import App from './App';
import './css/style.css';
import './css/satoshi.css';
import 'jsvectormap/dist/css/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';
import { NotificationProvider } from './context/NotificationContext';
import { BannerProvider } from './context/BannerContext';
import{GalleryProvider} from'./context/GalleryContext'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AuthProvider>
    <BannerProvider>
    <GalleryProvider>
    <NotificationProvider>
      <BrowserRouter>
         <App />
      </BrowserRouter>
    </NotificationProvider>
    </GalleryProvider>
    </BannerProvider>
  </AuthProvider>
); 
