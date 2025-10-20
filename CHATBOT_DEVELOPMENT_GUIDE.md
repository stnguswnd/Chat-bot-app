# 챗봇 앱 개발 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [Redux 설정](#redux-설정)
3. [라우팅 구조 변경](#라우팅-구조-변경)
4. [인증 시스템 구현](#인증-시스템-구현)
5. [메모 저장 기능](#메모-저장-기능)
6. [새로고침 시 로그인 유지](#새로고침-시-로그인-유지)

---

## 🎯 프로젝트 개요

이 프로젝트는 React + Redux + React Router를 사용한 챗봇 애플리케이션입니다.

### 주요 기능
- **채팅**: 일반 채팅과 스트리밍 채팅
- **메모 관리**: AI가 생성한 메모를 저장하고 관리
- **인증 시스템**: 로그인/로그아웃 기능
- **상태 관리**: Redux를 통한 전역 상태 관리

---

## 🔧 Redux 설정

### 1. 패키지 설치
```bash
npm install react-redux @reduxjs/toolkit
```

### 2. Redux Store 설정 (`src/store/index.js`)
```javascript
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,  // 인증 관련 상태 관리
  },
});
```

**설명**: 
- `configureStore`: Redux store를 쉽게 설정할 수 있는 함수
- `authReducer`: 로그인/로그아웃 상태를 관리하는 리듀서

### 3. main.jsx에 Provider 추가
```javascript
import { Provider } from "react-redux";
import { store } from "./store";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>  {/* 앱 전체를 Redux store로 감싸기 */}
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>
);
```

**설명**: 
- `Provider`: React 컴포넌트에서 Redux store에 접근할 수 있게 해주는 컴포넌트
- 모든 컴포넌트에서 `useSelector`로 상태에 접근 가능

---

## 🛣️ 라우팅 구조 변경

### 변경 전 문제점
- 모든 페이지에 인증이 필요했음
- 홈페이지도 로그인 없이 접근 불가

### 변경 후 구조
```
RootRayout (네비게이션 바)
├── Home (Public) - 인증 불필요
├── Login (Public) - 인증 불필요
└── PrivateLayout (토큰 확인)
    ├── Chat - 인증 필요
    ├── StreamChat - 인증 필요
    ├── MemoList - 인증 필요
    └── CreateContent - 인증 필요
```

### 1. RootRayout.jsx 수정
```javascript
// 인증 로직 제거 - 단순한 레이아웃만 제공
export default function RootRayout() {
  const navItems = [
    { path: "/", label: "홈페이지" },
    { path: "/chat", label: "채팅" },
    { path: "/stream-chat", label: "스트림 채팅" },
    { path: "/memo-list", label: "메모 리스트" },
    { path: "/create-content", label: "콘텐츠 생성" },
    { path: "/profile", label: "프로필" },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 네비게이션 바 */}
      <nav>...</nav>
      
      {/* 자식 컴포넌트들이 렌더링되는 곳 */}
      <div className="flex-1 flex justify-center overflow-y-auto">
        <div className="w-full max-w-6xl h-full flex flex-col p-6">
          <Outlet />  {/* 여기서 자식 컴포넌트들이 렌더링됨 */}
        </div>
      </div>
    </div>
  );
}
```

### 2. router/index.js 수정
```javascript
const router = createBrowserRouter([
  {
    path: "/",
    Component: RootRayout,
    children: [
      // Public Routes (인증 불필요)
      { path: "/", Component: Home },
      { path: "/login", Component: Login },
      
      // Private Routes (인증 필요)
      {
        path: "/",
        Component: PrivateLayout,  // 토큰 확인
        children: [
          { path: "/chat", Component: Chat },
          { path: "/stream-chat", Component: StreamChat },
          { path: "/memo-list", Component: MemoList },
          { path: "/create-content", Component: CreateContent },
        ],
      },
    ],
  },
]);
```

**설명**:
- **Public Routes**: 누구나 접근 가능 (홈페이지, 로그인)
- **Private Routes**: 로그인한 사용자만 접근 가능
- `PrivateLayout`이 토큰을 확인하고 인증되지 않은 사용자는 로그인 페이지로 리다이렉트

---

## 🔐 인증 시스템 구현

### 1. authSlice.js - Redux 상태 관리
```javascript
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// 로그인 비동기 처리
const login = createAsyncThunk(
  "auth/login",
  async (data, { rejectWithValue }) => {
    try {
      const response = await axios({
        url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        data: {
          email: data.email,
          password: data.password,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// 초기 상태
const initialState = {
  token: null,
  error: null,
  isSignup: false,
};

// 슬라이스 생성
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    resetIsSignup: (state) => {
      state.isSignup = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // 로그인 성공
      .addCase(login.fulfilled, (state, action) => {
        state.token = action.payload.access_token;
        state.error = null;
      })
      // 로그인 실패
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload;
        state.token = null;
      });
  },
});
```

**설명**:
- `createAsyncThunk`: 비동기 작업(API 호출)을 처리하는 Redux 함수
- `fulfilled`: 성공 시 실행되는 리듀서
- `rejected`: 실패 시 실행되는 리듀서

### 2. PrivateLayout.jsx - 인증 확인
```javascript
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function PrivateLayout() {
  const token = useSelector((state) => state.auth.token);

  if (!token) {
    return <Navigate to="/login" replace />;  // 로그인 페이지로 리다이렉트
  } else {
    return <Outlet />;  // 자식 컴포넌트 렌더링
  }
}
```

**설명**:
- `useSelector`: Redux store에서 상태를 가져오는 Hook
- 토큰이 없으면 로그인 페이지로 리다이렉트
- 토큰이 있으면 보호된 페이지들을 렌더링

### 3. Login.jsx - 로그인 폼
```javascript
import { useDispatch, useSelector } from "react-redux";
import { login } from "../store/authSlice";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  function handleSubmit(e) {
    e.preventDefault();
    dispatch(login({ email, password }));  // 로그인 액션 디스패치
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <input type="submit" value="로그인" />
    </form>
  );
}
```

**설명**:
- `useDispatch`: Redux 액션을 실행하는 Hook
- `dispatch(login({ email, password }))`: 로그인 액션 실행

---

## 📝 메모 저장 기능

### 1. StreamChat.jsx - 메모 저장 로직
```javascript
// 메모 저장 함수
function saveMemoToLocalStorage(memoData) {
  try {
    const existingMemos = JSON.parse(localStorage.getItem("memos") || "[]");
    
    const newMemo = {
      id: Date.now().toString(),
      title: memoData.content,
      content: memoData.content,
      dueDate: memoData.dueDate || null,
      isCompleted: false,
      createdAt: new Date().toISOString().split("T")[0],
    };
    
    const updatedMemos = [...existingMemos, newMemo];
    localStorage.setItem("memos", JSON.stringify(updatedMemos));
    
    return true;
  } catch (error) {
    console.error("메모 저장 중 오류:", error);
    return false;
  }
}

// AI 응답 처리
async function generateAiContent(currentPrompt) {
  // ... 스트리밍 처리 ...
  
  // 스트림 완료 후 JSON 파싱 및 메모 저장
  try {
    const aiResponse = JSON.parse(accumulatedResponse);
    
    if (aiResponse.isMemo && aiResponse.content) {
      const saved = saveMemoToLocalStorage(aiResponse);
      if (saved) {
        setMessages((prev) => [
          ...prev,
          { 
            role: "system", 
            content: "✅ 메모가 저장되었습니다! 메모 목록에서 확인할 수 있습니다." 
          }
        ]);
      }
    }
  } catch (parseError) {
    console.log("AI 응답이 JSON 형식이 아닙니다:", parseError);
  }
}
```

### 2. MemoList.jsx - 메모 불러오기
```javascript
// chatMessages에서 메모 추출
function extractMemosFromChat(chatMessages) {
  const memos = [];
  
  chatMessages.forEach((message, index) => {
    if (message.role === "ai" && message.content) {
      try {
        const aiResponse = JSON.parse(message.content);
        
        if (aiResponse.isMemo && aiResponse.content) {
          const memo = {
            id: `chat-${index}-${Date.now()}`,
            title: aiResponse.content,
            content: aiResponse.content,
            dueDate: aiResponse.dueDate || null,
            isCompleted: false,
            createdAt: new Date().toISOString().split("T")[0],
          };
          memos.push(memo);
        }
      } catch (parseError) {
        console.log("AI 응답이 JSON 형식이 아닙니다:", parseError);
      }
    }
  });
  
  return memos;
}

// 컴포넌트에서 사용
useEffect(() => {
  const stored = localStorage.getItem("chatMessages");
  if (stored) {
    const chatMessages = JSON.parse(stored);
    const extractedMemos = extractMemosFromChat(chatMessages);
    setMemos(extractedMemos);
  }
}, []);
```

**설명**:
- AI 응답에서 JSON을 파싱하여 메모 데이터 추출
- `isMemo: true`인 응답만 메모로 저장
- localStorage에 메모 데이터 저장

---

## 🔄 새로고침 시 로그인 유지

### 문제점
- 새로고침하면 Redux store가 초기화되어 로그인 상태가 사라짐
- 매번 다시 로그인해야 함

### 해결 방법: localStorage 활용

### 1. 토큰 복원 기능
```javascript
// localStorage에서 토큰 복원
const getInitialToken = () => {
  try {
    return localStorage.getItem("authToken");
  } catch (error) {
    console.error("토큰 복원 실패:", error);
    return null;
  }
};

// 초기 상태에서 토큰 복원
const initialState = {
  token: getInitialToken(),  // 앱 시작 시 localStorage에서 토큰 복원
  error: null,
  isSignup: false,
};
```

### 2. 로그인 성공 시 토큰 저장
```javascript
.addCase(login.fulfilled, (state, action) => {
  const token = action.payload["access_token"];
  state.token = token;
  state.error = null;
  
  // localStorage에 토큰 저장
  try {
    localStorage.setItem("authToken", token);
  } catch (error) {
    console.error("토큰 저장 실패:", error);
  }
})
```

### 3. 로그아웃 시 토큰 제거
```javascript
.addCase(logout.fulfilled, (state) => {
  state.token = null;
  
  // localStorage에서 토큰 제거
  try {
    localStorage.removeItem("authToken");
  } catch (error) {
    console.error("토큰 제거 실패:", error);
  }
})
```

### 동작 흐름
1. **앱 시작**: localStorage에서 토큰 복원
2. **로그인 성공**: Redux store + localStorage에 토큰 저장
3. **새로고침**: localStorage에서 토큰 자동 복원
4. **로그아웃**: Redux store + localStorage에서 토큰 제거

---

## 🎯 핵심 개념 정리

### Redux란?
- **상태 관리 라이브러리**: 앱 전체의 상태를 중앙에서 관리
- **예측 가능한 상태 변화**: 액션 → 리듀서 → 상태 변경
- **디버깅 용이**: Redux DevTools로 상태 변화 추적 가능

### React Router란?
- **클라이언트 사이드 라우팅**: 페이지 새로고침 없이 URL 변경
- **중첩 라우팅**: 부모-자식 관계의 라우트 구조
- **보호된 라우트**: 인증이 필요한 페이지 접근 제어

### localStorage란?
- **브라우저 저장소**: 새로고침해도 데이터 유지
- **문자열만 저장**: JSON.stringify/parse로 객체 저장
- **도메인별 독립**: 다른 사이트와 데이터 공유 안됨

---

## 🚀 다음 단계

1. **에러 처리 개선**: 네트워크 오류, 인증 실패 등
2. **로딩 상태**: API 호출 중 로딩 스피너 표시
3. **토큰 만료 처리**: 자동 로그아웃 기능
4. **사용자 경험 개선**: 알림, 모달 등

이 가이드를 통해 React + Redux + React Router를 사용한 인증 시스템을 이해할 수 있습니다! 🎉
