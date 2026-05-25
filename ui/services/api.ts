// Use relative URLs so Vite proxy handles them (enables LAN access)
const API_BASE = '';

// Resolve audio URL based on storage type
export function getAudioUrl(audioUrl: string | undefined | null, songId?: string): string | undefined {
  if (!audioUrl) return undefined;

  // Local storage: already relative, works with proxy
  if (audioUrl.startsWith('/audio/')) {
    return audioUrl;
  }

  // Already a full URL
  return audioUrl;
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const url = `${API_BASE}${endpoint}`;
  console.log(`[API] ${method} ${url}`);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    const errorMessage = error.error || error.message || 'Request failed';
    const msg = `${response.status}: ${errorMessage}`;
    console.error(`[API] ${method} ${url} failed:`, msg, error);
    throw new Error(msg);
  }

  return response.json();
}

// Auth API (simplified - username only)
export interface User {
  id: string;
  username: string;
  isAdmin?: boolean;
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  // Auto-login: Get existing user from database (for local single-user app)
  auto: (): Promise<AuthResponse> =>
    api('/api/auth/auto'),

  setup: (username: string): Promise<AuthResponse> =>
    api('/api/auth/setup', { method: 'POST', body: { username } }),

  me: (token: string): Promise<{ user: User }> =>
    api('/api/auth/me', { token }),

  logout: (): Promise<{ success: boolean }> =>
    api('/api/auth/logout', { method: 'POST' }),

  refresh: (token: string): Promise<AuthResponse> =>
    api('/api/auth/refresh', { method: 'POST', token }),

  updateUsername: (username: string, token: string): Promise<AuthResponse> =>
    api('/api/auth/username', { method: 'PATCH', body: { username }, token }),
};

// Songs API
export interface Song {
  id: string;
  title: string;
  lyrics: string;
  style: string;
  caption?: string;
  cover_url?: string;
  audio_url?: string;
  audioUrl?: string;
  duration?: number;
  bpm?: number;
  key_scale?: string;
  time_signature?: string;
  tags: string[];
  is_public: boolean;
  like_count?: number;
  view_count?: number;
  user_id?: string;
  created_at: string;
  creator?: string;
}

// Transform songs to have proper audio URLs
function transformSongs(songs: Song[]): Song[] {
  return songs.map(song => {
    const rawUrl = song.audio_url || song.audioUrl;
    const resolvedUrl = getAudioUrl(rawUrl, song.id);
    return {
      ...song,
      audio_url: resolvedUrl,
      audioUrl: resolvedUrl,
    };
  });
}

export const songsApi = {
  getMySongs: async (token: string): Promise<{ songs: Song[] }> => {
    const result = await api('/api/songs', { token }) as { songs: Song[] };
    return { songs: transformSongs(result.songs) };
  },

  getPublicSongs: async (limit = 20, offset = 0): Promise<{ songs: Song[] }> => {
    const result = await api(`/api/songs/public?limit=${limit}&offset=${offset}`) as { songs: Song[] };
    return { songs: transformSongs(result.songs) };
  },

  getFeaturedSongs: async (): Promise<{ songs: Song[] }> => {
    const result = await api('/api/songs/public/featured') as { songs: Song[] };
    return { songs: transformSongs(result.songs) };
  },

  getSong: async (id: string, token?: string | null): Promise<{ song: Song }> => {
    const result = await api(`/api/songs/${id}`, { token: token || undefined }) as { song: Song };
    const rawUrl = result.song.audio_url || result.song.audioUrl;
    const resolvedUrl = getAudioUrl(rawUrl, result.song.id);
    return { song: { ...result.song, audio_url: resolvedUrl, audioUrl: resolvedUrl } };
  },

  getFullSong: async (id: string, token?: string | null): Promise<{ song: Song, comments: any[] }> => {
    const result = await api(`/api/songs/${id}/full`, { token: token || undefined }) as { song: Song, comments: any[] };
    const rawUrl = result.song.audio_url || result.song.audioUrl;
    const resolvedUrl = getAudioUrl(rawUrl, result.song.id);
    return { ...result, song: { ...result.song, audio_url: resolvedUrl, audioUrl: resolvedUrl } };
  },

  createSong: (song: Partial<Song>, token: string): Promise<{ song: Song }> =>
    api('/api/songs', { method: 'POST', body: song, token }),

  updateSong: (id: string, updates: Partial<Song>, token: string): Promise<{ song: Song }> =>
    api(`/api/songs/${id}`, { method: 'PATCH', body: updates, token }),

  deleteSong: (id: string, token: string): Promise<{ success: boolean }> =>
    api(`/api/songs/${id}`, { method: 'DELETE', token }),

  toggleLike: (id: string, token: string): Promise<{ liked: boolean }> =>
    api(`/api/songs/${id}/like`, { method: 'POST', token }),

  getLikedSongs: async (token: string): Promise<{ songs: Song[] }> => {
    const result = await api('/api/songs/liked/list', { token }) as { songs: Song[] };
    return { songs: transformSongs(result.songs) };
  },

  togglePrivacy: (id: string, token: string): Promise<{ isPublic: boolean }> =>
    api(`/api/songs/${id}/privacy`, { method: 'PATCH', token }),

  trackPlay: (id: string, token?: string | null): Promise<{ viewCount: number }> =>
    api(`/api/songs/${id}/play`, { method: 'POST', token: token || undefined }),

  getComments: (id: string, token?: string | null): Promise<{ comments: Comment[] }> =>
    api(`/api/songs/${id}/comments`, { token: token || undefined }),

  addComment: (id: string, content: string, token: string): Promise<{ comment: Comment }> =>
    api(`/api/songs/${id}/comments`, { method: 'POST', body: { content }, token }),

  deleteComment: (commentId: string, token: string): Promise<{ success: boolean }> =>
    api(`/api/songs/comments/${commentId}`, { method: 'DELETE', token }),
};

