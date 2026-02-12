import { Navbar } from '@/components/navbar'
import {
  HeroSection,
  DemoVideoSection,
  ProblemSolutionSection,
  FeaturesSection,
  ArchitectureSection,
  DemosSection,
  EconomicsSection,
  FAQSection,
  Footer,
} from '@/components/sections'

export default function HomePage() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      <DemoVideoSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <ArchitectureSection />
      <DemosSection />
      <EconomicsSection />
      <FAQSection />
      <Footer />
    </main>
  )
}
