'use client'

import { SubAppLayout } from '@/components/sub-app-layout'
import { VRFVisualizer } from './components/vrf-visualizer'

export default function VRFDemoPage() {
  return (
    <SubAppLayout
      title="VRF Demo"
      description="Watch entropy extraction from simulated Kaspa blocks in real-time using the Recursive Folding algorithm."
    >
      <VRFVisualizer />
    </SubAppLayout>
  )
}