interface Comment {
  id: string;
  song_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

// Generation API
export interface GenerationParams {
  // Mode
  customMode: boolean;
  songDescription?: string;

  // Custom Mode
  prompt?: string;
  lyrics: string;
  style: string;
  title: string;

  // Common
  instrumental: boolean;
  vocalLanguage?: string;

  // Music Parameters
  duration?: number;
  bpm?: number;
  keyScale?: string;
  timeSignature?: string;

  // Generation Settings
  inferenceSteps?: number;
  guidanceScale?: number;
  batchSize?: number;
  randomSeed?: boolean;
  seed?: number;
  thinking?: boolean;
  audioFormat?: 'mp3' | 'flac';
  inferMethod?: 'ode' | 'sde';
  shift?: number;

  // LM Parameters
  lmTemperature?: number;
  lmCfgScale?: number;
  lmTopK?: number;
  lmTopP?: number;
  lmNegativePrompt?: string;

  // Expert Parameters
  referenceAudioUrl?: string;
  sourceAudioUrl?: string;
  audioCodes?: string;
  repaintingStart?: number;
  repaintingEnd?: number;
  instruction?: string;
  audioCoverStrength?: number;
  coverBlendFactor?: number;
  taskType?: string;
  useAdg?: boolean;
  cfgIntervalStart?: number;
  cfgIntervalEnd?: number;
  customTimesteps?: string;
  useCotMetas?: boolean;
  useCotCaption?: boolean;
  useCotLanguage?: boolean;
  autogen?: boolean;
  constrainedDecodingDebug?: boolean;
  allowLmBatch?: boolean;
  getScores?: boolean;
  getLrc?: boolean;
  scoreScale?: number;
  lmBatchChunkSize?: number;
  trackName?: string;
  completeTrackClasses?: string[];
  isFormatCaption?: boolean;
  outputDir?: string;
  /** LoRA adapter: folder name (from list) or full path. Used for ACE-Step generation. */
  loraNameOrPath?: string;
  /** LoRA weight 0–2. Default 0.75. */
  loraWeight?: number;
}

/** ACE-Step model list item (DiT or LM). */
export interface AceStepModelItem {
  id: string;
  label: string;
  description?: string;
  installed: boolean;
  steps?: number;
  cfg?: boolean;
  exclusive_tasks?: string[];
}

export interface AceStepDiscoveredModel {
  id: string;
  label: string;
  path: string;
  custom: boolean;
}

export interface AceStepModelsResponse {
  dit_models: AceStepModelItem[];
  lm_models: AceStepModelItem[];
  discovered_models: AceStepDiscoveredModel[];
  acestep_download_available: boolean;
  checkpoints_path: string;
}

export interface AceStepDownloadStatus {
  running: boolean;
  model: string | null;
  progress: number;
  error: string | null;
  current_file?: string | null;
  file_index?: number;
  total_files?: number;
  eta_seconds?: number | null;
  cancelled?: boolean;
}

export const aceStepModelsApi = {
  list: (): Promise<AceStepModelsResponse> =>
    api('/api/ace-step/models') as Promise<AceStepModelsResponse>,
  download: (model: string): Promise<{ ok?: boolean; started?: boolean; error?: string; path?: string; hint?: string }> =>
    api('/api/ace-step/models/download', { method: 'POST', body: { model } }),
  downloadStatus: (): Promise<AceStepDownloadStatus> =>
    api('/api/ace-step/models/status') as Promise<AceStepDownloadStatus>,
  downloadCancel: (): Promise<{ cancelled: boolean; message: string }> =>
    api('/api/ace-step/models/download/cancel', { method: 'POST' }),
};

export interface GenerationJob {
  jobId: string;
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed';
  queuePosition?: number;
  etaSeconds?: number;
  progressPercent?: number;
  progressSteps?: string;
  progressStage?: string;
  result?: {
    audioUrls: string[];
    bpm?: number;
    duration?: number;
    keyScale?: string;
    timeSignature?: string;
  };
  error?: string;
}

export interface LoraAdapter {
  name: string;
  path: string;
  size_bytes?: number | null;
}

export const generateApi = {
  startGeneration: (params: GenerationParams, token: string): Promise<GenerationJob> =>
    api('/api/generate', { method: 'POST', body: params, token }),

  getStatus: (jobId: string, token: string): Promise<GenerationJob> =>
    api(`/api/generate/status/${jobId}`, { token }),

  /** Cancel a queued or running generation job. */
  cancelJob: (jobId: string, token: string): Promise<{ cancelled: boolean; jobId: string; message: string }> =>
    api(`/api/generate/cancel/${jobId}`, { method: 'POST', token }),

  getHistory: (token: string): Promise<{ jobs: GenerationJob[] }> =>
    api('/api/generate/history', { token }),

  /** List LoRA adapters (Training output and custom_lora folder). */
  getLoraAdapters: (): Promise<{ adapters: LoraAdapter[] }> =>
    api('/api/generate/lora_adapters'),

  uploadAudio: async (file: File, token: string): Promise<{ url: string; key: string }> => {
    const url = `${API_BASE}/api/generate/upload-audio`;
    console.log('[API] POST', url);
    const formData = new FormData();
    formData.append('audio', file);
    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      const msg = error.details || error.error || 'Upload failed';
      console.error('[API] POST', url, 'failed:', response.status, msg);
      throw new Error(msg);
    }
    return response.json();
  },

