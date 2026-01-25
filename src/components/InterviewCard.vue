<template>
  <div class="question-card" :class="{ 'has-score': item.aiScore !== null }">
    <div class="question-header">
      <div class="question-content">
        <div class="question-label">
          <span class="label-icon">💡</span>
          <span>题目内容</span>
        </div>
        <p class="question-text">{{ item.question?.content }}</p>
      </div>
      <button 
        v-if="item.question?.content" 
        @click="playQuestion" 
        class="btn-icon btn-play"
        :disabled="isPlayingQuestion"
        :title="isPlayingQuestion ? '播放中' : '播放题目'"
      >
        <span v-if="isPlayingQuestion" class="icon-spinner">⏸️</span>
        <span v-else class="icon-play">🔊</span>
      </button>
    </div>
    
    <div class="answer-section">
      <div class="answer-header">
        <div class="answer-label">
          <span class="label-icon">✍️</span>
          <span>您的答案</span>
        </div>
        <div v-if="localAnswer" class="answer-length">
          {{ localAnswer.length }} 字
        </div>
      </div>
      
      <div class="answer-input-wrapper">
        <textarea
          v-model="localAnswer"
          placeholder="请输入您的答案，或点击下方麦克风按钮使用语音输入..."
          class="textarea"
          rows="5"
          @input="onAnswerChange"
        ></textarea>
        <div class="textarea-footer">
          <div class="input-hint">支持文本输入和语音输入</div>
        </div>
      </div>
      
      <div class="voice-controls">
        <button 
          @click="toggleRecording" 
          :class="['btn-voice', isRecording ? 'recording' : '']"
          :disabled="!canRecord"
          :title="isRecording ? '点击停止录音' : '点击开始录音'"
        >
          <span class="voice-icon">
            <span v-if="isRecording" class="recording-pulse"></span>
            {{ isRecording ? '⏹️' : '🎤' }}
          </span>
          <span class="voice-text">{{ isRecording ? '停止录音' : '语音输入' }}</span>
        </button>
        <div v-if="isRecording" class="recording-status">
          <span class="recording-dot"></span>
          <span>正在录音中...</span>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="feedback && feedback.hasUpdate" class="feedback-section">
        <div class="feedback-header">
          <div class="feedback-title">
            <span class="feedback-icon">💬</span>
            <span>实时反馈</span>
          </div>
          <div v-if="feedback.score" class="feedback-score">
            <span class="score-label">当前评分</span>
            <span class="score-value">{{ feedback.score }}分</span>
          </div>
        </div>
        <div class="feedback-content">
          <p class="feedback-text">{{ feedback.text }}</p>
          <div v-if="feedback.keywords && feedback.keywords.length > 0" class="keywords-section">
            <div class="keywords-label">识别关键词</div>
            <div class="keywords-list">
              <span v-for="keyword in feedback.keywords" :key="keyword" class="keyword-tag">
                {{ keyword }}
              </span>
            </div>
          </div>
          <div v-if="feedback.suggestions && feedback.suggestions.length > 0" class="suggestions-section">
            <div class="suggestions-label">💡 改进建议</div>
            <ul class="suggestions-list">
              <li v-for="(suggestion, index) in feedback.suggestions" :key="index">
                <span class="suggestion-icon">→</span>
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </transition>

    <div class="question-actions">
      <button 
        @click="submitAnswer" 
        class="btn btn-submit" 
        :disabled="!localAnswer || isSubmitting"
      >
        <span v-if="!isSubmitting">✅ 提交答案</span>
        <span v-else class="loading-text">
          <span class="spinner-small"></span>
          提交中...
        </span>
      </button>
      <div v-if="item.aiScore !== null" class="score-badge">
        <span class="score-icon">⭐</span>
        <span class="score-text">AI评分: <strong>{{ item.aiScore }}</strong>分</span>
      </div>
    </div>

    <transition name="slide">
      <div v-if="answerResponse" class="answer-response">
        <div class="response-header">
          <div class="response-title">
            <span class="response-icon">📊</span>
            <span>评分结果</span>
          </div>
          <div v-if="answerResponse.score" class="response-score">
            {{ answerResponse.score }}分
          </div>
        </div>
        <div class="response-content">
          <div class="response-feedback">
            <div class="feedback-label">详细反馈</div>
            <p>{{ answerResponse.feedback }}</p>
          </div>
          <div v-if="answerResponse.suggestions && answerResponse.suggestions.length > 0" class="response-suggestions">
            <div class="suggestions-label">✨ 改进建议</div>
            <ul class="suggestions-list">
              <li v-for="(suggestion, index) in answerResponse.suggestions" :key="index">
                <span class="suggestion-icon">💡</span>
                {{ suggestion }}
              </li>
            </ul>
          </div>
          <button 
            v-if="answerResponse.feedback" 
            @click="playFeedback" 
            class="btn btn-play-feedback"
            :disabled="isPlayingFeedback"
          >
            <span v-if="isPlayingFeedback">⏸️ 播放中...</span>
            <span v-else>🔊 播放反馈语音</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { AudioRecorder } from '../utils/audioRecorder';
