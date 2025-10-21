import { GoogleGenAI } from "@google/genai";

// VITE 접두사가 붙지 않는다. (Vercel 환경 변수)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// API 키 로딩 상태 확인 로그 (보안 고려)
console.log("=== API 키 로딩 상태 확인 ===");
console.log("GEMINI_API_KEY 존재 여부:", !!GEMINI_API_KEY);
console.log("GEMINI_API_KEY 길이:", GEMINI_API_KEY ? GEMINI_API_KEY.length : 0);
console.log("GEMINI_API_KEY 형식 확인:", GEMINI_API_KEY ? (GEMINI_API_KEY.startsWith('AI') ? '올바른 형식' : '잘못된 형식') : '없음');
console.log("GEMINI 관련 환경 변수:", Object.keys(process.env).filter(key => key.includes('GEMINI')).length + "개 발견");

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const chat = ai.chats.create({
  model: "gemini-2.5-flash",
});

// 응답 스키마
const responseSchema = {
  type: "object",
  properties: {
    // 객체의 속성들
    isMemo: {
      type: "boolean",
      description: "할 일, 메모, 업무, 계획 등 관련 여부",
    },
    content: {
      type: "string",
      description: "할 일 내용(본문)",
    },
    dueDate: {
      type: "string",
      description: "할 일 마감 기한(YYYY-MM-DD)",
    },
    priority: {
      type: "string",
      description: "할 일 우선 순위(HIGH, MEDIUM, LOW)",
    },
    category: {
      type: "string",
      description: "할 일 종류(TASK, MEMO, WORK, PLANNING)",
    },
  },
  required: ["isMemo", "content", "dueDate"],
  additionalProperties: false,
};

const systemInstruction = [
  `오늘 날짜: ${new Date().toISOString().split("T")[0]}`,
  "당신은 할 일 관리 AI입니다. 오직 할 일이나 업무 관련 내용만 처리합니다.",
  "JSON 형식으로 응답합니다.",
  "할 일이 아닌 일반적인 대화, 인사, 질문은 무시하고, isMemo를 false로 설정합니다.",
  "사용자의 질문을 이해할 수 없는 경우에는 isMemo를 false로 설정합니다.",
  "응답할 때는 할 일 내용, 마감 날짜, 우선 순위, 할 일 종류를 포함한 객체를 생성합니다.",
];

const config = {
  responseMimeType: "application/json", // 응답 형식(확장자)
  responseJsonSchema: responseSchema, // 응답 JSON 구조
  systemInstruction: systemInstruction,
};

// Vercel 서버리스 handler 함수
export default async function handler(req, res) {
  try {
    console.log("=== API 호출 시작 ===");
    console.log("요청 메서드:", req.method);
    console.log("요청 바디:", req.body);
    
    const { message } = req.body;
    
    if (!message) {
      console.log("에러: 메시지가 없습니다");
      return res.status(400).json({ error: "메시지가 필요합니다" });
    }

    console.log("AI 요청 시작...");
    const response = await chat.sendMessage({
      message: message,
      config: config,
    });

    console.log("AI 응답 받음 - 길이:", response.text ? response.text.length : 0);
    const parsedData = JSON.parse(response.text);
    console.log("파싱된 데이터 - isMemo:", parsedData.isMemo, "content 길이:", parsedData.content ? parsedData.content.length : 0);

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("=== 에러 발생 ===");
    console.error("에러 타입:", error.name);
    console.error("에러 메시지:", error.message);
    console.error("에러 스택:", error.stack);
    return res.status(500).json({ error: "서버 에러", details: error.message });
  }
}
