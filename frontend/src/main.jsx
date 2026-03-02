import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'sonner'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
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
  </StrictMode>,
)