import { asrApi, ttsApi } from '../api/speech';
import { pollFeedbackApi } from '../api/feedback';
import { submitAnswerApi } from '../api/interview';

export default {
  name: 'InterviewCard',
  props: {
    item: {
      type: Object,
      required: true,
    },
    interviewId: {
      type: Number,
      required: true,
    },
  },
  emits: ['answer-submitted'],
  setup(props, { emit }) {
    const localAnswer = ref(props.item.answer || '');
    const isRecording = ref(false);
    const canRecord = ref(false);
    const recorder = ref(null);
    const feedback = ref(null);
    const answerResponse = ref(null);
    const isPlayingQuestion = ref(false);
    const isPlayingFeedback = ref(false);
    const feedbackPollingInterval = ref(null);
    const isSubmitting = ref(false);

    // 检查浏览器支持
    onMounted(() => {
      canRecord.value = AudioRecorder.isSupported();
      if (!canRecord.value) {
        console.warn('浏览器不支持录音功能');
      }
    });

    // 清理
    onUnmounted(() => {
      stopFeedbackPolling();
      if (recorder.value && isRecording.value) {
        recorder.value.stop();
      }
    });

    // 监听答案变化，触发实时反馈
    const onAnswerChange = () => {
      if (localAnswer.value.length > 10) {
        startFeedbackPolling();
      }
    };

    // 开始实时反馈轮询
    const startFeedbackPolling = () => {
      if (feedbackPollingInterval.value) return;
      
      feedbackPollingInterval.value = setInterval(async () => {
        try {
          const res = await pollFeedbackApi(
            props.interviewId,
            props.item.id,
            localAnswer.value
          );
          if (res.data.code === 200 && res.data.data.hasUpdate) {
            feedback.value = res.data.data;
          }
        } catch (error) {
          console.error('获取实时反馈失败:', error);
        }
      }, 2000); // 每2秒轮询一次
    };

    // 停止实时反馈轮询
    const stopFeedbackPolling = () => {
      if (feedbackPollingInterval.value) {
        clearInterval(feedbackPollingInterval.value);
        feedbackPollingInterval.value = null;
      }
    };

    // 切换录音
    const toggleRecording = async () => {
      if (isRecording.value) {
        // 停止录音
        if (recorder.value) {
          const audioBlob = await recorder.value.stop();
          isRecording.value = false;
          
          // 调用ASR识别
          if (audioBlob) {
            try {
              const res = await asrApi(audioBlob);
              if (res.data.code === 200) {
                localAnswer.value = res.data.data.text || '';
                onAnswerChange();
              }
            } catch (error) {
              console.error('ASR识别失败:', error);
              alert('语音识别失败，请重试');
            }
          }
        }
      } else {
        // 开始录音
        try {
          recorder.value = new AudioRecorder();
          await recorder.value.start();
          isRecording.value = true;
        } catch (error) {
          console.error('开始录音失败:', error);
          alert(error.message || '无法开始录音');
        }
      }
    };

    // 播放题目
    const playQuestion = async () => {
      if (!props.item.question?.content) return;
      
      try {
        isPlayingQuestion.value = true;
        const res = await ttsApi(props.item.question.content);
        if (res.data.code === 200 && res.data.data.audioUrl) {
          const audio = new Audio(res.data.data.audioUrl);
          audio.play();
          audio.onended = () => {
            isPlayingQuestion.value = false;
          };
          audio.onerror = () => {
            isPlayingQuestion.value = false;
            alert('播放失败');
          };
        }
      } catch (error) {
        console.error('TTS播放失败:', error);
        isPlayingQuestion.value = false;
        alert('播放失败');
      }
    };

    // 播放反馈
    const playFeedback = async () => {
      if (!answerResponse.value?.feedback) return;
      
      try {
        isPlayingFeedback.value = true;
        const res = await ttsApi(answerResponse.value.feedback);
        if (res.data.code === 200 && res.data.data.audioUrl) {
          const audio = new Audio(res.data.data.audioUrl);
          audio.play();
          audio.onended = () => {
            isPlayingFeedback.value = false;
          };
          audio.onerror = () => {
            isPlayingFeedback.value = false;
            alert('播放失败');
          };
        }
      } catch (error) {
        console.error('TTS播放失败:', error);
        isPlayingFeedback.value = false;
        alert('播放失败');
      }
    };

    // 提交答案
    const submitAnswer = async () => {
      if (!localAnswer.value) {
        alert('请输入答案');
        return;
      }

      isSubmitting.value = true;
      try {
        stopFeedbackPolling();
        const res = await submitAnswerApi(props.item.id, localAnswer.value);
        if (res.data.code === 200) {
          answerResponse.value = res.data.data;
          emit('answer-submitted', props.item.id);
        }
      } catch (error) {
        console.error('提交答案失败:', error);
        alert(error.response?.data?.message || '提交失败');
      } finally {
        isSubmitting.value = false;
      }
    };

    return {
      localAnswer,
      isRecording,
      canRecord,
      feedback,
      answerResponse,
      isPlayingQuestion,
      isPlayingFeedback,
      isSubmitting,
      toggleRecording,
      playQuestion,
      playFeedback,
      submitAnswer,
      onAnswerChange,
    };
  },
};
</script>

