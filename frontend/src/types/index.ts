// API响应通用类型
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  code?: number;
  timestamp?: string;
  trace_id?: string;
}

// 用户相关类型
export interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  department?: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive';
}

export interface UserCreateRequest {
  name: string;
  email: string;
  age?: number;
  department?: string;
}

export interface UserUpdateRequest extends Partial<UserCreateRequest> {}

export interface UserStatistics {
  total_users: number;
  active_users: number;
  inactive_users: number;
  departments: Record<string, number>;
}

// 产品相关类型
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  brand: string;
  stock: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ProductCreateRequest {
  name: string;
  description?: string;
  price: number;
  category?: string;
  brand?: string;
  stock?: number;
}

export interface ProductUpdateRequest extends Partial<ProductCreateRequest> {}

export interface ProductStatistics {
  total_products: number;
  active_products: number;
  inactive_products: number;
  total_inventory_value: number;
  categories: Record<string, number>;
  brands: Record<string, number>;
}

// 配置相关类型
export interface ConfigFile {
  filename: string;
  name: string;
  size: number;
  modified: string;
  created: string;
  path: string;
}

export interface ConfigData {
  filename: string;
  data: Record<string, any>;
}

export interface ConfigStatistics {
  total_configs: number;
  total_size: number;
  backup_count: number;
  backup_size: number;
  config_dir: string;
  backup_dir: string;
}

// LLM聊天相关类型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  provider?: string;
  model?: string;
}

export interface ChatRequest {
  message: string;
  provider?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  success: boolean;
  response?: string;
  provider?: string;
  model?: string;
  error?: string;
}

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  provider?: string;
  model?: string;
  error?: string;
}

export interface LLMProvider {
  name: string;
  description: string;
  models: string[];
  available: boolean;
}

export interface ProvidersResponse {
  providers: string[];
  provider_info: Record<string, LLMProvider>;
}

// ASR语音识别相关类型
export interface ASRRequest {
  provider?: string;
  audio_format: string;
  sample_rate: number;
  language: string;
}

export interface ASRResponse {
  success: boolean;
  text?: string;
  provider?: string;
  duration?: number;
  confidence?: number;
  error?: string;
}

export interface ASRProvider {
  name: string;
  description: string;
  supported_formats: string[];
  supported_languages: string[];
  available: boolean;
}

export interface ASRProvidersResponse {
  providers: string[];
  provider_info: Record<string, ASRProvider>;
}

// TTS文本转语音相关类型
export interface TTSRequest {
  text: string;
  provider?: string;
  voice?: string;
  speed: number;
  pitch: number;
  volume: number;
  language: string;
  audio_format: string;
}

export interface TTSResponse {
  success: boolean;
  text?: string;
  provider?: string;
  duration?: number;
  audio_length?: number;
  file_size?: number;
  download_url?: string;
  error?: string;
}

export interface TTSVoice {
  id: string;
  name: string;
  gender: string;
  language: string;
  age?: string;
}

export interface TTSProvider {
  name: string;
  description: string;
  supported_formats: string[];
  supported_languages: string[];
  supported_voices: TTSVoice[];
  available: boolean;
}

export interface TTSProvidersResponse {
  providers: string[];
  provider_info: Record<string, TTSProvider>;
}

export interface VoicesResponse {
  voices: TTSVoice[];
}

// 重新导出文档相关类型
export * from './document';


// 通用分页类型
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 错误类型
export interface ApiError {
  code: number;
  message: string;
  details?: any;
  timestamp: string;
}
