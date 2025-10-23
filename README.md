# 🧠 Gemini Todo Assistant  
> Gemini API 기반 AI 할일 목록 관리 프로젝트  

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Build-Vite-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Style-TailwindCSS-06B6D4?logo=tailwindcss&logoColor=white)
![ReduxToolkit](https://img.shields.io/badge/State-Redux_Toolkit-764ABC?logo=redux&logoColor=white)
![Axios](https://img.shields.io/badge/API-Axios-5A29E4?logo=axios&logoColor=white)
![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📘 프로젝트 개요

**Gemini Todo Assistant**는  
Google Gemini API를 활용하여 사용자의 자연어 입력을 기반으로 할일 목록을 자동 생성하고,  
이를 Supabase에 저장하여 관리할 수 있는 **AI 기반 할일 관리 서비스**입니다.  

이 프로젝트는 **새싹 청년취업사관학교 풀스택 과정의 React 심화 과제**를 발전시킨 개인 프로젝트입니다.  
수업시간에 배운 Gemini API를 실제로 응용하며,  
AI가 생성한 응답을 Schema 기반으로 파싱하여 Todo 데이터 구조에 통합하는 과정을 중점적으로 구현했습니다.

---

## ⚙️ 기술 스택

| 구분 | 기술 | 설명 |
|------|------|------|
| Frontend | **React (Vite)** | 빠른 개발 환경 구성 및 컴포넌트 단위 구조 유지 |
| Styling | **TailwindCSS** | 효율적인 유틸리티 기반 스타일링 |
| State Management | **Redux Toolkit + Persist** | 전역 상태 및 로그인 유지 기능 구현 |
| API 요청 | **Axios** | 비동기 통신 및 에러 핸들링 간소화 |
| Backend | **Supabase** | 인증 및 DB 관리 (RLS 정책 포함) |
| AI Engine | **Gemini API (Google)** | 사용자의 자연어를 구조화된 JSON 형태로 변환 |
| Deploy | **Vercel** | 프론트엔드 배포 및 서버리스 함수 처리 |

> ⚡ **선택 이유 요약**
> - **React + Vite**: 빠른 HMR과 직관적인 컴포넌트 개발 환경.  
> - **TailwindCSS**: CSS-in-JS보다 간결하고 유지보수 용이.  
> - **Redux Toolkit**: 상태 관리 코드량을 최소화하고 구조적 유지보수를 용이하게 함.  
> - **Supabase**: 인증, DB, API를 서버 구축 없이 통합 관리 가능.  
> - **Gemini API**: 대화형 입력을 구조화된 데이터(JSON Schema)로 변환 가능.

---

## 🚀 주요 기능

| 기능 구분 | 설명 |
|------------|------|
| 🤖 **AI 할일 생성** | 사용자가 Chat에 “내일 오전 10시에 회의”처럼 입력하면, Gemini API가 `responseSchema`를 기반으로 자동 구조화된 데이터(JSON 객체) 반환 |
| ✅ **AI 응답 검증 단계** | 사용자는 “예 / 아니오” 선택으로 Gemini가 제안한 일정 저장 여부를 결정 |
| 💾 **할일 목록 CRUD** | Supabase `memos` 테이블과 연동되어 생성, 조회, 수정, 삭제 기능 구현 |
| 🔍 **필터 기능** | - 카테고리별 필터 (TASK / MEMO / WORK / PLANNING)<br> - 마감일, 작성일 기준 정렬<br> - 완료 / 미완료 구분 필터 |
| 🔐 **JWT 로그인 + Redux Persist** | 로그인 후 토큰을 LocalStorage에 저장하여 새로고침 시 세션 유지 |
| ⚙️ **서버리스 API 처리** | Vercel Functions를 이용하여 Gemini API 키를 보호하고, 클라이언트 키 노출 방지 |
| ⚠️ **보안 제한사항** | Supabase 인증 구조상 Refresh Token 제어 불가 → Access Token 만료 시 재로그인 필요 |

---

## 🧩 AI Response Schema

Gemini API는 다음과 같은 스키마 형식으로 할일 정보를 반환합니다.

```js
const responseSchema = {
  type: "object",
  properties: {
    isMemo: { type: "boolean", description: "할 일, 메모, 업무, 계획 등 관련 여부" },
    content: { type: "string", description: "할 일 내용(본문)" },
    dueDate: { type: "string", description: "마감 기한(YYYY-MM-DD)" },
    priority: { type: "string", description: "우선 순위 (HIGH, MEDIUM, LOW)" },
    category: { type: "string", description: "할 일 종류 (TASK, MEMO, WORK, PLANNING)" },
  },
  required: ["isMemo", "content", "dueDate"],
  additionalProperties: false,
};
```

🧠 프로젝트 실행 방법
# 1️⃣ 프로젝트 클론
```
git clone https://github.com/https://github.com/stnguswnd/Chat-bot-app.git

cd Chat-bot-app
```

# 2️⃣ 패키지 설치
npm install

# 3️⃣ 환경 변수 설정 (.env 파일 생성)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key

# 4️⃣ 개발 서버 실행
`npm run dev`


Supabase의 memos 테이블이 필요합니다.
(컬럼 구조는 추후 README에 추가 예정)

배포 환경은 Vercel 기준이며, 서버리스 함수(/api/ai/generate-memo.js)를 통해 Gemini API 호출을 처리합니다.

🌱 성과 및 학습 내용

AI 응답을 Schema 기반으로 파싱해 구조화하는 경험을 쌓음

Supabase 인증 구조와 Redux 상태관리의 연동을 구현

API Key 보안 및 서버리스 아키텍처 설계 개념을 학습

⚠️ 개선 방향

Access Token 자동 갱신 기능 추가 (Refresh Token 로직 보완 예정)

Supabase Row-Level Security를 통한 사용자 데이터 격리 강화

Gemini 응답 정확도 향상을 위한 프롬프트 튜닝 계획

📫 연락처

👤 김현중 (Hyunjung Kim)
📧 stnguswnd@gmail.com

© 2025 Hyunjung Kim — All rights reserved.