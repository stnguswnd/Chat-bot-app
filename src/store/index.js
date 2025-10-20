import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

// Redux Persist 모듈 불러오기
import { persistStore, persistReducer } from "redux-persist";
// 로컬 스토리지 불러오기
import storage from "redux-persist/lib/storage";

// Persist 리듀서 설정
const persistConfig = {
  key: "auth", // 스토리지 키(Key) 이름
  storage, // 로컬 스토리지
  whitelist: ["token"], // 스토리지에 저장할 전역 상태(State) 배열
};

// Persist 리듀서 생성
const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
  },
});

// Persist 스토어 생성
export const persistor = persistStore(store);
