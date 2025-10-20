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
  const [pendingMemo, setPendingMemo] = useState(null); // ✅ AI 응답에서 파싱된 메모 미리보기

  const supabaseClient = createSupabaseClient(token);

  // ✅ JWT에서 user_id(uid) 추출하는 함수 (base64url 안전)
  function getUserIdFromToken(token) {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64url = parts[1];
      const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const json = atob(padded);
      const payload = JSON.parse(json);
      return payload?.sub || null;
    } catch (err) {
      console.error('❌ 토큰 파싱 실패:', err);
      return null;
    }
  }

  const userId = token ? getUserIdFromToken(token) : null;

  // ✅ AI 텍스트에서 메모 객체 파싱 (코드블럭/본문 모두 지원, 단일 메모 우선)
  function parseMemoFromAiText(text) {
    try {
      if (typeof text !== 'string') return null;

      // 코드블럭 우선 추출
      const fence = /```(?:json)?\n([\s\S]*?)```/gi;
      let m;
      const candidates = [];
      while ((m = fence.exec(text)) !== null) {
        candidates.push(m[1]);
      }
      candidates.push(text);

      for (const cand of candidates) {
        // 전체 JSON 먼저 시도
        try {
          const parsed = JSON.parse(cand);
          if (Array.isArray(parsed)) {
            const obj = parsed.find((o) => o && typeof o === 'object' && o.isMemo === true);
            if (obj) return normalizeMemoShape(obj);
          } else if (parsed && typeof parsed === 'object' && parsed.isMemo === true) {
            return normalizeMemoShape(parsed);
          }
        } catch {}

        // 객체 덩어리 스캔
        try {
          const objRe = /\{[\s\S]*?\}/g;
          let om;
          while ((om = objRe.exec(cand)) !== null) {
            try {
              const obj = JSON.parse(om[0]);
              if (obj && typeof obj === 'object' && obj.isMemo === true) {
                return normalizeMemoShape(obj);
              }
            } catch {}
          }
        } catch {}
      }
    } catch {}
    return null;
  }

  function normalizeMemoShape(obj) {
    return {
      content: obj.content || obj.title || '',
      dueDate: obj.dueDate || null,
      priority: obj.priority || 'MEDIUM',
      category: obj.category || 'GENERAL',
    };
  }

  // ✅ Supabase: memos 저장
  async function saveMemoToSupabase(memo) {
    if (!userId) {
      console.warn('❌ user_id가 없어 memos 저장 불가');
      return null;
    }
    try {
      // 카테고리 매핑 (DB enum 호환)
      const mapCategory = (cat) => {
        const m = {
          TASK: 'WORK',
          MEMO: 'GENERAL',
          WORK: 'WORK',
          PLANNING: 'PLANNING',
          HOBBY: 'HOBBY',
          USER: 'USER',
          GENERAL: 'GENERAL',
        };
        return m[cat] || 'GENERAL';
      };

      // 중복 체크: 같은 user_id, 같은 content, 같은 created_at (일별 동일 방지)
      const createdAt = new Date().toISOString();
      const { data: existing } = await supabaseClient.get('/memos', {
        params: {
          select: 'id',
          user_id: `eq.${userId}`,
          content: `eq.${memo.content}`,
        },
      });
      if (existing && existing.length > 0) {
        console.log('⚠️ 이미 존재하는 메모로 판단, 저장 생략');
        return existing[0];
      }

      const insert = {
        user_id: userId,
        title: memo.content,
        content: memo.content,
        due_date: memo.dueDate || null,
        priority: memo.priority || 'MEDIUM',
        category: mapCategory(memo.category),
        is_completed: false,
        created_at: createdAt,
      };
      console.log('📦 memos 저장 요청:', insert);
      const res = await supabaseClient.post('/memos', insert);
      console.log('✅ memos 저장 응답:', res?.status, res?.data);
      return res?.data?.[0] || null;
    } catch (e) {
      console.error('❌ memos 저장 오류:', e);
      console.error('오류 상세:', e?.response?.data || e?.message);
      return null;
    }
  }

  // ✅ Yes 클릭 시 Supabase memos에 저장
  async function confirmSaveMemo() {
    if (!pendingMemo || !pendingMemo.content) {
      setPendingMemo(null);
      return;
    }
    const saved = await saveMemoToSupabase(pendingMemo);
    if (saved) {
      console.log('✅ memos 저장 성공:', saved?.id);
    }
    setPendingMemo(null);
  }

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

      // 1) 메시지로 표시
      setMessages((prev) => [...prev, { role: "ai", content: aiContent }]);
      await saveMessage("ai", aiContent);

      // 2) 메모 객체 파싱 시도 → UI 미리보기용 상태 설정
      const parsed = parseMemoFromAiText(aiContent);
      setPendingMemo(parsed);
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
      {/* ✅ 메모 미리보기 및 확인 UI */}
      {pendingMemo && (
        <div className="mx-4 mb-4 p-4 border rounded-lg bg-purple-50">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg">📝 생성될 메모 미리보기</h3>
              <p className="mt-2"><span className="font-medium">내용:</span> {pendingMemo.content}</p>
              <p className="text-sm text-gray-600 mt-1">마감일: {pendingMemo.dueDate || "없음"} / 우선순위: {pendingMemo.priority} / 카테고리: {pendingMemo.category}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="px-3 py-1 rounded-md bg-green-600 text-white"
              onClick={confirmSaveMemo}
            >
              예 (저장)
            </button>
            <button
              className="px-3 py-1 rounded-md border"
              onClick={() => setPendingMemo(null)}
            >
              아니오
            </button>
          </div>
        </div>
      )}
      <ChatForm
        prompt={prompt}
        setPrompt={setPrompt}
        isLoading={isLoading}
        onSubmit={handleSubmit}
      />
    </>
  );
}
