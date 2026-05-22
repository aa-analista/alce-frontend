import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'
import { initThemeEarly } from './hooks/useTheme'

// Aplica el tema guardado al <html> ANTES del primer render para
// evitar el flash de fondo claro en página configurada en oscuro.
initThemeEarly()

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "TU_CLIENT_ID_AQUI"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
