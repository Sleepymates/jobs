import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react';
import Button from '../ui/button';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/authStore';
import SubscriptionStatus from '../stripe/SubscriptionStatus';

interface HeaderProps {
  companyLogo?: string;
  companyName?: string;
}

const Header: React.FC<HeaderProps> = ({ companyLogo, companyName }) => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { isLoggedIn, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Enhanced navigation function that always scrolls to top
  const navigateAndScrollToTop = (path: string) => {
    if (location.pathname === path) {
      // If already on the page, just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Navigate to new page
      navigate(path);
    }
  };

  // Handle logo click - always go to home and scroll to top
  const scrollToTop = () => {
    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate('/');
    }
  };

  // Handle section scrolling on homepage
  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate(`/?scrollTo=${sectionId}`);
      return;
    }

    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Effect to handle scroll-to-top and section scrolling
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const scrollTo = params.get('scrollTo');
    
    if (scrollTo) {
      // Handle section scrolling with delay for page load
      setTimeout(() => {
        const section = document.getElementById(scrollTo);
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      // Clean up URL
      navigate('/', { replace: true });
    } else {
      // Always scroll to top when navigating to a new page
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [location.pathname, location.search, navigate]);

  return (
    <>
      <div className="h-24"></div>
      
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <header className="max-w-7xl mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14">
              <div className="flex items-center">
                <button
                  onClick={scrollToTop}
                  className="flex items-center focus:outline-none"
                >
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt={`${companyName || 'Company'} logo`}
                      className="h-8 w-auto mr-2"
                    />
                  ) : (
                    <img
                      src={theme === 'dark' ? 'https://i.imgur.com/Zq1JAQC.png' : 'https://i.imgur.com/JjXxDdf.png'}
                      alt="HelloToHire logo"
                      className="h-8 w-auto mr-2"
                    />
                  )}
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {companyName || 'HellotoHire'}
                  </span>
                </button>
              </div>

              <nav className="hidden md:flex items-center justify-center flex-1 space-x-8">
                <button 
                  onClick={() => navigateAndScrollToTop('/post')}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Post a Job
                </button>
                
                <button 
                  onClick={() => navigateAndScrollToTop('/bulk-analysis')}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Bulk Analysis
                </button>

                <button
                  onClick={() => scrollToSection('pricing')}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Pricing
                </button>

                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  How it Works
                </button>

                <button
                  onClick={() => scrollToSection('faq')}
                  className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  FAQ
                </button>
              </nav>

              <div className="hidden md:flex items-center space-x-4">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>

                {isLoggedIn ? (
                  <div className="flex items-center space-x-4">
                    <SubscriptionStatus />
                    <Button
                      onClick={() => navigateAndScrollToTop('/dashboard')}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Dashboard
                    </Button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => navigateAndScrollToTop('/dashboard')}
                      className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      Log in
                    </button>
                    <Button
                      onClick={() => navigateAndScrollToTop('/post')}
                      size="sm"
                      className="bg-gray-900 hover:bg-gray-800 text-white text-sm py-1.5"
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center md:hidden">
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none mr-1"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                  aria-expanded={isMenuOpen}
                >
                  {isMenuOpen ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {isMenuOpen && (
          <div className="md:hidden mt-2">
            <div className="mx-4 rounded-lg bg-white/80 dark:bg-black/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
              <div className="px-2 pt-2 pb-3 space-y-1">
                <button
                  onClick={() => {
                    navigateAndScrollToTop('/post');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Post a Job
                </button>
                
                <button
                  onClick={() => {
                    navigateAndScrollToTop('/bulk-analysis');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Bulk Analysis
                </button>

                <button
                  onClick={() => {
                    scrollToSection('pricing');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Pricing
                </button>

                <button
                  onClick={() => {
                    scrollToSection('how-it-works');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  How it Works
                </button>

                <button
                  onClick={() => {
                    scrollToSection('faq');
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  FAQ
                </button>

                {isLoggedIn ? (
                  <>
                    <div className="px-3 py-2">
                      <SubscriptionStatus />
                    </div>
                    <Button
                      onClick={() => {
                        navigateAndScrollToTop('/dashboard');
                        setIsMenuOpen(false);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Dashboard
                    </Button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        navigateAndScrollToTop('/dashboard');
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                      Log in
                    </button>
                    <div className="px-3 py-2">
                      <Button
                        onClick={() => {
                          navigateAndScrollToTop('/post');
                          setIsMenuOpen(false);
                        }}
                        fullWidth
                        size="sm"
                        className="bg-gray-900 hover:bg-gray-800 text-white"
                      >
                        Get Started
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Header;