export interface Song {
  id: string;
  title: string;
  lyrics: string;
  style: string;
  coverUrl: string;
  duration: string;
  createdAt: Date;
  isGenerating?: boolean;
  queuePosition?: number; // Position in queue (undefined = actively generating, number = waiting in queue)
  generationPercent?: number;
  generationSteps?: string;
  generationEtaSeconds?: number;
  tags: string[];
  audioUrl?: string;
  isPublic?: boolean;
  likeCount?: number;
  viewCount?: number;
  userId?: string;
  creator?: string;
  creator_avatar?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  cover_url?: string;
  songIds?: string[];
  isPublic?: boolean;
  is_public?: boolean;
  user_id?: string;
  creator?: string;
  created_at?: string;
  song_count?: number;
  songs?: any[];
}

export interface Comment {
  id: string;
  songId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
}

export interface GenerationParams {
  // Mode
  customMode: boolean;

  // Simple Mode
  songDescription?: string;

  // Custom Mode
  prompt: string;
  lyrics: string;
  style: string;
  title: string;

  // Common
  instrumental: boolean;
  vocalLanguage: string;

  // Music Parameters
  bpm: number;
  keyScale: string;
  timeSignature: string;
  duration: number;

  // Generation Settings
  inferenceSteps: number;
  guidanceScale: number;
  batchSize: number;
  negativePrompt?: string; // Exclude styles / what to avoid (Suno-like)
  randomSeed: boolean;
  seed: number;
  thinking: boolean;
  audioFormat: 'mp3' | 'flac';
  inferMethod: 'ode' | 'sde';
  shift: number;

  // LM Parameters
  lmTemperature: number;
  lmCfgScale: number;
  lmTopK: number;
  lmTopP: number;
  lmNegativePrompt: string;

  // Expert Parameters
  referenceAudioUrl?: string;
  sourceAudioUrl?: string;
  audioCodes?: string;
  repaintingStart?: number;
  repaintingEnd?: number;
  instruction?: string;
  audioCoverStrength?: number;
  /** When cover uses a second (style) audio, 0 = more source, 1 = more style. */
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
  isFormatCaption?: boolean;
  loraNameOrPath?: string;
  loraWeight?: number;

  // Suno API Parameters (when backend === 'suno')
  sunoModel?: string; // V4, V4_5, V4_5PLUS, V4_5ALL, V5, V5_5
  callbackUrl?: string; // Required for Suno API - webhook URL for 3-stage callbacks
  personaId?: string; // Persona ID or Suno Voice voiceId
  personaModel?: 'style_persona' | 'voice_persona'; // Persona type
  negativeTags?: string; // Styles/characteristics to exclude (Suno negative_tags)
  vocalGender?: 'm' | 'f'; // Preferred vocal gender for Suno
  styleWeight?: number; // Style adherence weight 0.00-1.00 (Suno)
  weirdnessConstraint?: number; // Creativity/novelty 0.00-1.00 (Suno)
  audioWeight?: number; // Audio consistency weight 0.00-1.00 (Suno)
  customSeed?: string; // Custom seed for reproducibility (Suno)
  backend?: 'suno' | 'acestep'; // Which backend to use for generation
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
}

export interface User {
  id: string;
  username: string;
  createdAt: Date;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isAdmin?: boolean;
  avatar_url?: string;
  banner_url?: string;
}

export interface UserProfile {
  user: User;
  publicSongs: Song[];
  publicPlaylists: Playlist[];
  stats: {
    totalSongs: number;
    totalLikes: number;
  };
}

// Simplified views for ACE-Step UI
export type View =
  | 'create'
  | 'library'
  | 'profile'
  | 'song'
  | 'playlist'
  | 'search'
  | 'training'
  | 'stem-splitting'
  | 'voice-cloning'
  | 'midi';
