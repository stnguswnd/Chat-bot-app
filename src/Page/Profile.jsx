import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../store/authSlice'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const token = useSelector((state) => state.auth.token)
  const error = useSelector((state) => state.auth.error)

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      // 1. Redux logout 액션 실행 (API 호출 시도)
      const result = await dispatch(logout())
      
      // 2. API 호출이 실패해도 로컬 로그아웃 처리
      if (result.type.endsWith('/rejected')) {
        console.warn('Supabase 로그아웃 API 실패, 로컬 로그아웃 처리')
      }
      
      // 3. 강제로 로컬 상태 초기화
      localStorage.removeItem('authToken')
      
      // 4. 로그인 페이지로 이동
      navigate('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // 오류가 발생해도 로컬 로그아웃 처리
      localStorage.removeItem('authToken')
      navigate('/login')
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">👤 프로필</h2>
      <p className="mb-4">로그인 없이는 못들어오는 페이지</p>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          오류: {error.message || '알 수 없는 오류가 발생했습니다.'}
        </div>
      )}
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">현재 상태</h3>
          <p>토큰: {token ? '✅ 로그인됨' : '❌ 로그인 안됨'}</p>
        </div>
        
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
