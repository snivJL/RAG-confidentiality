"use client";

import { useState, useRef } from "react";
import { ChatMessage } from "@/components/chat-message";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/components/template-selector";

type Msg = { role: "user" | "ai"; content: string };

export default function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [template, setTemplate] = useState("plain");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!input.trim()) return;
    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: input, template }),
    });
    console.log(await res.json());
    const data = (await res.json()) as {
      answer: string;
      citations: { n: number; title: string; url: string }[];
    };

    const answerWithLinks =
      data.answer +
      "\n\n" +
      data.citations.map((c) => `[${c.n}](${c.url})`).join(" ");

    setMessages((m) => [...m, { role: "ai", content: answerWithLinks }]);
    setLoading(false);
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((m, idx) => (
          <ChatMessage key={idx} role={m.role} content={m.content} />
        ))}
        <div ref={endRef} />
      </div>

      {/* input area */}
      <div className="border-t bg-background p-4">
        <div className="flex items-center gap-2">
          <TemplateSelector value={template} onChange={setTemplate} />
          <Input
            className="flex-1"
            placeholder="Ask me..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <Button onClick={send} disabled={loading}>
            {loading ? "..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
