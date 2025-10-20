import { useEffect, useState } from "react";

export default function MemoList3() {
  const [memos, setMemos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM"); // 🟢 추가
  const [newCategory, setNewCategory] = useState("GENERAL"); // 🟢 추가

  // ✅ 간단 해시 (채팅 메모 ID 안정화)
  function simpleHash(str) {
    if (!str) return "0";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0; // 32bit 정수
    }
    return Math.abs(hash).toString(36);
  }

  // ✅ 삭제된 메모 ID 영속화 유틸
  function getDeletedIds() {
    try {
      const raw = localStorage.getItem("deletedMemoIds");
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveDeletedIds(idsSet) {
    const arr = Array.from(idsSet);
    localStorage.setItem("deletedMemoIds", JSON.stringify(arr));
  }

  // ✅ 로컬스토리지 불러오기 (Chat.jsx 방식으로 안전하게 처리)
  useEffect(() => {
    try {
      // 채팅 메시지에서 메모 추출
      const chatStored = localStorage.getItem("chatMessages");
      let chatMemos = [];
      if (chatStored) {
        const chatMessages = JSON.parse(chatStored);
        // 배열인지 확인하고 안전하게 처리
        if (Array.isArray(chatMessages)) {
          chatMemos = extractMemosFromChat(chatMessages);
        } else {
          console.warn("chatMessages가 배열이 아닙니다:", chatMessages);
        }
      }

      // 수정된 메모들 불러오기
      const memosStored = localStorage.getItem("memos");
      let modifiedMemos = [];
      if (memosStored) {
        const parsed = JSON.parse(memosStored);
        // 배열인지 확인하고 안전하게 처리
        if (Array.isArray(parsed)) {
          modifiedMemos = parsed;
        } else {
          console.warn("memos가 배열이 아닙니다:", parsed);
        }
      }

      // 삭제된 ID는 필터링
      const deletedIds = getDeletedIds();

      chatMemos = chatMemos.filter((m) => !deletedIds.has(m.id));

      console.log("📋 로딩된 채팅 메모:", chatMemos.length, "개");
      console.log("📋 로딩된 수정 메모:", modifiedMemos.length, "개");

      const allMemos = [...chatMemos];
      modifiedMemos.forEach((modifiedMemo) => {
        if (deletedIds.has(modifiedMemo.id)) return; // 삭제된 것은 스킵
        const existingIndex = allMemos.findIndex(
          (memo) => memo.id === modifiedMemo.id
        );
        if (existingIndex !== -1) {
          allMemos[existingIndex] = modifiedMemo;
        } else {
          const isDuplicate = allMemos.some(
            (memo) =>
              memo.content === modifiedMemo.content &&
              memo.createdAt === modifiedMemo.createdAt
          );
          if (!isDuplicate) {
            allMemos.push(modifiedMemo);
          }
        }
      });

      console.log("📋 최종 메모 개수:", allMemos.length);
      setMemos(allMemos);
    } catch (error) {
      console.error("❌ 메모 데이터 로딩 오류:", error);
      setMemos([]);
    }
  }, []);

  // ✅ AI 응답에서 메모 추출 (안전 + 안정 ID)
  function extractMemosFromChat(chatMessages) {
    const memos = [];
    
    // chatMessages가 배열인지 확인
    if (!Array.isArray(chatMessages)) {
      console.warn("chatMessages가 배열이 아닙니다:", chatMessages);
      return memos;
    }
    
    chatMessages.forEach((message, index) => {
      // message 객체가 유효한지 확인
      if (!message || typeof message !== 'object') {
        console.warn(`메시지 ${index}가 유효하지 않습니다:`, message);
        return;
      }
      
      if (message.role === "ai" && message.content) {
        try {
          const aiResponse = JSON.parse(message.content);
          if (aiResponse.isMemo && aiResponse.content) {
            const stableId = `chat-${simpleHash(aiResponse.content)}`;
            memos.push({
              id: stableId,
              title: aiResponse.content,
              content: aiResponse.content,
              dueDate: aiResponse.dueDate || null,
              priority: aiResponse.priority || "MEDIUM",
              category: aiResponse.category || "GENERAL",
              isCompleted: false,
              createdAt: new Date().toISOString().split("T")[0],
            });
            console.log("📝 AI 메모 추출됨:", aiResponse.content);
          }
        } catch (err) {
          console.log("AI 응답이 JSON 형식이 아닙니다:", err);
        }
      }
    });
    
    console.log("📝 추출된 AI 메모 총 개수:", memos.length);
    return memos;
  }

  // ✅ 로컬스토리지 업데이트
  function updateLocalStorage(updated) {
    setMemos(updated);
    localStorage.setItem("memos", JSON.stringify(updated));
  }

  // ✅ 새 메모 추가
  function addMemo() {
    if (newText.trim() === "") return;

    const newMemo = {
      id: `user-${Date.now()}`,
      title: newText,
      content: newText,
      dueDate: newDueDate || null,
      priority: newPriority,
      category: newCategory,
      isCompleted: false,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const updated = [newMemo, ...memos];
    updateLocalStorage(updated);
    setNewText("");
    setNewDueDate("");
    setNewPriority("MEDIUM");
    setNewCategory("GENERAL");
  }

  // ✅ 완료 상태 토글
  function toggleComplete(id) {
    const updated = memos.map((memo) =>
      memo.id === id ? { ...memo, isCompleted: !memo.isCompleted } : memo
    );
    updateLocalStorage(updated);
  }

  // ✅ 삭제 (영속화: 삭제 ID 저장)
  function deleteMemo(id) {
    const updated = memos.filter((memo) => memo.id !== id);
    // 삭제 ID 저장
    const deleted = getDeletedIds();
    deleted.add(id);
    saveDeletedIds(deleted);
    updateLocalStorage(updated);
  }

  // ✅ 수정
  function startEdit(id, currentText) {
    setEditId(id);
    setEditText(currentText);
  }

  function saveEdit(id) {
    const updated = memos.map((memo) =>
      memo.id === id ? { ...memo, content: editText, title: editText } : memo
    );
    updateLocalStorage(updated);
    setEditId(null);
    setEditText("");
  }

  // ✅ 필터링
  const filteredMemos = memos.filter((memo) => {
    if (filter === "completed" && !memo.isCompleted) return false;
    if (filter === "incomplete" && memo.isCompleted) return false;
    if (categoryFilter !== "all" && memo.category !== categoryFilter)
      return false;
    return true;
  });

  // ✅ 정렬
  const sortedMemos = [...filteredMemos].sort((a, b) => {
    if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
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

  // ✅ UI
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📝 내 할 일 목록</h2>

      {/* 새 메모 추가 */}
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

        {/* 🟢 우선순위 선택 */}
        <select
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          className="border rounded-md px-2 py-2 w-32"
        >
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

        {/* 🟢 카테고리 선택 */}
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

      {sortedMemos.length === 0 ? (
        <p className="text-gray-500">표시할 메모가 없습니다.</p>
      ) : (
        sortedMemos.map((memo) => (
          <div
            key={memo.id}
            className={`border rounded-xl p-4 mb-3 shadow-sm ${getCategoryBg(
              memo.category
            )} ${memo.isCompleted ? "opacity-70" : ""}`}
          >
            {editId === memo.id ? (
              <>
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="border px-2 py-1 w-full mb-2 rounded-md"
                />
                <button
                  onClick={() => saveEdit(memo.id)}
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
                    memo.isCompleted ? "line-through text-gray-500" : ""
                  }`}
                >
                  {memo.title}
                </h3>
                <p className="text-sm text-gray-700 mt-1">{memo.content}</p>
                <p className="text-sm text-gray-500 mt-2">
                  마감일: {memo.dueDate || "없음"} / 작성일: {memo.createdAt}
                </p>
                <p className="text-sm mt-1">
                  🔸{" "}
                  <span className={getPriorityColor(memo.priority)}>
                    우선순위: {memo.priority}
                  </span>{" "}
                  / 📁 카테고리: {memo.category}
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleComplete(memo.id)}
                    className="px-3 py-1 border rounded-md text-sm hover:bg-gray-100"
                  >
                    {memo.isCompleted ? "미완료" : "완료"}
                  </button>
                  <button
                    onClick={() => startEdit(memo.id, memo.content)}
                    className="px-3 py-1 border rounded-md text-sm hover:bg-blue-100 text-blue-600"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteMemo(memo.id)}
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
