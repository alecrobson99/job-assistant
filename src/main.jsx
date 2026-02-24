import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FlowScaffoldApp from './FlowScaffoldApp.jsx'

const useFlowScaffold = import.meta.env.VITE_ENABLE_FLOW_SCAFFOLD === '1'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {useFlowScaffold ? <FlowScaffoldApp /> : <App />}
  </StrictMode>,
)
