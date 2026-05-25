# AceForge Suno API Integration - TODO

## Phase 1: API Types & Client ✅
- [x] types.ts - Suno fields in GenerationParams
- [x] api.ts - Complete sunoApi object with all functions

## Phase 2: Backend Proxy Endpoints ✅
- [x] generate.py - 30+ Suno proxy endpoints
- [x] config_suno.py - callback URL config

## Phase 3: UI Components ✅
- [x] SunoModelSelector.tsx - Model cards with limits
- [x] CreditsDisplay.tsx - Credits with compact mode
- [x] SunoConfigPanel.tsx - Config + callback URL
- [x] BackendSelector.tsx - Suno/ACE-Step toggle

## Phase 4: CreatePanel Suno Mode
- [x] Imports and Suno state variables
- [x] useEffect for config/credits loading
- [x] modelLimits derived state
- [x] BackendSelector in header area
- [x] Suno model selector + vocal gender (Simple mode)
- [x] Suno model selector + vocal gender (Cover mode)
- [x] Suno model selector + vocal gender (Custom mode)
- [x] Character limit indicators on text fields
- [x] Hide ACE-Step-specific controls when isSuno (quality presets, inference params, LM params, etc.)
- [x] Suno-specific advanced fields (Custom mode: persona, negative tags, weights, seed)
- [x] Fix JSX build errors — combined conditions, removed extra closings
- [x] Full Vite build passes
- [ ] Update handleGenerate() for Suno generation flow
- [ ] Add Suno credits indicator in footer

## Phase 5: SunoToolsPanel Component
- [ ] Create SunoToolsPanel for: vocal separation, covers, extend, voice API, MIDI, lyrics gen, mashup, etc.

## Phase 6: Build & Deploy
- [ ] Build React frontend
- [ ] Test Flask backend
- [ ] Push to GitHub
