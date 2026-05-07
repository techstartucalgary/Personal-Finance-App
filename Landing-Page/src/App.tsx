import { useEffect } from 'react';
import PageLoader from './components/PageLoader';
import Nav from './components/Nav';
import Hero from './components/Hero';
import TrustStrip from './components/TrustStrip';
import OneScreenIntro from './components/OneScreenIntro';
import PinnedTour from './components/PinnedTour';
import BeforeAfter from './components/BeforeAfter';
import Security from './components/Security';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

export default function App() {
  // Scroll-reveal observer for any element with `.reveal` class
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-sand-100 text-ink-900 selection:bg-peri-400 selection:text-sand-50">
      <PageLoader />
      <Nav />
      <Hero />
      <TrustStrip />
      <OneScreenIntro />
      <PinnedTour />
      <BeforeAfter />
      <Security />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
