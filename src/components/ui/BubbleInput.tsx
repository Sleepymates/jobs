import React, { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface BubbleInputProps {
  label?: string;
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  maxItems?: number;
  fullWidth?: boolean;
  id?: string;
}

const BubbleInput: React.FC<BubbleInputProps> = ({
  label,
  value = [],
  onChange,
  placeholder = "Type and press Enter or comma",
  error,
  helperText,
  maxItems,
  fullWidth = false,
  id,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addItem = (item: string) => {
    const trimmedItem = item.trim();
    if (trimmedItem && !value.includes(trimmedItem)) {
      if (!maxItems || value.length < maxItems) {
        onChange([...value, trimmedItem]);
      }
    }
    setInputValue('');
  };

  const removeItem = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addItem(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last item if input is empty and backspace is pressed
      removeItem(value.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Check if comma was typed
    if (newValue.includes(',')) {
      const items = newValue.split(',');
      const lastItem = items.pop() || '';
      
      // Add all complete items (before the last comma)
      items.forEach(item => {
        if (item.trim()) {
          addItem(item);
        }
      });
      
      // Keep the text after the last comma in the input
      setInputValue(lastItem);
    } else {
      setInputValue(newValue);
    }
  };

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      addItem(inputValue);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const isMaxReached = maxItems && value.length >= maxItems;

  return (
    <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
          {maxItems && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              ({value.length}/{maxItems})
            </span>
          )}
        </label>
      )}
      
      <div
        className={`
          min-h-[42px] w-full rounded-md border px-3 py-2 cursor-text
          ${error 
            ? 'border-red-500' 
            : 'border-gray-300 dark:border-gray-600'
          }
          bg-white dark:bg-gray-800
          transition-colors
          ${isMaxReached ? 'opacity-75' : ''}
        `}
        onClick={focusInput}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {/* Render bubbles */}
          {value.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
            >
              {item}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(index);
                }}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          
          {/* Input field */}
          {!isMaxReached && (
            <input
              ref={inputRef}
              id={id}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleInputBlur}
              placeholder={value.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0"
              style={{ boxShadow: 'none' }}
            />
          )}
        </div>
      </div>
      
      {(helperText || error) && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {error || helperText}
        </p>
      )}
      
      {maxItems && isMaxReached && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Maximum of {maxItems} items reached
        </p>
      )}
    </div>
  );
};

export default BubbleInput;