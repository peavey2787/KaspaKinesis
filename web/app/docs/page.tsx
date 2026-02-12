'use client'

import { SubAppLayout } from '@/components/sub-app-layout'
import { DocsContent } from './components/docs-content'

export default function DocsPage() {
  return (
    <SubAppLayout
      title="Documentation"
      description="Comprehensive guides for understanding and integrating Kaspa Kinesis into your projects."
    >
      <DocsContent />
    </SubAppLayout>
  )
}
