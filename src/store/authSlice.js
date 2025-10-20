// 액세스 토큰 상태 관리
// 로그인, 회원가입, 로그아웃 같은 네트워크 비동기 처리

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// 로그인 요청을 보낼 인증 서버에 대한 정보
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 회원가입 비동기 처리
const signup = createAsyncThunk(
  "auth/signup",
  // 비동기 처리 함수(async)
  async (data, { rejectWithValue }) => {
    // 매개변수 data : 액션의 페이로드 역할
    // 실제로 data 변수에 저장될 데이터 => 회원가입을 위해 필요한 데이터
    try {
      // config : 요청 정보(url, method, headers, ...)
      const config = {
        url: `${SUPABASE_URL}/auth/v1/signup`,
        method: "POST",
        headers: {
          "Content-type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        data: {
          // supabase 기준
          // 회원가입을 위해 필요한 데이터(email, password)
          email: data["email"],
          password: data["password"],
        },
      };
      const response = await axios(config);
      console.log(response);
      // 비동기 처리를 성공 했을 때의 데이터
      return response["data"];
    } catch (error) {
      // 비동기 처리를 실패 했을 때의 데이터
      return rejectWithValue(error["response"]["data"]);
    }
  }
);

const login = createAsyncThunk(
  "auth/login", //이름
  //비동기 처리함수
  async (data, { rejectWithValue }) => {
    try {
      const config = {
        url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        data: {
          email: data["email"],
          password: data["password"],
        },
      };
      const response = await axios(config);
      console.log(response);
      // 비동기 처리를 성공 했을 때의 데이터
      return response["data"];
    } catch (error) {
      return rejectWithValue(error["response"]["data"]);
    }
  }
);
//로그아웃 비동기 처리
const logout = createAsyncThunk(
  "auth/logout",

  async (_, { rejectWithValue, getState }) => {
    try {
      const config = {
        url: `${SUPABASE_URL}/auth/v1/logout`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${getState().auth.token}`,
          // getState().auth.token: 전역 상태로 관리되는 사용자 인증 토큰
        },
      };
      const response = await axios(config);
      return response["data"];
    } catch (error) {
      return rejectWithValue(error["response"]["data"]);
    }
  }
);

// 비동기 처리 3개의 상태: 대기, 성공, 실패(거절)

// localStorage에서 토큰 복원
const getInitialToken = () => {
  try {
    return localStorage.getItem("authToken");
  } catch (error) {
    console.error("토큰 복원 실패:", error);
    return null;
  }
};

// 초기 상태
const initialState = {
  token: getInitialToken(), // localStorage에서 토큰 복원
  error: null, // 에러 여부 관리 상태
  isSignup: false, // 회원가입 성공 여부 관리 상태
};

// 슬라이스(리듀서 + 액션) 생성
const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    // 회원가입 성공 여부를 초기화(false)
    resetIsSignup: (state) => {
      state.isSignup = false;
    },
  },
  // 위에서 정의한 비동기 처리 함수(액션)을 처리할 리듀서
  extraReducers: (builder) => {
    // 각 비동기 처리에 대한
    // 대기(pending) / 성공(fulfilled) / 실패(reject)
    // 처리 로직
    builder
      .addCase(signup.fulfilled, (state) => {
        // signup 비동기 처리가 성공(fulfilled)일 때 실행되는
        // 콜백함수
        state.isSignup = true;
      })
      .addCase(signup.rejected, (state, action) => {
        // action.payload 어디서 왔는가?
        // return rejectWithValue(error["response"]["data"])
        state.error = action.payload;
      })
      // 로그인(login) 성공 시 토큰 저장
      .addCase(login.fulfilled, (state, action) => {
        const token = action.payload["access_token"];
        state.token = token;
        state.error = null; // 성공 시 에러 초기화
        
        // localStorage에 토큰 저장
        try {
          localStorage.setItem("authToken", token);
        } catch (error) {
          console.error("토큰 저장 실패:", error);
        }
      })
      .addCase(login.rejected, (state, action) => {
        // 로그인 실패 시 에러 저장
        state.error = action.payload;
        state.token = null;
      })
      .addCase(logout.fulfilled, (state) => {
        //로그아웃 비동기 처리가 성공한 상태
        //token 상태 초기화
        state.token = null;
        
          // localStorage에서 토큰 제거
          try {
            localStorage.removeItem("authToken");
        } catch (error) {
          console.error("토큰 제거 실패:", error);
        }
      })
      .addCase(logout.rejected, (state) => {
        // 로그아웃 API 실패해도 로컬 로그아웃 처리
        console.warn("Supabase 로그아웃 API 실패, 로컬 로그아웃 처리");
        state.token = null;
        
        // localStorage에서 토큰 제거
        try {
          localStorage.removeItem("authToken");
        } catch (error) {
          console.error("토큰 제거 실패:", error);
        }
      });
  },
});

// 액션과 리듀서, 비동기 처리 액션 내보내기
export const { resetIsSignup } = authSlice.actions;
export default authSlice.reducer;
export { signup, login, logout };
