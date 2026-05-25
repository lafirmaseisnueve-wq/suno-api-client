import React, { useState, useEffect, useCallback } from 'react';
import { Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { sunoApi } from '../services/api';

interface CreditsDisplayProps {
  compact?: boolean;
  onCreditsUpdate?: (credits: number) => void;
}

export const CreditsDisplay: React.FC<CreditsDisplayProps> = ({ compact = false, onCreditsUpdate }) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCredits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sunoApi.getCredits();
      const creditsLeft = data.credits_left ?? data.credits ?? 0;
      const total = data.total_credits ?? creditsLeft;
      setCredits(creditsLeft);
      setTotalCredits(total);
      onCreditsUpdate?.(creditsLeft);
    } catch (err) {
      console.error('Error loading Suno credits:', err);
      setError('Unable to load credits');
    } finally {
      setIsLoading(false);
    }
  }, [onCreditsUpdate]);

  useEffect(() => {
    loadCredits();
    const interval = setInterval(loadCredits, 300000); // 5 min refresh
    return () => clearInterval(interval);
  }, [loadCredits]);

  const getCreditsColor = () => {
    if (credits === null) return 'text-zinc-400';
    if (credits <= 10) return 'text-red-400';
    if (credits <= 50) return 'text-yellow-400';
    return 'text-green-400';
  };

  const creditsPercentage = totalCredits > 0 && credits !== null ? (credits / totalCredits) * 100 : 0;

  if (compact) {
    return (
      <button
        onClick={loadCredits}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 hover:border-zinc-600 transition-colors"
        title="Suno API Credits"
      >
        <Zap className={`w-3.5 h-3.5 ${credits !== null && credits <= 10 ? 'text-red-400' : 'text-yellow-500'}`} />
        {isLoading ? (
          <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />
        ) : error ? (
          <AlertCircle className="w-3 h-3 text-red-400" />
        ) : (
          <span className={`text-sm font-bold ${getCreditsColor()}`}>
            {credits ?? '—'}
          </span>
        )}
        <span className="text-[10px] text-zinc-500">credits</span>
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold text-zinc-200">Suno Credits</span>
        </div>
        <button
          onClick={loadCredits}
          disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-400 py-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      ) : credits !== null ? (
        <div>
          <div className={`text-3xl font-bold ${getCreditsColor()} mb-1`}>
            {credits}
          </div>
          <div className="text-xs text-zinc-500 mb-3">
            of {totalCredits} credits available
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                creditsPercentage <= 10
                  ? 'bg-red-500'
                  : creditsPercentage <= 50
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${creditsPercentage}%` }}
            />
          </div>

          {/* Low credits warning */}
          {credits <= 10 && (
            <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-400">
                Low credits! Recharge to continue generating music.
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
