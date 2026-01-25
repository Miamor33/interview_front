<template>
  <div class="app-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-circle circle-1"></div>
      <div class="bg-circle circle-2"></div>
      <div class="bg-circle circle-3"></div>
    </div>

    <div class="main-container">
      <!-- 头部 -->
      <header class="app-header">
        <div class="header-content">
          <div class="logo-section">
            <div class="logo-icon">🎯</div>
            <h1 class="app-title">AI智能面试系统</h1>
          </div>
          <div class="header-subtitle">智能评估 · 实时反馈 · 专业指导</div>
        </div>
      </header>

      <!-- 主要内容 -->
      <div class="content-wrapper">
        <div class="card main-card">
          <!-- 开始面试区域 -->
          <div v-if="!interview" class="start-section">
            <div class="welcome-content">
              <div class="welcome-icon">🚀</div>
              <h2 class="section-title">开始新的面试</h2>
              <p class="section-desc">输入您的候选人ID，开始智能面试体验</p>
            </div>
            
            <div class="start-interview-form">
              <div class="input-wrapper">
                <label class="input-label">
                  <span class="label-icon">👤</span>
                  候选人ID
                </label>
                <input
                    v-model.number="candidateId"
                    type="number"
                    placeholder="请输入候选人ID"
                    class="input-field"
                />
              </div>
              <button
                  @click="startInterview"
                  :disabled="!candidateId || isLoading"
                  class="btn btn-primary btn-large"
              >
                <span v-if="!isLoading">✨ 开始面试</span>
                <span v-else class="loading-text">
                  <span class="spinner"></span> 正在准备...
                </span>
              </button>
            </div>
          </div>

          <!-- 面试进行中 -->
          <div v-if="interview" class="interview-section">
            <!-- 面试信息卡片 -->
            <div class="interview-info-card">
              <div class="info-item">
                <div class="info-label">面试ID</div>
                <div class="info-value">#{{ interview.id }}</div>
              </div>
              <div class="info-divider"></div>
              <div class="info-item">
                <div class="info-label">状态</div>
                <div class="info-value">
                  <span :class="['status-badge', interview.status === 0 ? 'status-active' : 'status-completed']">
                    <span class="status-dot"></span>
                    {{ interview.status === 0 ? '进行中' : '已完成' }}
                  </span>
                </div>
              </div>
              <div class="info-divider"></div>
              <div class="info-item" v-if="interview.score !== null">
                <div class="info-label">当前得分</div>
                <div class="info-value score-value">{{ interview.score }}分</div>
              </div>
            </div>

            <!-- 题目列表 -->
            <div class="questions-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="title-icon">📝</span>
                  面试题目
                  <span class="question-count">({{ interviewItems.length }}题)</span>
                </h3>
              </div>
              
              <div class="question-list">
                <div
                  v-for="(item, index) in interviewItems"
                  :key="item.id"
                  class="question-wrapper"
                >
                  <div class="question-number">题目 {{ index + 1 }}</div>
                  <InterviewCard
                    :item="item"
                    :interview-id="interview.id"
                    @answer-submitted="handleAnswerSubmitted"
                  />
                </div>
              </div>
            </div>

            <!-- 完成面试按钮 -->
            <div class="finish-section">
              <button
                  @click="finishInterview"
                  :disabled="interview.status !== 0 || isLoading"
                  class="btn btn-success btn-large finish-btn"
              >
                <span v-if="!isLoading">✅ 完成面试</span>
                <span v-else class="loading-text">
                  <span class="spinner"></span> 处理中...
                </span>
              </button>
              
              <div v-if="interview.score !== null" class="final-score-card">
                <div class="score-icon">🏆</div>
                <div class="score-content">
                  <div class="score-label">最终得分</div>
                  <div class="score-number">{{ interview.score }}</div>
                  <div class="score-desc">恭喜完成面试！</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
//
// author: Mi amor
import { reactive, ref } from "vue";
import {
  startInterviewApi,
  getInterviewItemsApi,
  getInterviewItemByIdApi,
  finishInterviewApi,
} from "./api/interview";
import InterviewCard from "./components/InterviewCard.vue";

export default {
  components: {
    InterviewCard,
  },
  setup() {
    const candidateId = ref(null);
    const interview = ref(null);
    const interviewItems = ref([]);
    const answers = reactive({});
    const isLoading = ref(false);

    const startInterview = async () => {
      if (!candidateId.value) return;
      
      isLoading.value = true;
      try {
        const res = await startInterviewApi(candidateId.value);
        interview.value = res.data.data;

        const itemsRes = await getInterviewItemsApi(interview.value.id);
        interviewItems.value = itemsRes.data.data.map((item) => ({
          ...item,
          aiScore: item.aiScore ?? null,
        }));

        interviewItems.value.forEach((item) => {
          answers[item.id] = item.answer ?? "";
        });
      } catch (err) {
        console.error(err);
        alert("开始面试失败: " + (err.response?.data?.message || err.message));
      } finally {
        isLoading.value = false;
      }
    };

    const handleAnswerSubmitted = async (itemId) => {
      try {
        const updatedRes = await getInterviewItemByIdApi(itemId);
        const index = interviewItems.value.findIndex((i) => i.id === itemId);
        if (index !== -1) {
          const updatedItem = updatedRes.data.data;
          interviewItems.value[index].aiScore = updatedItem.aiScore ?? null;
          interviewItems.value[index].answer = updatedItem.answer ?? "";
        }
      } catch (err) {
        console.error(err);
      }
    };



    const finishInterview = async () => {
      if (!interview.value) return;
      
      isLoading.value = true;
      try {
        const res = await finishInterviewApi(interview.value.id);
        interview.value = res.data.data;
        // 延迟一下让用户看到完成效果
        setTimeout(() => {
          alert("🎉 面试已完成！最终得分: " + interview.value.score + "分");
        }, 300);
      } catch (err) {
        console.error(err);
        alert("完成面试失败: " + (err.response?.data?.message || err.message));
      } finally {
        isLoading.value = false;
      }
    };

    return {
      candidateId,
      interview,
      interviewItems,
      answers,
      isLoading,
      startInterview,
      handleAnswerSubmitted,
      finishInterview,
    };
  },
};
</script>