  formatInput: (params: {
    caption: string;
    lyrics?: string;
    mode?: 'style' | 'lyrics' | 'general';
    bpm?: number;
    duration?: number;
    keyScale?: string;
    timeSignature?: string;
    temperature?: number;
    topK?: number;
    topP?: number;
  }, token?: string | null): Promise<{
    success: boolean;
    caption?: string;
    lyrics?: string;
    bpm?: number;
    duration?: number;
    key_scale?: string;
    language?: string;
    time_signature?: string;
    status_message?: string;
    error?: string;
  }> => api('/api/generate/format', { method: 'POST', body: params, token: token || undefined }),
};

// Users API
export interface UserProfile extends User {
  bio?: string;
  avatar_url?: string;
  banner_url?: string;
  created_at: string;
}

export const usersApi = {
  getProfile: (username: string, token?: string | null): Promise<{ user: UserProfile }> =>
    api(`/api/users/${username}`, { token: token || undefined }),

  getPublicSongs: (username: string): Promise<{ songs: Song[] }> =>
    api(`/api/users/${username}/songs`),

  getPublicPlaylists: (username: string): Promise<{ playlists: any[] }> =>
    api(`/api/users/${username}/playlists`),

  getFeaturedCreators: (): Promise<{ creators: Array<UserProfile & { follower_count?: number }> }> =>
    api('/api/users/public/featured'),

  updateProfile: (updates: Partial<User>, token: string): Promise<{ user: User }> =>
    api('/api/users/me', { method: 'PATCH', body: updates, token }),

  uploadAvatar: async (file: File, token: string): Promise<{ user: UserProfile; url: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await fetch(`${API_BASE}/api/users/me/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.details || error.error || 'Upload failed');
    }
    return response.json();
  },

  uploadBanner: async (file: File, token: string): Promise<{ user: UserProfile; url: string }> => {
    const formData = new FormData();
    formData.append('banner', file);
    const response = await fetch(`${API_BASE}/api/users/me/banner`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Upload failed');
    }
    return response.json();
  },

  toggleFollow: (username: string, token: string): Promise<{ following: boolean, followerCount: number }> =>
    api(`/api/users/${username}/follow`, { method: 'POST', token }),

  getFollowers: (username: string): Promise<{ followers: User[] }> =>
    api(`/api/users/${username}/followers`),

  getFollowing: (username: string): Promise<{ following: User[] }> =>
    api(`/api/users/${username}/following`),

  getStats: (username: string, token?: string | null): Promise<{ followerCount: number, followingCount: number, isFollowing: boolean }> =>
    api(`/api/users/${username}/stats`, { token: token || undefined }),
};

// Playlists API
export interface Playlist {
  id: string;
  name: string;
  description?: string;
  cover_url?: string;
  is_public?: boolean;
  user_id?: string;
  created_at?: string;
  song_count?: number;
}

export const playlistsApi = {
  create: (name: string, description: string, isPublic: boolean, token: string): Promise<{ playlist: Playlist }> =>
    api('/api/playlists', { method: 'POST', body: { name, description, isPublic }, token }),

  getMyPlaylists: (token?: string | null): Promise<{ playlists: Playlist[] }> =>
    api('/api/playlists', { token: token ?? undefined }),

  getPlaylist: (id: string, token?: string | null): Promise<{ playlist: Playlist, songs: any[] }> =>
    api(`/api/playlists/${id}`, { token: token || undefined }),

  getFeaturedPlaylists: (): Promise<{ playlists: Array<Playlist & { creator?: string; creator_avatar?: string }> }> =>
    api('/api/playlists/public/featured'),

  addSong: (playlistId: string, songId: string, token: string): Promise<{ success: boolean }> =>
    api(`/api/playlists/${playlistId}/songs`, { method: 'POST', body: { songId }, token }),

  removeSong: (playlistId: string, songId: string, token: string): Promise<{ success: boolean }> =>
    api(`/api/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE', token }),

  update: (id: string, updates: Partial<Playlist>, token: string): Promise<{ playlist: Playlist }> =>
    api(`/api/playlists/${id}`, { method: 'PATCH', body: updates, token }),

  delete: (id: string, token: string): Promise<{ success: boolean }> =>
    api(`/api/playlists/${id}`, { method: 'DELETE', token }),
};

// ---------------------------------------------------------------------------
// Suno API (Cloud-based AI music generation)
// ---------------------------------------------------------------------------

/** Suno API model identifiers. */
export type SunoModel = 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5' | 'V5_5';

/** Character limits per Suno model. */
export const SUNO_MODEL_LIMITS: Record<SunoModel, { prompt: number; style: number; title: number }> = {
  V4: { prompt: 3000, style: 200, title: 80 },
  V4_5: { prompt: 5000, style: 1000, title: 100 },
  V4_5PLUS: { prompt: 5000, style: 1000, title: 100 },
  V4_5ALL: { prompt: 5000, style: 1000, title: 80 },
  V5: { prompt: 5000, style: 1000, title: 100 },
  V5_5: { prompt: 5000, style: 1000, title: 100 },
};

/** Suno model descriptions for UI display. */
export const SUNO_MODEL_INFO: Record<SunoModel, { name: string; description: string; maxDuration: string; features: string[] }> = {
  V4: { name: 'Suno v4', description: 'Improved vocal quality, proven consistency.', maxDuration: '4 min', features: ['Vocal clarity', 'Consistent', 'Cross-genre'] },
  V4_5: { name: 'Suno v4.5', description: 'Smart prompts, faster generations.', maxDuration: '8 min', features: ['Smart prompts', 'Fast', 'Complex requests'] },
  V4_5PLUS: { name: 'Suno v4.5+', description: 'Richer sound, more ways to create.', maxDuration: '8 min', features: ['Richer tones', 'Professional', 'Advanced features'] },
  V4_5ALL: { name: 'Suno v4.5 ALL', description: 'Better song structure across all genres.', maxDuration: '8 min', features: ['All genres', 'Better structure', 'Versatile'] },
  V5: { name: 'Suno v5', description: 'Superior musical expression, faster generation.', maxDuration: '8 min', features: ['Superior expression', 'Realistic vocals', 'Popular choice'] },
  V5_5: { name: 'Suno v5.5', description: 'Custom models tailored to your unique taste.', maxDuration: '8 min', features: ['Voice customization', 'Latest model', 'Personalized'] },
};

/** Models that support vocal_gender parameter. */
export const SUNO_MODELS_WITH_GENDER: SunoModel[] = ['V4_5', 'V4_5PLUS', 'V5', 'V5_5'];

/** Models available for add-vocals / add-instrumental. */
export const SUNO_VOCAL_MODELS: SunoModel[] = ['V4_5PLUS', 'V5', 'V5_5'];

/** Suno generation status values. */
export type SunoStatus = 'PENDING' | 'TEXT_SUCCESS' | 'SUCCESS' | 'FAILED' | 'ERROR';

/** Suno callback stages. */
export type SunoCallbackStage = 'text' | 'first' | 'complete';

/** Suno credits response. */
export interface SunoCreditsResponse {
  code: number;
  msg: string;
  data: number;
}

/** Suno generation task response. */
export interface SunoTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: SunoStatus;
  };
}

