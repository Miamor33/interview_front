import axios from 'axios';

const API_BASE = 'http://localhost:8080';

/**
 * 轮询获取实时反馈
 */
export const pollFeedbackApi = async (interviewId, interviewItemId, currentAnswer) => {
  return axios.post(`${API_BASE}/api/ai/feedback/poll`, {
    interviewId,
    interviewItemId,
    currentAnswer,
  });
};
