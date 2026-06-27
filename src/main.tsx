import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initWebVitalsLogging } from './utils/reportWebVitals'

const rootElement = document.getElementById('root')!
createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

function markHydrated() {
  if ('__SSR_HYDRATED__' in window) {
    return
  }

  Object.defineProperty(window, '__SSR_HYDRATED__', {
    value: true,
    writable: false,
    configurable: false,
  })

  rootElement.setAttribute('data-hydration-state', 'hydrated')
  document.documentElement.setAttribute('data-hydration', 'hydrated')
  document.body?.setAttribute('data-hydration', 'hydrated')


  initWebVitalsLogging()
}

if (document.readyState === 'loading') {
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      queueMicrotask(markHydrated)
    },
    { once: true },
  )
} else {
  queueMicrotask(markHydrated)
}
