import React, { useState, useEffect } from 'react';
import { Key, RefreshCw, Check, X, AlertCircle, Info, Zap, Globe, Music, Save } from 'lucide-react';
import { sunoApi, SUNO_MODELS, SUNO_MODEL_INFO } from '../services/api';
import { SunoModelSelector } from './SunoModelSelector';

interface SunoConfigPanelProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const SunoConfigPanel: React.FC<SunoConfigPanelProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('');
  const [defaultModel, setDefaultModel] = useState('V5_5');
  const [credits, setCredits] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadCredits();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const data = await sunoApi.getConfig();
      if (data.api_key) setApiKey(data.api_key);
      if (data.callback_url) setCallbackUrl(data.callback_url);
      if (data.default_model) setDefaultModel(data.default_model);
      setConfigured(data.configured ?? !!data.api_key);
    } catch (error) {
      console.error('Error loading Suno config:', error);
    }
  };

  const loadCredits = async () => {
    setIsLoading(true);
    try {
      const data = await sunoApi.getCredits();
      setCredits(data.credits_left ?? data.credits ?? null);
    } catch (error) {
      console.error('Error loading Suno credits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const payload: Record<string, string> = {};
      if (apiKey.trim()) payload.apiKey = apiKey.trim();
      if (callbackUrl.trim()) payload.callbackUrl = callbackUrl.trim();
      payload.defaultModel = defaultModel;

      await sunoApi.setConfig(payload);
      setSaveStatus('success');
      setConfigured(true);
      await loadCredits();
    } catch (error) {
      console.error('Error saving Suno config:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) return;
    setTestingKey(true);
    setTestResult(null);
    try {
      // Save first, then ping
      await sunoApi.setConfig({ apiKey: apiKey.trim() });
      const result = await sunoApi.ping();
      setTestResult(result.ok ? 'ok' : 'fail');
      if (result.ok) {
        setCredits(result.credits ?? null);
        setConfigured(true);
      }
    } catch {
      setTestResult('fail');
    } finally {
      setTestingKey(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="p-6 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Zap className="text-yellow-500" />
          Suno API Configuration
        </h2>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-700 transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        )}
      </div>

      {/* API Key Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Key className="w-4 h-4 text-zinc-400" />
          API Key
        </label>
        <div className="flex gap-2">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Suno API key"
            className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 transition-colors"
          >
            {showApiKey ? <X className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          </button>
          <button
            onClick={handleTestKey}
            disabled={testingKey || !apiKey.trim()}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {testingKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {testingKey ? 'Testing...' : 'Test'}
          </button>
        </div>

        {testResult === 'ok' && (
          <div className="text-green-400 text-sm flex items-center gap-1.5">
            <Check className="w-4 h-4" /> API key is valid and working!
          </div>
        )}
        {testResult === 'fail' && (
          <div className="text-red-400 text-sm flex items-center gap-1.5">
            <X className="w-4 h-4" /> API key test failed. Please check and try again.
          </div>
        )}
        {configured && !testResult && (
          <div className="text-green-400/80 text-sm flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Suno API is configured
          </div>
        )}
      </div>

      {/* Callback URL Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Globe className="w-4 h-4 text-zinc-400" />
          Callback URL
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">Required</span>
        </label>
        <input
          type="url"
          value={callbackUrl}
          onChange={(e) => setCallbackUrl(e.target.value)}
          placeholder="https://your-server.com/api/callbacks/suno"
          className="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500"
        />
        <p className="text-xs text-zinc-500">
          Suno API requires a publicly accessible callback URL for 3-stage notifications (text → first → complete).
          This must be a URL that Suno servers can reach.
        </p>
      </div>

      {/* Default Model Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-zinc-300 flex items-center gap-2">
          <Music className="w-4 h-4 text-zinc-400" />
          Default Model
        </label>
        <SunoModelSelector
          model={defaultModel}
          onModelChange={setDefaultModel}
        />
      </div>

      {/* Credits Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Credits
          </h3>
          <button
            onClick={loadCredits}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 text-sm hover:bg-zinc-800 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-zinc-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading credits...
          </div>
        ) : credits !== null ? (
          <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-700/50">
            <div className="text-3xl font-bold text-yellow-500 mb-1">{credits}</div>
            <div className="text-sm text-zinc-400">Credits remaining</div>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            Unable to load credits. Check your API key.
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>

        {saveStatus === 'success' && (
          <span className="text-green-400 text-sm flex items-center gap-1">
            <Check className="w-4 h-4" /> Saved successfully!
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-400 text-sm flex items-center gap-1">
            <X className="w-4 h-4" /> Failed to save
          </span>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-700/50 text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-zinc-400">
            <p className="font-medium text-zinc-300 mb-1">About Suno API</p>
            <p className="text-xs mb-2">
              Suno API is a cloud-based AI music generation service with 6 model versions (V4–V5.5).
              It uses a credit-based billing system and requires a callback URL for async notifications.
            </p>
            <p className="text-xs">
              Get your API key from{' '}
              <a href="https://docs.sunoapi.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                docs.sunoapi.org
              </a>
              {' • '}Generated files are retained for 15 days, uploaded files for 3 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