/** Suno generation status / record-info response. */
export interface SunoGenerationStatus {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: SunoStatus;
    response?: {
      sunoData: Array<{
        id: string;
        title: string;
        sourceAudioUrl: string;
        audioUrl: string;
        imageUrl: string;
        duration: number;
        tags: string;
      }>;
    };
    params?: Record<string, unknown>;
  };
}

/** Suno config response. */
export interface SunoConfigResponse {
  api_key?: string;
  configured: boolean;
  callback_url?: string;
  default_model?: SunoModel;
}

/** Suno cover generation response. */
export interface SunoCoverResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: SunoStatus;
  };
}

/** Suno vocal separation response. */
export interface SunoVocalSeparationResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: SunoStatus;
  };
}

/** Suno voice validation phrase response. */
export interface SunoVoiceValidationResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    phrase?: string;
    status: SunoStatus;
  };
}

/** Suno file upload response. */
export interface SunoFileUploadResponse {
  code: number;
  msg: string;
  data: {
    url: string;
    uploadPath: string;
    fileName: string;
  };
}

/** Suno style boost response. */
export interface SunoStyleBoostResponse {
  code: number;
  msg: string;
  data: {
    content: string;
  };
}

/** Suno lyrics generation response. */
export interface SunoLyricsResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    lyrics?: string;
    status: SunoStatus;
  };
}

