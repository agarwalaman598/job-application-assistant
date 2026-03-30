import { Navbar } from '../components/landing/Navbar';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { AutoFillDemo } from '../components/landing/AutoFillDemo';
import { MatchScoreDemo } from '../components/landing/MatchScoreDemo';
import { CTA } from '../components/landing/CTA';
import { Footer } from '../components/landing/Footer';
import { SectionDivider } from '../components/landing/SectionDivider';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-root min-h-screen bg-black">
      <Navbar />
      <Hero />
      <div id="features">
        <Features />
      </div>
      <SectionDivider />
      <AutoFillDemo />
      <SectionDivider />
      <MatchScoreDemo />
      <SectionDivider />
      <CTA />
      <Footer />
    </div>
  );
}
