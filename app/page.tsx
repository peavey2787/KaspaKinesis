import { Navbar } from '@/components/navbar'
import {
  HeroSection,
  ProblemSolutionSection,
  FeaturesSection,
  ArchitectureSection,
  DemosSection,
  TeamSection,
  FAQSection,
  Footer,
} from '@/components/sections'

export default function HomePage() {
  return (
    <main className="relative">
      <Navbar />
      <HeroSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <ArchitectureSection />
      <DemosSection />
      <TeamSection />
      <FAQSection />
      <Footer />
    </main>
  )
}