/** Suno MIDI generation response. */
export interface SunoMidiResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: SunoStatus;
  };
}

/** Suno persona generation response. */
export interface SunoPersonaResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    personaId?: string;
    status: SunoStatus;
  };
}

/** Suno music video (MP4) generation response. */
export interface SunoVideoResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status: SunoStatus;
  };
}

/** Parameters for Suno music generation. */
export interface SunoGenerateParams {
  prompt: string;
  style?: string;
  title?: string;
  lyrics?: string;
  is_instrumental?: boolean;
  custom_mode?: boolean;
  model?: SunoModel;
  callback_url?: string;
  persona_id?: string;
  persona_model?: 'style_persona' | 'voice_persona';
  negative_tags?: string;
  vocal_gender?: 'm' | 'f';
  style_weight?: number;
  weirdness_constraint?: number;
  audio_weight?: number;
  custom_seed?: string;
}

/** Parameters for Suno extend. */
export interface SunoExtendParams {
  audio_id: string;
  model?: SunoModel;
  custom_mode?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continue_at?: number;
  callback_url?: string;
  persona_id?: string;
  persona_model?: 'style_persona' | 'voice_persona';
  negative_tags?: string;
  vocal_gender?: 'm' | 'f';
  style_weight?: number;
  weirdness_constraint?: number;
  audio_weight?: number;
}

/** Parameters for Suno add-vocals. */
export interface SunoAddVocalsParams {
  upload_url: string;
  prompt: string;
  title: string;
  style: string;
  negative_tags: string;
  callback_url: string;
  model?: SunoModel;
  vocal_gender?: 'm' | 'f';
  style_weight?: number;
  weirdness_constraint?: number;
  audio_weight?: number;
}

/** Parameters for Suno add-instrumental. */
export interface SunoAddInstrumentalParams {
  upload_url: string;
  title: string;
  tags: string;
  negative_tags: string;
  callback_url: string;
  model?: SunoModel;
  vocal_gender?: 'm' | 'f';
  style_weight?: number;
  weirdness_constraint?: number;
  audio_weight?: number;
}

/** Parameters for Suno upload-cover. */
export interface SunoUploadCoverParams {
  upload_url: string;
  prompt?: string;
  style?: string;
  title?: string;
  model?: SunoModel;
  custom_mode?: boolean;
  instrumental?: boolean;
  callback_url?: string;
  persona_id?: string;
  persona_model?: 'style_persona' | 'voice_persona';
  negative_tags?: string;
  vocal_gender?: 'm' | 'f';
  style_weight?: number;
  weirdness_constraint?: number;
  audio_weight?: number;
}

/** Parameters for Suno upload-extend. */
export interface SunoUploadExtendParams {
  upload_url: string;
  prompt: string;
  style: string;
  title: string;
  continue_at: number;
  model?: SunoModel;
  custom_mode?: boolean;
  callback_url?: string;
  persona_id?: string;
  persona_model?: 'style_persona' | 'voice_persona';
  negative_tags?: string;
  vocal_gender?: 'm' | 'f';
  style_weight?: number;
  weirdness_constraint?: number;
  audio_weight?: number;
}

