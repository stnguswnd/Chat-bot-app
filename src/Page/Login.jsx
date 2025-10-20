import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// singup 액션 : 회원가입 비동기 네트워크 처리 액션
// resetIsSignup 액션: isSingup 상태 초기화(false) 액션
import { login } from "../store/authSlice";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  // 사용자 입력 비밀번호 관리 상태
  const [password, setPassword] = useState("");
  // dispatch 함수
  const dispatch = useDispatch();
  // navigate 함수
  const navigate = useNavigate();
  // 전역 상태 token 불러오기
  const token = useSelector((state) => state.auth.token);
  // 전역 상태 error 불러오기
  const error = useSelector((state) => state.auth.error);

  useEffect(() => {
    if (token) {
      alert("로그인 상태입니다");
      console.log(token);
      //navigate("/profile");
    }
  }, [token]);

  function handleSubmit(e) {
    e.preventDefault();
    dispatch(login({ email: email, password: password }));
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          handleSubmit(e);
        }}
      >
        <input
          type="email"
          value={email}
          className="border-2"
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
        <input
          type="password"
          className="border-2"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        <input type="submit" className="border-2" value="로그인" />
      </form>
    </div>
  );
}
