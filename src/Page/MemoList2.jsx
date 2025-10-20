import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { createSupabaseClient } from "../utils/supabaseClient";

export default function MemoListSupabase2() {
  const token = useSelector((state) => state.auth.token);
  const [memos, setMemos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [newText, setNewText] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newCategory, setNewCategory] = useState("GENERAL");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const supabaseClient = createSupabaseClient(token);

  // ✅ JWT에서 user_id 추출
  function getUserIdFromToken(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      console.log("🔍 JWT 페이로드:", payload);
      console.log("👤 추출된 user_id:", payload.sub);
      return payload.sub;
    } catch (err) {
      console.error("토큰 파싱 실패:", err);
      return null;
    }
  }

  const userId = token ? getUserIdFromToken(token) : null;

  // ✅ 삭제된 메모 키 관리 함수들
  function getDeletedMemoKeys() {
    try {
      const stored = localStorage.getItem("deleted_memo_keys");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error("삭제된 메모 키 로딩 오류:", error);
      return new Set();
    }
  }

  function saveDeletedMemoKeys(deletedKeys) {
    try {
      localStorage.setItem("deleted_memo_keys", JSON.stringify([...deletedKeys]));
    } catch (error) {
      console.error("삭제된 메모 키 저장 오류:", error);
    }
  }

  // ✅ AI 응답에서 메모 추출하는 함수
  function extractMemosFromChatMessages(chatMessages) {
    const memos = [];
    const seen = new Set(); // content+created_at 키로 자체 중복 제거
    
    chatMessages.forEach((message, index) => {
      if (message.role === "ai" && message.content) {
        try {
          const aiResponse = JSON.parse(message.content);
          if (aiResponse.isMemo === true) {
            const mapCategory = (aiCategory) => {
              const categoryMap = {
                'TASK': 'WORK',
                'MEMO': 'GENERAL', 
                'WORK': 'WORK',
                'PLANNING': 'PLANNING',
                'HOBBY': 'HOBBY',
                'USER': 'USER',
                'GENERAL': 'GENERAL'
              };
              return categoryMap[aiCategory] || 'GENERAL';
            };

            const createdAt = message.created_at || (message.createdAt ? message.createdAt : null);
            const key = `${aiResponse.content}__${(createdAt || '').slice(0,19)}`;
            if (seen.has(key)) return;
            seen.add(key);

            memos.push({
              id: `chat-${message.id || index}`,
              title: aiResponse.content,
              content: aiResponse.content,
              due_date: aiResponse.dueDate || null,
              priority: aiResponse.priority || "MEDIUM",
              category: mapCategory(aiResponse.category) || "GENERAL",
              is_completed: false,
              created_at: createdAt,
              source: "chat_message",
              chat_message_id: message.id
            });
          }
        } catch (error) {
          console.log("JSON 파싱 실패 (정상):", String(message.content).substring(0, 50));
        }
      }
    });
    
    return memos;
  }

  // ✅ 자동 동기화: 채팅 메시지 → memos 테이블 저장 후 목록 불러오기 (중복 방지)
  const syncGuardRef = useRef({ running: false, lastKey: null });

  useEffect(() => {
    console.log("🔍 useEffect 실행 - token:", !!token, "userId:", userId);
    if (!token || !userId) {
      console.log("❌ 토큰 또는 userId가 없어서 메모를 불러올 수 없습니다.");
      console.log("token:", token ? "존재" : "없음");
      console.log("userId:", userId);
      return;
    }

    async function syncMemosFromChat() {
      try {
        const guardKey = `${userId}:${token?.slice(-8) || ''}`;
        if (syncGuardRef.current.running && syncGuardRef.current.lastKey === guardKey) {
          console.log("⏭️ 동기화 중복 실행 방지");
          return;
        }
        syncGuardRef.current.running = true;
        syncGuardRef.current.lastKey = guardKey;

        // 개발 환경 StrictMode에서 2회 호출 방지용 소프트 락 (3초)
        const now = Date.now();
        const last = Number(localStorage.getItem("memo_sync_last_ts") || 0);
        if (now - last < 3000) {
          console.log("⏭️ 최근 동기화로 인해 스킵");
          syncGuardRef.current.running = false;
          return;
        }
        localStorage.setItem("memo_sync_last_ts", String(now));

        console.log("🚀 채팅→메모 자동 동기화 시작...");
        console.log("🔧 supabaseClient:", !!supabaseClient);

        // 1) 채팅 메시지 불러오기
        console.log("📡 채팅 메시지 조회 시작...");
        const chatResponse = await supabaseClient.get("/chat_messages", {
          params: {
            select: "*",
            user_id: `eq.${userId}`,
            role: `eq.ai`,
            order: "created_at.asc", // 오래된 것부터 처리해 중복 판정 안정화
          },
        });

        const chatMessages = Array.isArray(chatResponse.data) ? chatResponse.data : [];
        let extractedMemos = extractMemosFromChatMessages(chatMessages);

        // 삭제된 키는 스킵 (content+created_at 기반 키)
        const deletedKeys = getDeletedMemoKeys();
        extractedMemos = extractedMemos.filter((m) => {
          const key = `${m.content}__${(m.created_at || "").slice(0,19)}`;
          return !deletedKeys.has(key);
        });

        // 2) 기존 memos 로드하여 중복 판단 세트 구성 (content+created_at)
        const existingRes = await supabaseClient.get("/memos", {
          params: {
            select: "id, content, created_at",
            user_id: `eq.${userId}`,
          },
        });
        const existing = Array.isArray(existingRes.data) ? existingRes.data : [];
        const existingKeySet = new Set(
          existing.map((m) => `${m.content}__${m.created_at?.slice(0,19)}`)
        );

        // 3) 신규만 일괄 저장
        for (const memo of extractedMemos) {
          const createdKey = `${memo.content}__${(memo.created_at || "").slice(0,19)}`;
          if (existingKeySet.has(createdKey)) continue;
          await saveChatMemoToDatabase(memo);
          existingKeySet.add(createdKey);
        }

        // 4) 최신 목록 불러오기
        const memosResponse = await supabaseClient.get("/memos", {
          params: {
            select: "*",
            user_id: `eq.${userId}`,
            order: "created_at.desc",
          },
        });
        setMemos(memosResponse.data || []);
        console.log("✅ 자동 동기화 완료");
      } catch (error) {
        console.error("❌ 자동 동기화 오류:", error);
        console.error("❌ 오류 상세:", error.response?.data);
      } finally {
        syncGuardRef.current.running = false;
      }
    }

    syncMemosFromChat();
  }, [token, userId]);

  // ✅ 채팅 메시지에서 메모 자동 저장 (별도 함수로 분리)
  async function saveChatMemosFromMessages() {
    if (!token || !userId) return;
    
    try {
      console.log("🚀 채팅 메시지에서 메모 자동 저장 시작...");
      
      // 1. 채팅 메시지 불러오기
      const chatResponse = await supabaseClient.get("/chat_messages", {
        params: {
          select: "*",
          user_id: `eq.${userId}`,
          role: `eq.ai`,
          order: "created_at.desc",
        },
      });
      
      console.log("💬 채팅 메시지:", chatResponse.data?.length || 0, "개");
      
      // 2. AI 응답에서 메모 추출
      const extractedMemos = extractMemosFromChatMessages(chatResponse.data || []);
      console.log("📝 추출된 메모:", extractedMemos.length, "개");
      
      // 3. 추출된 메모들을 자동으로 memos 테이블에 저장 (중복 체크 포함)
      for (const chatMemo of extractedMemos) {
        await saveChatMemoToDatabase(chatMemo);
      }
      
      // 4. 저장 후 메모 목록 새로고침
      const memosResponse = await supabaseClient.get("/memos", {
        params: {
          select: "*",
          user_id: `eq.${userId}`,
          order: "created_at.desc",
        },
      });
      
      setMemos(memosResponse.data || []);
      console.log("✅ 채팅 메모 자동 저장 완료");
      
    } catch (error) {
      console.error("❌ 채팅 메모 자동 저장 오류:", error);
    }
  }

  // ✅ 채팅 메모를 memos 테이블에 저장 (중복 방지 강화)
  async function saveChatMemoToDatabase(chatMemo) {
    if (!userId) return;
    
    try {
      // 중복 체크 (content + created_at)
      const params = {
        select: "id, content, created_at",
        user_id: `eq.${userId}`,
        content: `eq.${chatMemo.content}`,
      };
      if (chatMemo.created_at) {
        params.created_at = `eq.${chatMemo.created_at}`;
      }
      const checkResponse = await supabaseClient.get("/memos", { params });
      
      if (checkResponse.data && checkResponse.data.length > 0) {
        console.log("⚠️ 이미 저장된 메모입니다:", chatMemo.content);
        return;
      }

      // AI 응답의 category를 Supabase에서 허용하는 값으로 매핑
      const mapCategory = (aiCategory) => {
        const categoryMap = {
          'TASK': 'WORK',
          'MEMO': 'GENERAL', 
          'WORK': 'WORK',
          'PLANNING': 'PLANNING',
          'HOBBY': 'HOBBY',
          'USER': 'USER',
          'GENERAL': 'GENERAL'
        };
        return categoryMap[aiCategory] || 'GENERAL';
      };

      const insertData = {
        user_id: userId,
        title: chatMemo.content,
        content: chatMemo.content,
        due_date: chatMemo.due_date,
        priority: chatMemo.priority || "MEDIUM",
        category: mapCategory(chatMemo.category) || "GENERAL",
        is_completed: false,
        created_at: chatMemo.created_at,
      };
      
      const response = await supabaseClient.post("/memos", insertData);
      console.log("✅ 채팅 메모를 DB에 저장 완료:", response.data);
      return response.data[0];
    } catch (err) {
      console.error("채팅 메모 저장 오류:", err);
      console.error("오류 상세:", err.response?.data);
    }
  }

  // ✅ 새 메모 추가 (중복 방지 포함)
  async function addMemo() {
    if (!userId || newText.trim() === "") return;

    try {
      // 중복 체크: 같은 user_id, 같은 content
      const checkResponse = await supabaseClient.get("/memos", {
        params: {
          select: "id",
          user_id: `eq.${userId}`,
          content: `eq.${newText}`,
        },
      });
      
      if (checkResponse.data && checkResponse.data.length > 0) {
        console.log("⚠️ 중복 메모이므로 추가하지 않음.");
        return;
      }

      const insertData = {
        user_id: userId,
          title: newText,
          content: newText,
        due_date: newDueDate || null,
          priority: newPriority,
          category: newCategory,
        is_completed: false,
          created_at: new Date().toISOString(),
      };
      
      const response = await supabaseClient.post("/memos", insertData);
      console.log("✅ 메모 추가 완료:", response.data);
      setNewText("");
      setNewDueDate("");
      setNewPriority("MEDIUM");
      setNewCategory("GENERAL");
      setMemos((prev) => [response.data[0], ...prev]);
    } catch (err) {
      console.error("메모 추가 오류:", err);
      console.error("오류 상세:", err.response?.data);
    }
  }

  // ✅ 완료 상태 토글 (올바른 Supabase API 방식)
  async function toggleComplete(id, current) {
    if (!userId) {
      console.error("❌ 사용자 ID가 없어서 상태를 변경할 수 없습니다.");
      return;
    }
    
    try {
      console.log("🔄 완료 상태 변경:", id, "사용자:", userId);
      await supabaseClient.patch(`/memos?id=eq.${id}&user_id=eq.${userId}`, {
        is_completed: !current,
      });
      setMemos((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, is_completed: !m.is_completed } : m
        )
      );
    } catch (err) {
      console.error("❌ 완료 상태 변경 오류:", err);
      console.error("❌ 오류 상세:", err.response?.data);
    }
  }

  // ✅ 수정 저장 (올바른 Supabase API 방식)
  async function saveEdit(id) {
    if (editText.trim() === "") return;
    if (!userId) {
      console.error("❌ 사용자 ID가 없어서 수정할 수 없습니다.");
      return;
    }
    
    try {
      console.log("✏️ 메모 수정:", id, "사용자:", userId);
      await supabaseClient.patch(`/memos?id=eq.${id}&user_id=eq.${userId}`, {
        title: editText,
        content: editText,
      });
      setMemos((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, title: editText, content: editText } : m
        )
      );
      setEditId(null);
      setEditText("");
    } catch (err) {
      console.error("❌ 수정 오류:", err);
      console.error("❌ 오류 상세:", err.response?.data);
    }
  }

  // ✅ 삭제 (올바른 Supabase API 방식)
  async function deleteMemo(id) {
    if (!userId) {
      console.error("❌ 사용자 ID가 없어서 삭제할 수 없습니다.");
      return;
    }
    
    try {
      console.log("🗑️ 메모 삭제 시작:", id, "사용자:", userId);
      // 삭제 전에 대상 메모 정보 확보 (chat_messages 동시 삭제와 tombstone 저장을 위해)
      let targetMemoForDeletion = null;
      setMemos((prev) => {
        targetMemoForDeletion = prev.find((m) => m.id === id) || null;
        return prev;
      });

      // 1) memos 테이블에서 삭제
      await supabaseClient.delete(`/memos?id=eq.${id}&user_id=eq.${userId}`);
      console.log("✅ 메모 삭제 완료:", id);

      // 2) 관련 chat_messages 함께 삭제 시도 (content + created_at 기준, role=ai)
      try {
        if (targetMemoForDeletion) {
          const content = targetMemoForDeletion.content;
          const createdAt = targetMemoForDeletion.created_at;
          let chatDeletePath = `/chat_messages?user_id=eq.${userId}&role=eq.ai`;
          if (content) {
            chatDeletePath += `&content=eq.${encodeURIComponent(content)}`;
          }
          if (createdAt) {
            chatDeletePath += `&created_at=eq.${createdAt}`;
          }
          await supabaseClient.delete(chatDeletePath);
          console.log("🗑️ 관련 chat_messages 삭제 시도 성공");
        }
      } catch (chatErr) {
        console.warn("⚠️ chat_messages 삭제 중 오류(무시 가능):", chatErr?.response?.data || chatErr?.message);
      }

      // 3) tombstone 저장: 채팅에서 동일 메모가 다시 생성되는 것을 방지
      setMemos((prev) => {
        const target = targetMemoForDeletion || prev.find((m) => m.id === id);
        if (target) {
          const key = `${target.content}__${(target.created_at || "").slice(0,19)}`;
          const deleted = getDeletedMemoKeys();
          deleted.add(key);
          saveDeletedMemoKeys(deleted);
        }
        return prev.filter((m) => m.id !== id);
      });
    } catch (err) {
      console.error("❌ 삭제 오류:", err);
      console.error("❌ 오류 상세:", err.response?.data);
    }
  }

  // ✅ 필터링
  const filteredMemos = memos.filter((m) => {
    if (filter === "completed" && !m.is_completed) return false;
    if (filter === "incomplete" && m.is_completed) return false;
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
    return true;
  });

  // ✅ 정렬
  const sortedMemos = [...filteredMemos].sort((a, b) => {
    if (sortBy === "dueDate") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // ✅ 우선순위 색상
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH":
        return "text-red-600 font-bold";
      case "MEDIUM":
        return "text-yellow-600 font-semibold";
      case "LOW":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  // ✅ 카테고리 배경색
  const getCategoryBg = (category) => {
    switch (category) {
      case "WORK":
        return "bg-blue-50";
      case "PLANNING":
        return "bg-purple-50";
      case "HOBBY":
        return "bg-green-50";
      case "USER":
        return "bg-yellow-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📝 Supabase 메모 관리</h2>
      
      {/* 자동 동기화로 전환됨 */}

      {/* 새 메모 입력 */}
      <div className="flex flex-col md:flex-row gap-2 mb-6">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="할 일을 입력하세요..."
          className="border rounded-md px-3 py-2 flex-1"
        />
        <input
          type="text"
          value={newDueDate}
          onChange={(e) => setNewDueDate(e.target.value)}
          placeholder="마감일 (예: 2025-10-31)"
          className="border rounded-md px-3 py-2 w-44"
        />
        
        {/* 우선순위 선택 */}
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          className="border rounded-md px-2 py-2 w-32"
        >
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        {/* 카테고리 선택 */}
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="border rounded-md px-2 py-2 w-40"
        >
          <option value="PLANNING">PLANNING</option>
          <option value="WORK">WORK</option>
          <option value="HOBBY">HOBBY</option>
          <option value="USER">USER</option>
          <option value="GENERAL">GENERAL</option>
        </select>

        <button
          onClick={addMemo}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          추가
        </button>
      </div>

      {/* 필터 및 정렬 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-md border ${
            filter === "all" ? "bg-blue-200" : ""
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter("incomplete")}
          className={`px-3 py-1 rounded-md border ${
            filter === "incomplete" ? "bg-yellow-200" : ""
          }`}
        >
          미완료
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-3 py-1 rounded-md border ${
            filter === "completed" ? "bg-green-200" : ""
          }`}
        >
          완료
        </button>

        <select
          onChange={(e) => setSortBy(e.target.value)}
          value={sortBy}
          className="border rounded-md px-2"
        >
          <option value="createdAt">작성일순</option>
          <option value="dueDate">마감일순</option>
        </select>

        {/* 카테고리 필터 */}
        <select
          onChange={(e) => setCategoryFilter(e.target.value)}
          value={categoryFilter}
          className="border rounded-md px-2"
        >
          <option value="all">모든 카테고리</option>
          <option value="PLANNING">PLANNING</option>
          <option value="WORK">WORK</option>
          <option value="HOBBY">HOBBY</option>
          <option value="USER">USER</option>
          <option value="GENERAL">GENERAL</option>
        </select>
      </div>

      {/* 메모 목록 */}
      {sortedMemos.length === 0 ? (
        <p className="text-gray-500">표시할 메모가 없습니다.</p>
      ) : (
        sortedMemos.map((m) => (
          <div
            key={m.id}
            className={`border rounded-xl p-4 mb-3 shadow-sm ${getCategoryBg(
              m.category
            )} ${m.is_completed ? "opacity-70" : ""}`}
          >
            {editId === m.id ? (
              <>
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="border px-2 py-1 w-full mb-2 rounded-md"
                />
                <button
                  onClick={() => saveEdit(m.id)}
                  className="px-3 py-1 border rounded-md mr-2 bg-blue-100"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditId(null)}
                  className="px-3 py-1 border rounded-md"
                >
                  취소
                </button>
              </>
            ) : (
              <>
                <h3
                  className={`font-semibold text-lg ${
                    m.is_completed ? "line-through text-gray-500" : ""
                  }`}
                >
                  {m.title}
                </h3>
                <p className="text-sm text-gray-700 mt-1">{m.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  마감일: {m.due_date || "없음"} / 작성일:{" "}
                  {m.created_at.split("T")[0]}
                </p>
                <p className="text-sm mt-1">
                  🔸{" "}
                  <span className={getPriorityColor(m.priority)}>
                    우선순위: {m.priority}
                  </span>{" "}
                  / 📁 카테고리: {m.category}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleComplete(m.id, m.is_completed)}
                    className="px-3 py-1 border rounded-md text-sm hover:bg-gray-100"
                  >
                    {m.is_completed ? "미완료" : "완료"}
                  </button>
                  <button
                    onClick={() => {
                      setEditId(m.id);
                      setEditText(m.content);
                    }}
                    className="px-3 py-1 border rounded-md text-sm hover:bg-blue-100 text-blue-600"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteMemo(m.id)}
                    className="px-3 py-1 border rounded-md text-sm hover:bg-red-100 text-red-600"
                  >
                    삭제
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