export const sunoApi = {
  // ========== Credits ==========
  getCredits: (): Promise<SunoCreditsResponse> =>
    api('/api/generate/suno/credits'),

  // ========== Configuration ==========
  getConfig: (): Promise<SunoConfigResponse> =>
    api('/api/generate/suno/config'),

  setConfig: (config: { api_key?: string; callback_url?: string; default_model?: SunoModel }): Promise<SunoConfigResponse> =>
    api('/api/generate/suno/config', { method: 'POST', body: config }),

  // ========== Music Generation ==========
  generateMusic: (params: SunoGenerateParams): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/generate', { method: 'POST', body: params }),

  getGenerationStatus: (taskId: string): Promise<SunoGenerationStatus> =>
    api(`/api/generate/suno/status/${taskId}`),

  // ========== Extend ==========
  extendMusic: (params: SunoExtendParams): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/extend', { method: 'POST', body: params }),

  uploadAndExtend: (params: SunoUploadExtendParams): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/upload-extend', { method: 'POST', body: params }),

  // ========== Cover ==========
  generateCover: (taskId: string, callbackUrl: string): Promise<SunoCoverResponse> =>
    api('/api/generate/suno/cover', { method: 'POST', body: { taskId, callbackUrl } }),

  uploadAndCover: (params: SunoUploadCoverParams): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/upload-cover', { method: 'POST', body: params }),

  // ========== Vocals ==========
  addVocals: (params: SunoAddVocalsParams): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/add-vocals', { method: 'POST', body: params }),

  addInstrumental: (params: SunoAddInstrumentalParams): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/add-instrumental', { method: 'POST', body: params }),

  // ========== Vocal Separation ==========
  separateVocals: (taskId: string, audioId: string, callbackUrl: string, separationType?: 'separate_vocal' | 'split_stem'): Promise<SunoVocalSeparationResponse> =>
    api('/api/generate/suno/separate-vocals', { method: 'POST', body: { taskId, audioId, callbackUrl, separationType: separationType || 'separate_vocal' } }),

  getVocalSeparationDetails: (taskId: string): Promise<SunoVocalSeparationResponse> =>
    api(`/api/generate/suno/vocal-separation-status/${taskId}`),

  // ========== Lyrics ==========
  generateLyrics: (prompt: string, theme?: string, language?: string, verseCount?: number): Promise<SunoLyricsResponse> =>
    api('/api/generate/suno/generate-lyrics', { method: 'POST', body: { prompt, theme, language, verseCount: verseCount || 2 } }),

  getLyricsDetails: (taskId: string): Promise<SunoLyricsResponse> =>
    api(`/api/generate/suno/lyrics-status/${taskId}`),

  getTimestampedLyrics: (lyricsId: string): Promise<SunoLyricsResponse> =>
    api(`/api/generate/suno/timestamped-lyrics/${lyricsId}`),

  // ========== Style Boost ==========
  boostStyle: (content: string): Promise<SunoStyleBoostResponse> =>
    api('/api/generate/suno/boost-style', { method: 'POST', body: { content } }),

  // ========== MIDI ==========
  generateMidi: (taskId: string, audioId: string, callbackUrl: string): Promise<SunoMidiResponse> =>
    api('/api/generate/suno/generate-midi', { method: 'POST', body: { taskId, audioId, callbackUrl } }),

  getMidiDetails: (taskId: string): Promise<SunoMidiResponse> =>
    api(`/api/generate/suno/midi-status/${taskId}`),

  // ========== Persona ==========
  generatePersona: (audioUrl: string, personaName: string, callbackUrl: string, description?: string): Promise<SunoPersonaResponse> =>
    api('/api/generate/suno/generate-persona', { method: 'POST', body: { audioUrl, personaName, callbackUrl, description } }),

  // ========== Mashup ==========
  generateMashup: (audioUrls: string[], prompt: string, callbackUrl: string, style?: string, title?: string): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/mashup', { method: 'POST', body: { audioUrls, prompt, callbackUrl, style, title } }),

  // ========== Replace Section ==========
  replaceSection: (taskId: string, audioId: string, startTime: number, endTime: number, prompt: string, callbackUrl: string, model?: SunoModel): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/replace-section', { method: 'POST', body: { taskId, audioId, startTime, endTime, prompt, callbackUrl, model: model || 'V4_5ALL' } }),

  // ========== Sounds (SFX) ==========
  generateSounds: (prompt: string, callbackUrl: string, duration?: number, numSounds?: number): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/generate-sounds', { method: 'POST', body: { prompt, callbackUrl, duration, numSounds: numSounds || 1 } }),

  // ========== Music Video (MP4) ==========
  createMusicVideo: (taskId: string, audioId: string, callbackUrl: string, author?: string, domainName?: string): Promise<SunoVideoResponse> =>
    api('/api/generate/suno/create-video', { method: 'POST', body: { taskId, audioId, callbackUrl, author, domainName } }),

  getVideoDetails: (taskId: string): Promise<SunoVideoResponse> =>
    api(`/api/generate/suno/video-status/${taskId}`),

  // ========== WAV Conversion ==========
  convertToWav: (taskId: string, audioId: string, callbackUrl: string): Promise<SunoTaskResponse> =>
    api('/api/generate/suno/convert-wav', { method: 'POST', body: { taskId, audioId, callbackUrl } }),

  getWavDetails: (taskId: string): Promise<SunoTaskResponse> =>
    api(`/api/generate/suno/wav-status/${taskId}`),

  // ========== Cover Image Generation ==========
  generateCoverImage: (taskId: string, callbackUrl: string): Promise<SunoCoverResponse> =>
    api('/api/generate/suno/generate-cover-image', { method: 'POST', body: { taskId, callbackUrl } }),

  getCoverImageDetails: (taskId: string): Promise<SunoCoverResponse> =>
    api(`/api/generate/suno/cover-image-status/${taskId}`),

  // ========== Suno Voice API ==========
  voiceGenerateValidation: (callbackUrl: string): Promise<SunoVoiceValidationResponse> =>
    api('/api/generate/suno/voice/generate-validation', { method: 'POST', body: { callbackUrl } }),

  voiceGetValidation: (taskId: string): Promise<SunoVoiceValidationResponse> =>
    api(`/api/generate/suno/voice/validate-info/${taskId}`),

  voiceCreateCustom: (taskId: string, audioUrl: string, callbackUrl: string): Promise<SunoVoiceValidationResponse> =>
    api('/api/generate/suno/voice/create', { method: 'POST', body: { taskId, audioUrl, callbackUrl } }),

  voiceGetRecord: (taskId: string): Promise<SunoVoiceValidationResponse> =>
    api(`/api/generate/suno/voice/record-info/${taskId}`),

  voiceRegenerate: (taskId: string, callbackUrl: string): Promise<SunoVoiceValidationResponse> =>
    api('/api/generate/suno/voice/regenerate', { method: 'POST', body: { taskId, callbackUrl } }),

  voiceCheckAvailability: (taskId: string): Promise<{ available: boolean; voiceId?: string }> =>
    api('/api/generate/suno/voice/check', { method: 'POST', body: { taskId } }),

  // ========== File Upload ==========
  uploadFile: async (file: File): Promise<SunoFileUploadResponse> => {
    const url = `${API_BASE}/api/generate/suno/upload-file`;
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || error.details || 'Upload failed');
    }
    return response.json();
  },

  uploadFileByUrl: (fileUrl: string, uploadPath?: string, fileName?: string): Promise<SunoFileUploadResponse> =>
    api('/api/generate/suno/upload-url', { method: 'POST', body: { fileUrl, uploadPath, fileName } }),

  uploadFileBase64: (base64Data: string, uploadPath?: string, fileName?: string): Promise<SunoFileUploadResponse> =>
    api('/api/generate/suno/upload-base64', { method: 'POST', body: { base64Data, uploadPath, fileName } }),

  // ========== Utility ==========
  ping: (): Promise<{ ok: boolean; credits: number }> =>
    api('/api/generate/suno/ping'),

  getDetails: (taskId: string, type: 'generation' | 'lyrics' | 'vocal' | 'midi' | 'video' | 'cover' | 'wav' | 'voice'): Promise<unknown> =>
    api(`/api/generate/suno/details/${type}/${taskId}`),
};

