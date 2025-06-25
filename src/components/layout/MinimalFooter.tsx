import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

const MinimalFooter: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <footer className="bg-beige-50 dark:bg-black transition-colors duration-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <button 
            onClick={handleLogoClick}
            className="flex items-center focus:outline-none hover:opacity-80 transition-opacity duration-200"
          >
            <img
              src={theme === 'dark' ? 'https://i.imgur.com/Zq1JAQC.png' : 'https://i.imgur.com/JjXxDdf.png'}
              alt="HellotoHire logo"
              className="h-8 w-auto mr-2"
            />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              HellotoHire
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default MinimalFooter;