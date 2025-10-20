import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatMessage({ message }) {
  const isUser = message["role"] === "user";
  const isAi = message["role"] === "ai";

  return (
    <div className={`mt-6 flex ${isUser ? "justify-end" : "justify-start"}`}>
      {isAi ? (
        <div className="max-w-[90%] w-full">
          <div className="flex items-center gap-2 mb-2 text-purple-700">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-sm">🤖</span>
            <span className="text-sm font-semibold">AI</span>
          </div>
          <div className="rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50 to-white shadow-sm p-4">
            <div className="markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 border rounded-xl border-gray-300 bg-white shadow-sm">
          {message.content}
        </div>
      )}
    </div>
  );
}
