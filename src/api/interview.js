import axios from "axios";

// 开始面试
export const startInterviewApi = (candidateId) => {
    return axios.get("/interview-flow/start", {
        params: { candidateId }
    });
};


// 获取面试题列表
export const getInterviewItemsApi = (interviewId) => {
    return axios.get("/interview-items", { params: { interviewId } });
};

// 提交答案
export const submitAnswerApi = (interviewItemId, candidateAnswer) => {
    return axios.post("/interview-flow/answer", { interviewItemId, candidateAnswer });
};

// 获取单个面试题
export const getInterviewItemByIdApi = (interviewItemId) => {
    return axios.get(`/interview-items/${interviewItemId}`);
};

// 完成面试
export const finishInterviewApi = (interviewId) => {
    return axios.get("/interview-flow/finish", {
        params: { interviewId }
    });
};