// Search API
export interface SearchResult {
  songs: Song[];
  creators: Array<UserProfile & { follower_count?: number }>;
  playlists: Array<Playlist & { creator?: string; creator_avatar?: string }>;
}

export const searchApi = {
  search: async (query: string, type?: 'songs' | 'creators' | 'playlists' | 'all'): Promise<SearchResult> => {
    const params = new URLSearchParams({ q: query });
    if (type && type !== 'all') params.append('type', type);
    const result = await api(`/api/search?${params}`) as SearchResult;
    return {
      ...result,
      songs: transformSongs(result.songs || []),
    };
  },
};

// Contact Form API
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: 'general' | 'support' | 'business' | 'press' | 'legal';
}

export const contactApi = {
  submit: (data: ContactFormData): Promise<{ success: boolean; message: string; id: string }> =>
    api('/api/contact', { method: 'POST', body: data }),
};

// ---------------------------------------------------------------------------
// Preferences API (global app settings: output_dir, module configs)
// ---------------------------------------------------------------------------

export interface AppPreferences {
  output_dir?: string;
  models_folder?: string;
  /** UI zoom percent (50–150). Takes effect on next app launch. */
  ui_zoom?: number;
  /** ACE-Step DiT model variant: turbo (default), turbo-shift1, turbo-shift3, turbo-continuous, sft, base. */
  ace_step_dit_model?: string;
  /** ACE-Step LM planner: none, 0.6B, 1.7B (default), 4B. Used when thinking mode is on. */
  ace_step_lm?: string;
  stem_split?: { out_dir?: string; stem_count?: string; mode?: string; device_preference?: string; export_format?: string };
  voice_clone?: Record<string, unknown>;
  midi_gen?: Record<string, unknown>;
  training?: Record<string, unknown>;
}