<style scoped>
/* 全局样式重置 */
* {
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

/* 背景装饰 */
.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 20s infinite ease-in-out;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  top: 50%;
  right: -50px;
  animation-delay: 5s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: -50px;
  left: 20%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* 主容器 */
.main-container {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 头部 */
.app-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 40px 20px;
  animation: fadeInDown 0.8s ease-out;
}

.header-content {
  color: white;
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 10px;
}

.logo-icon {
  font-size: 48px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.app-title {
  font-size: 2.5em;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  background: linear-gradient(45deg, #fff, #e0e7ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-subtitle {
  font-size: 1.1em;
  opacity: 0.9;
  font-weight: 300;
  letter-spacing: 1px;
}

/* 内容区域 */
.content-wrapper {
  animation: fadeInUp 0.8s ease-out 0.2s both;
}

.main-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* 开始面试区域 */
.start-section {
  text-align: center;
}

.welcome-content {
  margin-bottom: 40px;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.section-title {
  font-size: 2em;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px 0;
}

.section-desc {
  font-size: 1.1em;
  color: #666;
  margin: 0;
}

.start-interview-form {
  max-width: 500px;
  margin: 0 auto;
}

.input-wrapper {
  margin-bottom: 25px;
  text-align: left;
}

.input-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #555;
  margin-bottom: 10px;
  font-size: 0.95em;
}

.label-icon {
  font-size: 1.2em;
}

.input-field {
  width: 100%;
  padding: 15px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 1.1em;
  outline: none;
  transition: all 0.3s ease;
  background: white;
}

.input-field:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
  transform: translateY(-2px);
}

/* 按钮样式 */
.btn {
  border: none;
  border-radius: 12px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn-large {
  padding: 16px 32px;
  font-size: 1.1em;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.btn-success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
}

.btn-success:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(17, 153, 142, 0.5);
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 16px;
  height: 16px;
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

/* 面试信息卡片 */
.interview-info-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 25px;
  margin-bottom: 30px;
  color: white;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
}

.info-item {
  text-align: center;
}

.info-label {
  font-size: 0.9em;
  opacity: 0.9;
  margin-bottom: 8px;
  font-weight: 500;
}

.info-value {
  font-size: 1.3em;
  font-weight: 700;
}

.info-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.3);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 600;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: blink 2s infinite;
}

.status-active {
  background: rgba(255, 255, 255, 0.2);
}

.status-active .status-dot {
  background: #4ade80;
}

.status-completed {
  background: rgba(255, 255, 255, 0.2);
}

.status-completed .status-dot {
  background: #60a5fa;
}

.score-value {
  color: #fbbf24;
  font-size: 1.5em;
}

/* 题目区域 */
.questions-section {
  margin-bottom: 30px;
}

.section-header {
  margin-bottom: 25px;
}

.section-header .section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.5em;
  color: #333;
}

.title-icon {
  font-size: 1.2em;
}

.question-count {
  font-size: 0.8em;
  color: #666;
  font-weight: 400;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.question-wrapper {
  position: relative;
}

.question-number {
  position: absolute;
  top: -12px;
  left: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 600;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 完成区域 */
.finish-section {
  margin-top: 40px;
  text-align: center;
}

.finish-btn {
  margin-bottom: 30px;
}

.final-score-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 16px;
  padding: 30px;
  color: white;
  box-shadow: 0 8px 24px rgba(245, 87, 108, 0.3);
  animation: scaleIn 0.5s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.score-icon {
  font-size: 48px;
}

.score-content {
  text-align: left;
}

.score-label {
  font-size: 0.9em;
  opacity: 0.9;
  margin-bottom: 5px;
}

.score-number {
  font-size: 2.5em;
  font-weight: 700;
  margin-bottom: 5px;
}

.score-desc {
  font-size: 1em;
  opacity: 0.9;
}

/* 动画 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-card {
    padding: 25px;
  }

  .app-title {
    font-size: 1.8em;
  }

  .interview-info-card {
    flex-direction: column;
    gap: 15px;
  }

  .info-divider {
    width: 100%;
    height: 1px;
  }

  .final-score-card {
    flex-direction: column;
    text-align: center;
  }

  .score-content {
    text-align: center;
  }
}
</style>
