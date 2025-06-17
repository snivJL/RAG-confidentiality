import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders either a user or AI bubble */
export function ChatMessage({
  role,
  content,
}: {
  role: "user" | "ai";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : ""} my-2`}>
      <div
        className={`max-w-prose rounded-lg px-4 py-2 text-sm shadow ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
