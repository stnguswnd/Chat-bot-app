import React from "react";
import { Outlet, NavLink } from "react-router-dom";

export default function RootRayout() {
  const navItems = [
    { path: "/", label: "홈페이지" },
    { path: "/chat", label: "채팅" },
    { path: "/chat2", label: "supabase 연동 채팅" },
    { path: "/memo-list", label: "메모 리스트" },
    { path: "/memo-list2", label: "supabase 연동 메모 리스트" },
    { path: "/memo-list3", label: "메모 리스트3" },
    { path: "/profile", label: "프로필" },
    { path : "/signup", label: "회원가입" },
  ];

  const activeNavItemClass = "bg-blue-50 text-blue-700 border border-blue-200";

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 위쪽 네비게이션바 */}
      <nav className="bg-white border-b border-gray-200 h-16 flex-shrink-0 flex items-center px-6">
        <div className="flex flex-row gap-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `text-sm px-3 py-2 rounded-md transition-colors ${
                  isActive ? activeNavItemClass : "text-gray-600 hover:text-gray-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <div className="flex-1 flex justify-center overflow-y-auto">
        <div className="w-full max-w-6xl h-full flex flex-col p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
