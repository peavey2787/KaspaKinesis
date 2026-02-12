import React from 'react'
import { createRoot } from 'react-dom/client'
import { SpaLayout } from './SpaLayout'
import { RelayVisualizer } from '../app/relay-demo/components/relay-visualizer'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Relay SPA root element not found')
}

const root = createRoot(rootElement)
root.render(
  <SpaLayout
    title="Relay Demo"
    description="Visualize how the Kaspa Relay enables CGNAT to CGNAT connectivity without traditional TURN or STUN servers."
  >
    <RelayVisualizer />
  </SpaLayout>
)
