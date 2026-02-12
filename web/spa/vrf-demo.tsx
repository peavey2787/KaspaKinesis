import React from 'react'
import { createRoot } from 'react-dom/client'
import { SpaLayout } from './SpaLayout'
import { VRFVisualizer } from '../app/vrf-demo/components/vrf-visualizer'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('VRF SPA root element not found')
}

const root = createRoot(rootElement)
root.render(
  <SpaLayout
    title="VRF Demo"
    description="Watch entropy extraction from simulated Kaspa blocks in real-time using the Recursive Folding algorithm."
  >
    <VRFVisualizer />
  </SpaLayout>
)
