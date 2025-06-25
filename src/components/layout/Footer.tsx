import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const { theme } = useTheme();

  const openCalendlyPopup = () => {
    // Create Calendly popup
    if (window.Calendly) {
      window.Calendly.initPopupWidget({
        url: 'https://calendly.com/sunnychats/30min'
      });
    } else {
      // Fallback: open in new tab if Calendly widget isn't loaded
      window.open('https://calendly.com/sunnychats/30min', '_blank');
    }
  };

  return (
    <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center">
              <img
                src={theme === 'dark' ? 'https://i.imgur.com/Zq1JAQC.png' : 'https://i.imgur.com/JjXxDdf.png'}
                alt="HellotoHire logo"
                className="h-8 w-auto mr-2"
              />
              <span className="text-lg font-bold text-gray-900 dark:text-white">HellotoHire</span>
            </Link>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Smart hiring, simplified.
We help you publish jobs, collect up to 200 CVs at once, analyze them instantly, and rank candidates based on real content, so you can focus on interviewing, not sorting.
              Find the perfect match with our intelligent recruitment solution.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link to="/post" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Post a Job
                </Link>
              </li>
              <li>
                <Link to="/jobs" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link to="/forgot" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Recover Passcode
                </Link>
              </li>
              <li>
                <button 
                  onClick={openCalendlyPopup}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                >
                  Book a Demo
                </button>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Connect
            </h3>
            <div className="mt-4 flex space-x-4">
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                <span className="sr-only">Github</span>
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            &copy; {year} HellotoHire. All rights reserved.
          </p>
        </div>
      </div>

      {/* Load Calendly widget script */}
      <script 
        src="https://assets.calendly.com/assets/external/widget.js" 
        type="text/javascript" 
        async
      />
    </footer>
  );
};

export default Footer;