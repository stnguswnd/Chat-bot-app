import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import MessageList from "../components/MessageList";
import ChatForm from "../components/ChatForm";
import { chat, config } from "../utils/genai";
import { createSupabaseClient } from "../utils/supabaseClient";

export default function Chat2() {
  const token = useSelector((state) => state.auth.token);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const supabaseClient = createSupabaseClient(token);

  // ✅ JWT에서 user_id(uid) 추출하는 함수
  function getUserIdFromToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        console.error("❌ 토큰이 유효하지 않습니다:", token);
        return null;
      }

      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error("❌ JWT 형식이 올바르지 않습니다:", parts.length, "parts");
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      const userId = payload.sub; // Supabase Auth의 user id
      
      return userId;
    } catch (err) {
      console.error("❌ 토큰 파싱 실패:", err);
      console.error("토큰:", token?.substring(0, 50) + "...");
      return null;
    }
  }

  const userId = token ? getUserIdFromToken(token) : null;

  // ✅ Supabase에서 내 메시지만 불러오기
  useEffect(() => {
    if (!token || !userId) return;

    async function fetchMessages() {
      try {
        const response = await supabaseClient.get("/chat_messages", {
          params: {
            select: "*",
            user_id: `eq.${userId}`,
            order: "created_at.asc",
          },
        });
        
        // Supabase REST API 응답 구조에 맞게 수정
        const messages = response.data || [];
        setMessages(messages);
        console.log("✅ 메시지 불러오기 성공:", messages.length, "개");
      } catch (error) {
        console.error("❌ 메시지 불러오기 오류:", error);
        console.error("오류 상세:", error.response?.data || error.message);
      }
    }

    fetchMessages();
  }, [token, userId]);

  // ✅ Supabase에 메시지 저장 (중복 방지 포함)
  async function saveMessage(role, content) {
    if (!userId) {
      console.warn("❌ user_id가 없습니다. 저장 중단");
      return;
    }

    try {
      // 1️⃣ 중복 체크 (같은 유저, 같은 content)
      const { data: existingMessages } = await supabaseClient.get("/chat_messages", {
        params: {
          select: "id",
          user_id: `eq.${userId}`,
          content: `eq.${content}`,
        },
      });
      
      if (existingMessages && existingMessages.length > 0) {
        console.log("⚠️ 중복 메시지입니다. 저장하지 않음.");
        return;
      }

      // 2️⃣ 새 메시지 저장
      const response = await supabaseClient.post("/chat_messages", {
        role,
        content,
        user_id: userId,
        created_at: new Date().toISOString(),
      });
      
      console.log("✅ 메시지 저장 완료:", response.data);
    } catch (error) {
      console.error("❌ 메시지 저장 오류:", error);
      console.error("오류 상세:", error.response?.data || error.message);
    }
  }

  // ✅ AI 응답 생성
  async function generateAiContent(currentPrompt) {
    try {
      const response = await chat.sendMessage({
        message: currentPrompt,
        config,
      });

      const aiContent = response.text;

      setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
      await saveMessage("ai", aiContent);
    } catch (error) {
      console.error("AI 생성 오류:", error);
    }
  }

  // ✅ 입력 제출 처리
  async function handleSubmit(e) {
    e.preventDefault();
    if (isLoading || prompt.trim() === "") return;

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    await saveMessage("user", prompt);

    const currentPrompt = prompt;
    setPrompt("");
    setIsLoading(true);
    await generateAiContent(currentPrompt);
    setIsLoading(false);
  }

  return (
    <>
      <MessageList messages={messages} />
      <ChatForm
        prompt={prompt}
        setPrompt={setPrompt}
        isLoading={isLoading}
        onSubmit={handleSubmit}
      />
    </>
  );
}
