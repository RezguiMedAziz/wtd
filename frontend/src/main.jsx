import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { UserProvider } from './context/UserContext';
import { SoundProvider } from './context/SoundContext';
import { CustomizationProvider } from './context/CustomizationContext';
import { CartProvider } from './context/Cartcontext';
import { AuthGateProvider } from './context/AuthGateContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <SoundProvider>
          <CartProvider>
            <AuthGateProvider>
              <CustomizationProvider>
                <App />
              </CustomizationProvider>
            </AuthGateProvider>
          </CartProvider>
        </SoundProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);