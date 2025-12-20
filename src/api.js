import axios from "axios";

const baseURL = "https://enter.itlive.uz"
const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    error ? prom.reject(error) : prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.request.use((config) => {
  if (
    !config.url.includes("/auth/login") &&
    !config.url.includes("/auth/refresh")
  ) {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url.includes("/auth/login")
    ) {
      original._retry = true;

      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) {
        // Refresh token yo'q, login sahifasiga yo'naltir
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/auth";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = "Bearer " + token;
            return api(original);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const res = await api.post("/auth/refresh", {
          refresh_token: refresh,
        });

        // Respons strukturasini tekshir - API qaysi formada qaytarishi kerak
        const newAccess =
          res.data?.access_token ||
          res.data?.data?.access_token ||
          res.data?.token;

        const newRefresh =
          res.data?.refresh_token ||
          res.data?.data?.refresh_token;

        console.log("Refresh response:", res.data);
        console.log("New access token:", newAccess);

        if (!newAccess) {
          throw new Error(
            "Access token responstada topilmadi. API respons: " +
              JSON.stringify(res.data)
          );
        }

        // Tokenni saqlash
        localStorage.setItem("access_token", newAccess);
        if (newRefresh) {
          localStorage.setItem("refresh_token", newRefresh);
        }

        // API default headerini yangilash
        api.defaults.headers.Authorization = `Bearer ${newAccess}`;

        // Asli requestning headerini yangilash
        original.headers.Authorization = `Bearer ${newAccess}`;

        // Qo'yilgan requestlarni qayta ishlash
        processQueue(null, newAccess);

        // Asli requestni qayta ishlash
        return api(original);
      } catch (err) {
        console.error("Refresh token xatosi:", err);

        // Qo'yilgan requestlarni reject qilish
        processQueue(err, null);

        // Tokenlarni o'chirish va login sahifasiga yo'naltirish
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");

        window.location.href = "/auth";

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;