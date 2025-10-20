import { useEffect, useState } from "react";

export default function MemoList() {
  const [memos, setMemos] = useState([]);
  const [filter, setFilter] = useState("all"); // all, completed, incomplete
  const [sortBy, setSortBy] = useState("createdAt"); // createdAt, dueDate
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");

  // 로컬스토리지에서 불러오기
  useEffect(() => {
    try {
      // chatMessages에서 메모 추출
      const chatStored = localStorage.getItem("chatMessages");
      let chatMemos = [];
      if (chatStored) {
        const chatMessages = JSON.parse(chatStored);
        chatMemos = extractMemosFromChat(chatMessages);
      }

      // memos에서 수정된 메모들 불러오기
      const memosStored = localStorage.getItem("memos");
      let modifiedMemos = [];
      if (memosStored) {
        modifiedMemos = JSON.parse(memosStored);
      }

      // chatMessages의 메모와 수정된 메모들을 합치기
      const allMemos = [...chatMemos];
      
      // 수정된 메모가 있으면 기존 메모를 대체
      modifiedMemos.forEach(modifiedMemo => {
        const existingIndex = allMemos.findIndex(memo => memo.id === modifiedMemo.id);
        if (existingIndex !== -1) {
          // 기존 메모를 수정된 메모로 교체
          allMemos[existingIndex] = modifiedMemo;
        } else {
          // 새로운 메모인 경우에만 추가 (중복 방지)
          const isDuplicate = allMemos.some(memo => 
            memo.content === modifiedMemo.content && 
            memo.createdAt === modifiedMemo.createdAt
          );
          if (!isDuplicate) {
            allMemos.push(modifiedMemo);
          }
        }
      });

      setMemos(allMemos);
    } catch (error) {
      console.error("메모 데이터 로딩 오류:", error);
      setMemos([]);
    }
  }, []);

  // 채팅 메시지에서 메모 추출 함수
  function extractMemosFromChat(chatMessages) {
    const memos = [];
    
    chatMessages.forEach((message, index) => {
      if (message.role === "ai" && message.content) {
        try {
          // AI 응답에서 JSON 파싱
          const aiResponse = JSON.parse(message.content);
          
          // isMemo가 true이고 content가 있는 경우에만 메모로 추가
          if (aiResponse.isMemo && aiResponse.content) {
            const memo = {
              id: `chat-${index}`, // 고정된 ID (index 기반)
              title: aiResponse.content,
              content: aiResponse.content,
              dueDate: aiResponse.dueDate || null,
              isCompleted: false,
              createdAt: new Date().toISOString().split("T")[0], // 오늘 날짜
            };
            memos.push(memo);
          }
        } catch (parseError) {
          // JSON 파싱 실패 시 무시
          console.log("AI 응답이 JSON 형식이 아닙니다:", parseError);
        }
      }
    });
    
    return memos;
  }

  // 로컬스토리지 업데이트 함수
  function updateLocalStorage(updated) {
    setMemos(updated);
    // 메모 수정/삭제 시 별도의 memos 키에 저장
    localStorage.setItem("memos", JSON.stringify(updated));
  }

  // 완료 상태 변경
  function toggleComplete(id) {
    const updated = memos.map((memo) =>
      memo.id === id ? { ...memo, isCompleted: !memo.isCompleted } : memo
    );
    updateLocalStorage(updated);
  }

  // 메모 삭제
  function deleteMemo(id) {
    const updated = memos.filter((memo) => memo.id !== id);
    updateLocalStorage(updated);
  }

  // 수정 모드 진입
  function startEdit(id, currentText) {
    setEditId(id);
    setEditText(currentText);
  }

  // 수정 완료
  function saveEdit(id) {
    const updated = memos.map((memo) =>
      memo.id === id ? { ...memo, content: editText, title: editText } : memo
    );
    updateLocalStorage(updated);
    setEditId(null);
    setEditText("");
  }

  // 필터링 적용
  const filteredMemos = memos.filter((memo) => {
    if (filter === "completed") return memo.isCompleted === true;
    if (filter === "incomplete") return memo.isCompleted === false;
    return true;
  });

  // 정렬 적용
  const sortedMemos = [...filteredMemos].sort((a, b) => {
    if (sortBy === "dueDate") {
      // 마감일이 없는 경우 맨 뒤로
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else {
      // 작성일순 (최신순)
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">📝 내 메모 목록</h2>

      {/* 필터 및 정렬 메뉴 */}
      <div className="flex gap-3 mb-4">
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
      </div>

      {sortedMemos.length === 0 ? (
        <p className="text-gray-500">표시할 메모가 없습니다.</p>
      ) : (
        sortedMemos.map((memo) => (
          <div
            key={memo.id}
            className={`border rounded-xl p-4 mb-3 shadow-sm ${
              memo.isCompleted ? "bg-gray-300" : "bg-white"
            }`}
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