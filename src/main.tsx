import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App'
import InventoryProvider from './state/InventoryProvider'

// HashRouter keeps addresses like /stocknest/#/products/ING-0012, which work on GitHub Pages
// without any server set-up (a refresh always loads index.html).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <InventoryProvider>
        <App />
      </InventoryProvider>
    </HashRouter>
  </StrictMode>,
)
