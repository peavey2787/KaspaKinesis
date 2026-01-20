'use client'

import { SubAppLayout } from '@/components/sub-app-layout'
import { ToyGridGame } from './components/toy-grid-game'

export default function GameDemoPage() {
  return (
    <SubAppLayout
      title="Toy Grid Game"
      description="A turn-based grid game demonstrating provable randomness from Kaspa blocks and deterministic state management."
    >
      <ToyGridGame />
    </SubAppLayout>
  )
}