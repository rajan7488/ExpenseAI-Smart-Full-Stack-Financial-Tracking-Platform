import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Routes that intentionally have no token
const PUBLIC_ROUTES = ["/auth/login", "/auth/register", "/auth/forgot-password"];

API.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_ROUTES.some((route) => config.url?.includes(route));
    const hasToken =
      config.headers.Authorization ||
      API.defaults.headers.common["Authorization"];

    if (!hasToken && !isPublic) {
      console.warn("⚠️ Outbound call lacks an authorization token signature!", config.url);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default API;