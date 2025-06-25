import React, { useEffect } from 'react';
import { FloatingPaths } from '../components/ui/background-paths';
import { AnimatedTitle } from '../components/ui/typography';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const DemoPage: React.FC = () => {
  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Initialize Calendly widget
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up script when component unmounts
      const existingScript = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-beige-50 dark:bg-black">
      <Header />
      <div className="relative flex-grow">
        <div className="absolute inset-0 pointer-events-none">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <AnimatedTitle text="Book a Demo" />
          </div>

          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div 
              className="calendly-inline-widget" 
              data-url="https://calendly.com/sunnychats/30min" 
              style={{ minWidth: '320px', height: '700px' }}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DemoPage;