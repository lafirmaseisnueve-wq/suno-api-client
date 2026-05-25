import React from 'react';
import { Zap, Server, Info, Cloud, Cpu } from 'lucide-react';

interface BackendSelectorProps {
  backend: 'suno' | 'acestep';
  onBackendChange: (backend: 'suno' | 'acestep') => void;
  disabled?: boolean;
}

export const BackendSelector: React.FC<BackendSelectorProps> = ({ backend, onBackendChange, disabled }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-zinc-400" />
          Generation Backend
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Suno API */}
        <button
          onClick={() => onBackendChange('suno')}
          disabled={disabled}
          className={`
            relative p-4 rounded-xl border-2 transition-all text-left
            ${backend === 'suno'
              ? 'bg-yellow-500/10 border-yellow-500 shadow-lg shadow-yellow-500/5'
              : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-yellow-500" />
              <span className={`font-semibold ${backend === 'suno' ? 'text-yellow-400' : 'text-zinc-200'}`}>
                Suno API
              </span>
            </div>
            {backend === 'suno' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500 text-black font-bold">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mb-2">
            Cloud-based AI generation. 6 model versions (V4–V5.5). Credits required. Instant generation.
          </p>
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Fast</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">6 Models</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Voice API</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Callback</span>
          </div>
        </button>

        {/* ACE-Step Local */}
        <button
          onClick={() => onBackendChange('acestep')}
          disabled={disabled}
          className={`
            relative p-4 rounded-xl border-2 transition-all text-left
            ${backend === 'acestep'
              ? 'bg-green-500/10 border-green-500 shadow-lg shadow-green-500/5'
              : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-green-500" />
              <span className={`font-semibold ${backend === 'acestep' ? 'text-green-400' : 'text-zinc-200'}`}>
                ACE-Step
              </span>
            </div>
            {backend === 'acestep' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500 text-black font-bold">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mb-2">
            Local AI generation. Fine-grained control over inference. No credits needed. Requires local models.
          </p>
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Local</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Free</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">LoRA</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Advanced</span>
          </div>
        </button>
      </div>

      {/* Active backend info */}
      <div className={`p-3 rounded-lg border text-sm ${
        backend === 'suno'
          ? 'bg-yellow-500/5 border-yellow-500/20'
          : 'bg-green-500/5 border-green-500/20'
      }`}>
        {backend === 'suno' ? (
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-zinc-400 text-xs">
              <span className="font-medium text-yellow-400">Suno API:</span> Cloud generation with callback-based workflow.
              Supports V4–V5.5 models, vocal gender, add-vocals/instrumental, covers, extend, voice cloning, MIDI, mashups,
              and music videos. Requires API key and callback URL.
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <Server className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <div className="text-zinc-400 text-xs">
              <span className="font-medium text-green-400">ACE-Step:</span> Local generation with full parameter control.
              Supports text2music, cover, retake, lego, extend, repaint. Requires local model checkpoints.
              Unlimited generation with no credits.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
