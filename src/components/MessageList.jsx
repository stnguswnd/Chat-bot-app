import { useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";

export default function MessageList({ messages }) {
  // useRef 훅: document.querySelector() -> 요소를 선택
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // messages 가 변경될때마다
    // messagesEndRef가 가르키는 요소로 스크롤을 이동
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message} />
      ))}
      {/* 모든 채팅 내역의 하단에 위치하는 div */}
      <div ref={messagesEndRef}></div>
    </div>
  );
}
