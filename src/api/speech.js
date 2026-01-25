import axios from 'axios';

const API_BASE = 'http://localhost:8080';

/**
 * ASR语音识别
 */
export const asrApi = async (audioFile) => {
  const formData = new FormData();
  formData.append('file', audioFile);
  
  return axios.post(`${API_BASE}/api/speech/asr`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * TTS语音合成
 */
export const ttsApi = async (text, voice, speed, pitch) => {
  const params = new URLSearchParams();
  params.append('text', text);
  if (voice) params.append('voice', voice);
  if (speed) params.append('speed', speed);
  if (pitch) params.append('pitch', pitch);
  
  return axios.post(`${API_BASE}/api/speech/tts?${params.toString()}`);
};
