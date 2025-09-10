/**
 * 文档处理相关的类型定义
 */

export enum DocumentType {
  PDF = "pdf",
  PPTX = "pptx",
  PPT = "ppt",
  DOCX = "docx",
  DOC = "doc",
  TXT = "txt",
  IMAGE = "image",
  PNG = "png",
  JPG = "jpg",
  JPEG = "jpeg",
  GIF = "gif",
  BMP = "bmp"
}

export interface DocumentInfo {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  document_type: DocumentType;
  mime_type: string;
  upload_time: string;
  processed: boolean;
  metadata: Record<string, any>;
}

export interface ParseResult {
  document_id: string;
  success: boolean;
  text_content: string;
  page_count: number;
  word_count: number;
  images: string[];
  tables: Array<{
    page?: number;
    data: any[][];
  }>;
  metadata: Record<string, any>;
  error_message?: string;
  parse_time: string;
  duration: number;
}

export interface ImageAnalysisResult {
  image_path: string;
  text_content: string;
  objects: Array<Record<string, any>>;
  faces: Array<Record<string, any>>;
  confidence: number;
  analysis_time: string;
}

export interface ContentEditRequest {
  document_id: string;
  new_content: string;
  editor_name?: string;
  edit_notes?: string;
}

export interface ContentEditHistory {
  id: string;
  document_id: string;
  original_content: string;
  edited_content: string;
  editor_name?: string;
  edit_notes?: string;
  edit_time: string;
}

export interface DocumentProcessingJob {
  id: string;
  document_id: string;
  job_type: string;
  status: string;
  progress: number;
  result?: Record<string, any>;
  error_message?: string;
  created_time: string;
  started_time?: string;
  completed_time?: string;
}

export interface GenerationRequest {
  document_id: string;
  content: string;
  generation_type?: string;
  prompt_template?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: string;
  stream?: boolean;
  split_text?: boolean;
}

export interface TTSSegmentRequest {
  segments: string[];
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: string;
  stream?: boolean;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'child';
  language: string;
  description?: string;
}

export interface TTSSettings {
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
  format: string;
  splitText: boolean;
}

export interface DocumentWorkflowState {
  // 上传阶段
  upload: {
    completed: boolean;
    document?: DocumentInfo;
    error?: string;
  };
  
  // 解析阶段
  parse: {
    completed: boolean;
    result?: ParseResult;
    error?: string;
  };
  
  // 编辑阶段
  edit: {
    completed: boolean;
    content?: string;
    error?: string;
  };
  
  // AI生成阶段
  generate: {
    completed: boolean;
    content?: string;
    streaming: boolean;
    error?: string;
  };
  
  // TTS合成阶段
  tts: {
    completed: boolean;
    audioSegments: AudioSegment[];
    currentSegment: number;
    totalSegments: number;
    streaming: boolean;
    error?: string;
  };
}

export interface AudioSegment {
  index: number;
  text: string;
  audioData: string;
  duration?: number;
  playing?: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentSegment: number;
  totalSegments: number;
  currentTime: number;
  totalTime: number;
  volume: number;
  speed: number;
}

// 工作流步骤定义
export enum WorkflowStep {
  UPLOAD = 'upload',
  PARSE = 'parse',
  EDIT = 'edit',
  GENERATE = 'generate',
  TTS = 'tts',
  PLAY = 'play'
}

export interface WorkflowStepInfo {
  key: WorkflowStep;
  title: string;
  description: string;
  icon: string;
  completed: boolean;
  current: boolean;
  error?: string;
}
