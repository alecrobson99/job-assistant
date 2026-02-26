import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FlowWireframes from './FlowWireframes.jsx'

const showWireframes = new URLSearchParams(window.location.search).get('wireframes') === '1';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {showWireframes ? <FlowWireframes /> : <App />}
  </StrictMode>,
)
