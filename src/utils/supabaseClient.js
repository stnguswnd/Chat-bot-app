import axios from "axios";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ✅ 토큰이 필요한 axios 인스턴스 (user별 인증 요청용)
export function createSupabaseClient(token) {
  // 환경 변수 검증
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("❌ Supabase 환경 변수가 설정되지 않았습니다.");
    console.error("SUPABASE_URL:", SUPABASE_URL ? "설정됨" : "❌ 누락");
    console.error("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "설정됨" : "❌ 누락");
  }

  if (!token) {
    console.warn("⚠️ 토큰이 없습니다. 인증이 필요한 요청이 실패할 수 있습니다.");
  }

  const client = axios.create({
    baseURL: `${SUPABASE_URL}/rest/v1`,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`, // Redux에서 받은 access_token
      "Content-Type": "application/json",
      "Prefer": "return=representation", // Supabase에서 생성된 데이터 반환
    },
  });

  // 요청 인터셉터 추가
  client.interceptors.request.use(
    (config) => {
      console.log("🚀 Supabase 요청:", config.method?.toUpperCase(), config.url);
      return config;
    },
    (error) => {
      console.error("❌ 요청 인터셉터 오류:", error);
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터 추가
  client.interceptors.response.use(
    (response) => {
      console.log("✅ Supabase 응답 성공:", response.status, response.config.url);
      return response;
    },
    (error) => {
      console.error("❌ Supabase 응답 오류:", error.response?.status, error.config?.url);
      console.error("오류 상세:", error.response?.data || error.message);
      return Promise.reject(error);
    }
  );

  return client;
}
