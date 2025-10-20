import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function PrivateLayout() {
  const token = useSelector((state) => state.auth.token);

  //토큰이 없으면 즉, 로그인을 안했으면
  if (!token) {
    //로그인 경로로 이동
    return <Navigate to="/login"></Navigate>;
  } else {
    //중첩된 자식 컴포넌트 렌더링
    return <Outlet></Outlet>;
  }
}
