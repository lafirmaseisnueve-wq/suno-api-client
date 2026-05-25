import React from 'react';
import { Music, Zap, Info, Crown, Sparkles } from 'lucide-react';

interface SunoModelSelectorProps {
  model: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export const SUNO_MODELS = [
  {
    id: 'V5_5',
    name: 'Suno v5.5',
    description: 'Voice-Customized generation. Highest quality with custom voice support and vocal gender selection.',
    features: ['Voice customization', 'Vocal gender (m/f)', 'Prompt: 5000 chars', 'Style: 1000 chars'],
    promptLimit: 5000,
    styleLimit: 1000,
    titleLimit: 100,
    supportsGender: true,
    supportsVocal: true,
    recommended: true,
  },
  {
    id: 'V5',
    name: 'Suno v5',
    description: 'Latest generation model with improved musicality, structure, and realistic vocals.',
    features: ['Latest model', 'Vocal gender (m/f)', 'Prompt: 5000 chars', 'Style: 1000 chars'],
    promptLimit: 5000,
    styleLimit: 1000,
    titleLimit: 100,
    supportsGender: true,
    supportsVocal: true,
  },
  {
    id: 'V4_5PLUS',
    name: 'Suno v4.5+',
    description: 'Enhanced v4.5 with richer tones, vocal gender, and add-vocals/add-instrumental support.',
    features: ['Richer tones', 'Vocal gender (m/f)', 'Add vocals/instrumental', 'Prompt: 5000 chars'],
    promptLimit: 5000,
    styleLimit: 1000,
    titleLimit: 100,
    supportsGender: true,
    supportsVocal: true,
  },
  {
    id: 'V4_5ALL',
    name: 'Suno v4.5 All',
    description: 'Better song structure across all genres. No vocal gender but comprehensive genre coverage.',
    features: ['All genres', 'Better structure', 'Prompt: 5000 chars', 'Style: 1000 chars'],
    promptLimit: 5000,
    styleLimit: 1000,
    titleLimit: 80,
    supportsGender: false,
    supportsVocal: false,
  },
  {
    id: 'V4_5',
    name: 'Suno v4.5',
    description: 'Balanced model with smart prompts and good vocal/instrumental performance.',
    features: ['Smart prompts', 'Good vocals', 'Vocal gender (m/f)', 'Prompt: 5000 chars'],
    promptLimit: 5000,
    styleLimit: 1000,
    titleLimit: 100,
    supportsGender: true,
    supportsVocal: false,
  },
  {
    id: 'V4',
    name: 'Suno v4',
    description: 'Proven model with consistent results. Shorter prompt limits, no vocal gender.',
    features: ['Consistent', 'Proven quality', 'Cross-genre', 'Prompt: 3000 chars'],
    promptLimit: 3000,
    styleLimit: 200,
    titleLimit: 80,
    supportsGender: false,
    supportsVocal: false,
  },
] as const;

export type SunoModelId = typeof SUNO_MODELS[number]['id'];

export function getModelLimits(modelId: string) {
  const model = SUNO_MODELS.find(m => m.id === modelId);
  return model ? {
    promptLimit: model.promptLimit,
    styleLimit: model.styleLimit,
    titleLimit: model.titleLimit,
    supportsGender: model.supportsGender,
    supportsVocal: model.supportsVocal,
  } : {
    promptLimit: 5000,
    styleLimit: 1000,
    titleLimit: 100,
    supportsGender: false,
    supportsVocal: false,
  };
}

export const SunoModelSelector: React.FC<SunoModelSelectorProps> = ({ model, onModelChange, disabled }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-200 flex items-center gap-2">
          <Music className="w-4 h-4 text-yellow-500" />
          Suno Model
        </label>
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">
          v5.5 recommended
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {SUNO_MODELS.map((sunoModel) => {
          const isSelected = model === sunoModel.id;
          return (
            <button
              key={sunoModel.id}
              onClick={() => onModelChange(sunoModel.id)}
              disabled={disabled}
              className={`
                relative p-3 rounded-lg border-2 transition-all text-left group
                ${isSelected
                  ? 'bg-yellow-500/15 border-yellow-500 shadow-lg shadow-yellow-500/10'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Recommended badge */}
              {sunoModel.recommended && (
                <div className="absolute -top-2 -right-2">
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500 text-black font-bold">
                    <Crown className="w-3 h-3" />
                    BEST
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {sunoModel.recommended ? (
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <Music className="w-4 h-4 text-zinc-400" />
                  )}
                  <span className={`font-semibold text-sm ${isSelected ? 'text-yellow-400' : 'text-zinc-200'}`}>
                    {sunoModel.name}
                  </span>
                </div>
                {sunoModel.supportsGender && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-400">♪ vocal</span>
                )}
              </div>

              <p className="text-xs text-zinc-400 mb-2 line-clamp-2">{sunoModel.description}</p>

              <div className="flex flex-wrap gap-1">
                {sunoModel.features.slice(0, 3).map((feature, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-300"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* Character limits */}
              <div className="mt-2 flex gap-2 text-[10px] text-zinc-500">
                <span>Prompt: {sunoModel.promptLimit}</span>
                <span>Style: {sunoModel.styleLimit}</span>
                <span>Title: {sunoModel.titleLimit}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Model Info */}
      <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-zinc-400">
            <p className="font-medium text-zinc-300 mb-1">About Suno Models</p>
            <p className="text-xs">
              V5.5 and V5 offer the best quality with vocal gender selection. V4.5+ supports add-vocals/add-instrumental.
              V4 has shorter prompt limits (3000 chars) and no vocal gender. All models support instrumental and vocal generation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