<style scoped>
.question-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.question-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.question-card.has-score::before {
  transform: scaleX(1);
}

.question-card:hover {
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f3f4f6;
}

.question-content {
  flex: 1;
}

.question-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 12px;
}

.label-icon {
  font-size: 1.1em;
}

.question-text {
  margin: 0;
  color: #1f2937;
  font-size: 1.1em;
  line-height: 1.6;
  font-weight: 500;
}

.btn-icon {
  padding: 10px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1em;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  flex-shrink: 0;
}

.btn-icon:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-icon:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.answer-section {
  margin-bottom: 25px;
}

.answer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.answer-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  font-weight: 600;
  color: #6b7280;
}

.answer-length {
  font-size: 0.85em;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 4px 12px;
  border-radius: 12px;
}

.answer-input-wrapper {
  position: relative;
  margin-bottom: 15px;
}

.textarea {
  width: 100%;
  padding: 15px;
  font-size: 1em;
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  resize: vertical;
  outline: none;
  font-family: inherit;
  transition: all 0.3s ease;
  background: #fafafa;
  min-height: 120px;
}

.textarea:focus {
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.textarea-footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
}

.input-hint {
  font-size: 0.85em;
  color: #9ca3af;
}

.voice-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
}

.btn-voice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
}

.btn-voice:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
}

.btn-voice.recording {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  animation: pulse 1.5s infinite;
}

.btn-voice:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.voice-icon {
  font-size: 1.2em;
  position: relative;
}

.recording-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  animation: ripple 1.5s infinite;
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

@keyframes pulse {
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 2px 8px rgba(245, 87, 108, 0.3);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 4px 16px rgba(245, 87, 108, 0.5);
  }
}

.recording-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f5576c;
  font-weight: 600;
  font-size: 0.9em;
}

.recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f5576c;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.feedback-section {
  background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);
  border-left: 4px solid #3b82f6;
  padding: 20px;
  margin-bottom: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.2);
}

.feedback-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1e40af;
  font-size: 1.05em;
}

.feedback-icon {
  font-size: 1.2em;
}

.feedback-score {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-label {
  font-size: 0.85em;
  color: #6b7280;
}

.score-value {
  font-size: 1.3em;
  font-weight: 700;
  color: #3b82f6;
}

.feedback-content {
  font-size: 0.95em;
}

.feedback-text {
  color: #1f2937;
  line-height: 1.6;
  margin: 0 0 15px 0;
}

.keywords-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
}

.keywords-label {
  font-size: 0.9em;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 10px;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  display: inline-block;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
  transition: transform 0.2s;
}

.keyword-tag:hover {
  transform: translateY(-2px);
}

.suggestions-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
}

.suggestions-label {
  font-size: 0.9em;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 10px;
}

.suggestions-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.suggestions-list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  color: #374151;
  line-height: 1.5;
}

.suggestion-icon {
  color: #3b82f6;
  font-weight: bold;
  flex-shrink: 0;
}

.question-actions {
  display: flex;
  gap: 15px;
  align-items: center;
  justify-content: space-between;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 2px solid #f3f4f6;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  color: white;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-submit {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(17, 153, 142, 0.4);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.score-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  padding: 10px 20px;
  border-radius: 25px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

.score-icon {
  font-size: 1.2em;
}

.score-text {
  font-size: 0.95em;
}

.score-text strong {
  font-size: 1.2em;
}

.answer-response {
  margin-top: 25px;
  padding: 25px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 16px;
  border: 2px solid #fbbf24;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
}

.response-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(251, 191, 36, 0.3);
}

.response-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  color: #92400e;
  font-size: 1.2em;
}

.response-icon {
  font-size: 1.3em;
}

.response-score {
  font-size: 2em;
  font-weight: 700;
  color: #d97706;
  background: white;
  padding: 8px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.response-content {
  color: #78350f;
}

.response-feedback {
  margin-bottom: 20px;
}

.feedback-label {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 0.95em;
  color: #92400e;
}

.response-feedback p {
  margin: 0;
  line-height: 1.6;
  color: #78350f;
}

.response-suggestions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(251, 191, 36, 0.3);
}

.response-suggestions .suggestions-label {
  color: #92400e;
  font-weight: 600;
  margin-bottom: 12px;
}

.response-suggestions .suggestions-list li {
  color: #78350f;
  padding: 10px 0;
}

.response-suggestions .suggestion-icon {
  color: #f59e0b;
}

.btn-play-feedback {
  margin-top: 20px;
  width: 100%;
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.btn-play-feedback:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.4s ease;
}

.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
