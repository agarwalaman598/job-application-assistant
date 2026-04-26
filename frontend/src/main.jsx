import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'sonner'
import App from './App.jsx'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

const AppTree = (
  <HelmetProvider>
    <App />
    <Toaster
      position="bottom-right"
      richColors
      theme="dark"
      toastOptions={{
        style: { fontFamily: 'inherit', fontSize: '0.875rem' },
      }}
    />
  </HelmetProvider>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{AppTree}</GoogleOAuthProvider> : AppTree}
  </StrictMode>,
)
