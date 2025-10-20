import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// singup 액션 : 회원가입 비동기 네트워크 처리 액션
// resetIsSignup 액션: isSingup 상태 초기화(false) 액션
import { signup, resetIsSignup } from "../store/authSlice";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  // 사용자 입력 이메일 관리 상태
  const [email, setEmail] = useState("");
  // 사용자 입력 비밀번호 관리 상태
  const [password, setPassword] = useState("");
  // dispatch 함수
  const dispatch = useDispatch();
  // navigate 함수
  const navigate = useNavigate();
  // 전역 상태 isSignup 불러오기
  const isSignup = useSelector((state) => state.auth.isSignup);
  // 전역 상태 error 불러오기
  const error = useSelector((state) => state.auth.error);

  function handleSubmit(e) {
    e.preventDefault(); // form의 기본 이벤트(동작) 막기
    // 비동기 처리 액션(singup)을 디스패치(dispatch)로 실행
    dispatch(signup({ email: email, password: password }));
  }

  // 회원가입이 성공을 했을 때 알림창을 띄우고
  // 홈페이지로 이동 시키는 코드, useEffect 활용해서
  useEffect(() => {
    if (isSignup === true) {
      // 회원가입을 성공 했다면
      alert("회원가입을 성공했습니다. 메일함을 확인해주세요.");
      dispatch(resetIsSignup);

      navigate("/");
    }
  }, [isSignup, dispatch]);

  // 회원가입 폼 구조
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
        <input type="submit" className="border-2" value="회원가입" />
      </form>
    </div>
  );
}