export const preferencesApi = {
  get: (): Promise<AppPreferences> =>
    api('/api/preferences') as Promise<AppPreferences>,

  update: (partial: Partial<AppPreferences>): Promise<AppPreferences> =>
    api('/api/preferences', { method: 'PATCH', body: partial }) as Promise<AppPreferences>,
};

// ---------------------------------------------------------------------------
// Tools API (Training, Stem Splitting, Voice Cloning, MIDI) — legacy Flask routes
// ---------------------------------------------------------------------------

async function fetchJson<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { credentials: 'include', ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string; message?: string }).error || (err as { message?: string }).message || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function postFormData(url: string, formData: FormData): Promise<unknown> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  // Some endpoints return HTML (e.g. train_lora); we only need to know if it started
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string; message?: string }).error || (err as { message?: string }).message || `Request failed: ${res.status}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return { ok: true };
}

export interface ProgressResponse {
  fraction: number;
  done: boolean;
  error: boolean;
  stage?: string;
  current?: number;
  total?: number;
}

export const toolsApi = {
  getProgress: (): Promise<ProgressResponse> =>
    fetchJson<ProgressResponse>('/progress'),

  // Training
  trainStatus: (): Promise<{ running?: boolean; paused?: boolean; progress?: number; current_step?: number; max_steps?: number; current_epoch?: number; max_epochs?: number; last_message?: string; returncode?: number }> =>
    fetchJson('/train_lora/status'),

  trainConfigs: (): Promise<{ ok: boolean; configs: Array<{ file: string; label: string }>; default?: string }> =>
    fetchJson('/train_lora/configs'),

  trainStart: (formData: FormData): Promise<unknown> =>
    postFormData('/train_lora', formData),

  trainPause: (): Promise<{ ok: boolean; error?: string; message?: string }> =>
    fetchJson('/train_lora/pause', { method: 'POST' }),

  trainResume: (): Promise<{ ok: boolean; error?: string; message?: string }> =>
    fetchJson('/train_lora/resume', { method: 'POST' }),

  trainCancel: (): Promise<{ ok: boolean; error?: string; message?: string }> =>
    fetchJson('/train_lora/cancel', { method: 'POST' }),

  // Stem splitting
  stemSplit: (formData: FormData): Promise<{ error?: boolean; message?: string; details?: string }> =>
    postFormData('/stem_split', formData) as Promise<{ error?: boolean; message?: string; details?: string }>,

  // Voice cloning
  voiceClone: (formData: FormData): Promise<{ error?: boolean; message?: string; details?: string }> =>
    postFormData('/voice_clone', formData) as Promise<{ error?: boolean; message?: string; details?: string }>,

  // MIDI generation
  midiGenerate: (formData: FormData): Promise<{ error?: boolean; message?: string; details?: string }> =>
    postFormData('/midi_generate', formData) as Promise<{ error?: boolean; message?: string; details?: string }>,

  // Model status / ensure (for "Download models" buttons)
  stemSplitModelStatus: (): Promise<{ ok: boolean; ready: boolean; state: string; message?: string }> =>
    fetchJson('/models/stem_split/status'),

  stemSplitModelEnsure: (): Promise<{ ok: boolean; started?: boolean; already_ready?: boolean; already_downloading?: boolean }> =>
    fetchJson('/models/stem_split/ensure', { method: 'POST' }),

  midiModelStatus: (): Promise<{ ok: boolean; ready: boolean; state: string; message?: string }> =>
    fetchJson('/models/midi_gen/status'),

  midiModelEnsure: (): Promise<{ ok: boolean; started?: boolean; already_ready?: boolean; already_downloading?: boolean }> =>
    fetchJson('/models/midi_gen/ensure', { method: 'POST' }),

  voiceCloneModelStatus: (): Promise<{ ok: boolean; ready: boolean; state: string; message?: string }> =>
    fetchJson('/models/voice_clone/status'),

  voiceCloneModelEnsure: (): Promise<{ ok: boolean; started?: boolean; already_ready?: boolean; already_downloading?: boolean }> =>
    fetchJson('/models/voice_clone/ensure', { method: 'POST' }),

  // ACE-Step model (for Training and Generate) — same as legacy /models/status and /models/ensure
  aceModelStatus: (): Promise<{ ok: boolean; ready: boolean; state: string; message?: string }> =>
    fetchJson('/models/status'),

  aceModelEnsure: (): Promise<{ ok: boolean; started?: boolean; already_ready?: boolean; already_downloading?: boolean }> =>
    fetchJson('/models/ensure', { method: 'POST' }),
};
