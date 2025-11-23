import './style.css'
import { createApp } from "vue";
import App from "./App.vue";
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8080";
axios.defaults.headers.post["Content-Type"] = "application/json";

const app = createApp(App);
app.mount("#app");  // ✅ 挂载一次
