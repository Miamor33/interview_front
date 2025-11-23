<template>
  <div class="container">
    <h1 class="title">面试系统 Demo</h1>

    <div class="card">
      <h2 class="subtitle">开始面试</h2>
      <div class="start-interview">
        <input
            v-model.number="candidateId"
            type="number"
            placeholder="输入候选人ID"
            class="input"
        />
        <button
            @click="startInterview"
            :disabled="!candidateId"
            class="btn btn-blue"
        >
          开始面试
        </button>
      </div>

      <div v-if="interview" class="interview-section">
        <p><strong>面试ID:</strong> {{ interview.id }}</p>
        <p><strong>状态:</strong> {{ interview.status === 0 ? '进行中' : '完成' }}</p>

        <h3 class="subtitle">题目列表</h3>
        <ul class="question-list">
          <li v-for="item in interviewItems" :key="item.id" class="question-card">
            <p><strong>题目:</strong> {{ item.question?.content }}</p>
            <textarea
                v-model="answers[item.id]"
                placeholder="请输入答案"
                class="textarea"
                rows="3"
            ></textarea>
            <div class="question-actions">
              <button @click="submitAnswer(item.id)" class="btn btn-green">
                提交答案
              </button>
              <span v-if="item.aiScore !== null" class="ai-score">
                AI评分: {{ item.aiScore }}
              </span>
            </div>
          </li>
        </ul>

        <button
            @click="finishInterview"
            :disabled="interview.status !== 0"
            class="btn btn-purple finish-btn"
        >
          完成面试
        </button>

        <div v-if="interview.score !== null" class="average-score">
          面试平均分: {{ interview.score }}
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
  submitAnswerApi,
  getInterviewItemByIdApi,
  finishInterviewApi,
} from "./api/interview";

export default {
  setup() {
    const candidateId = ref(null);
    const interview = ref(null);
    const interviewItems = ref([]);
    const answers = reactive({});

    const startInterview = async () => {
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
        alert("开始面试失败");
      }
    };

    const submitAnswer = async (itemId) => {
      const answer = answers[itemId];
      if (!answer) return alert("请输入答案");

      try {
        const res = await submitAnswerApi(itemId, answer);
        const updatedRes = await getInterviewItemByIdApi(itemId);
        const index = interviewItems.value.findIndex((i) => i.id === itemId);
        if (index !== -1) {
          const updatedItem = updatedRes.data.data;
          interviewItems.value[index].aiScore = updatedItem.aiScore ?? null;
          interviewItems.value[index].answer = updatedItem.answer ?? "";
        }
        // 显示后端返回的 message
        alert(res.data?.message || "答案提交成功");
      } catch (err) {
        console.error(err);
        // 显示错误信息，如果接口返回了 message
        alert(err.response?.data?.message || "答案提交失败");
      }
    };



    const finishInterview = async () => {
      if (!interview.value) return;
      try {
        const res = await finishInterviewApi(interview.value.id);
        interview.value = res.data.data;
        alert("面试完成");
      } catch (err) {
        console.error(err);
        alert("完成面试失败");
      }
    };

    return {
      candidateId,
      interview,
      interviewItems,
      answers,
      startInterview,
      submitAnswer,
      finishInterview,
    };
  },
};
</script>

<style>
/* 容器和标题 */
.container {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 20px;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

.title {
  text-align: center;
  font-size: 2.2em;
  margin-bottom: 20px;
}

.subtitle {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 10px;
}

/* 卡片样式 */
.card {
  background-color: #fdfdfd;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 输入和按钮 */
.start-interview {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  outline: none;
  font-size: 1em;
}

.input:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 1em;
  cursor: pointer;
  color: white;
}

.btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.btn-blue {
  background-color: #409eff;
}

.btn-blue:hover:not(:disabled) {
  background-color: #66b1ff;
}

.btn-green {
  background-color: #67c23a;
}

.btn-green:hover:not(:disabled) {
  background-color: #85ce61;
}

.btn-purple {
  background-color: #a56eff;
}

.btn-purple:hover:not(:disabled) {
  background-color: #c78eff;
}

.finish-btn {
  margin-top: 20px;
}

/* 题目列表 */
.question-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

/* 题目列表 */
.question-card {
  background-color: #f9f9f9; /* 调亮背景，和文字有对比 */
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  color: #333; /* 确保文字是深色，容易阅读 */
}

.question-card p {
  color: #333; /* 题目文字深色 */
}

.textarea {
  width: 100%;
  padding: 8px;
  font-size: 1em;
  border-radius: 6px;
  border: 1px solid #ccc;
  resize: vertical;
  margin-top: 6px;
  outline: none;
}

.textarea:focus {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* 题目操作区域 */
.question-actions {
  margin-top: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
}

.ai-score {
  font-weight: bold;
  color: #606266;
}

/* 面试平均分 */
.average-score {
  text-align: center;
  font-weight: bold;
  font-size: 1.2em;
  margin-top: 15px;
}
</style>
