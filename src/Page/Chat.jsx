import { useEffect, useState } from "react";
import MessageList from "../components/MessageList";
import ChatForm from "../components/ChatForm";
import { chat, config } from "../utils/genai";

export default function Chat() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem("chatMessages");
      if (stored) {
        const parsed = JSON.parse(stored);
        // 배열인지 확인하고, 배열이 아니면 빈 배열로 초기화
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (error) {
      console.error("localStorage에서 메시지 로드 실패:", error);
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  async function generateAiContent(currentPrompt) {
    try {
      const response = await chat.sendMessage({
        message: currentPrompt,
        config: config,
      });

      setMessages((prev) => [...prev, { role: "ai", content: response.text }]);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isLoading || prompt.trim() === "") return;

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
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
