'use client'

import { SubAppLayout } from '@/components/sub-app-layout'
import { RelayVisualizer } from './components/relay-visualizer'

export default function RelayDemoPage() {
  return (
    <SubAppLayout
      title="Relay Demo"
      description="Visualize how the Kaspa Relay enables CGNAT↔CGNAT connectivity without traditional TURN/STUN servers."
    >
      <RelayVisualizer />
    </SubAppLayout>
  )
}
