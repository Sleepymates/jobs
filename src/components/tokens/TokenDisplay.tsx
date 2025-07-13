import React from 'react';
import { Coins, Plus } from 'lucide-react';
import Button from '../ui/button';

interface TokenDisplayProps {
  tokensAvailable: number;
  tokensUsed: number;
  onPurchaseClick: () => void;
  className?: string;
}

const TokenDisplay: React.FC<TokenDisplayProps> = ({
  tokensAvailable,
  tokensUsed,
  onPurchaseClick,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Coins className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <div className="text-sm">
          <span className="font-semibold text-blue-800 dark:text-blue-300">
            {tokensAvailable}
          </span>
          <span className="text-blue-600 dark:text-blue-400 ml-1">
            tokens available
          </span>
        </div>
      </div>

      {tokensUsed > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {tokensUsed} used
        </div>
      )}

      <Button
        onClick={onPurchaseClick}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Buy Tokens
      </Button>
    </div>
  );
};

export default TokenDisplay;