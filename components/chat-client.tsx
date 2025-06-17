"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage } from "@/components/chat-message";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/components/template-selector";
import { Send, Loader2, MessageSquare } from "lucide-react";

type Msg = { role: "user" | "ai"; content: string };

export default function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [template, setTemplate] = useState("plain");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;

    const userMsg: Msg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, template }),
      });
      const data = (await res.json()) as {
        answer: string;
        citations: { n: number; title: string; url: string }[];
      };

      const answerWithLinks =
        data.answer +
        "\n\n" +
        data.citations.map((c) => `[${c.n}](${c.url})`).join(" ");

      setMessages((m) => [...m, { role: "ai", content: answerWithLinks }]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                  }}
                  className="mb-6"
                >
                  <MessageSquare className="h-16 w-16 text-primary/60" />
                </motion.div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Search the knowledge base
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything! I&apos;m here to help with your questions and
                  provide detailed answers.
                </p>
              </motion.div>
            ) : (
              messages.map((m, idx) => (
                <ChatMessage
                  key={`${idx}-${m.content.slice(0, 20)}`}
                  role={m.role}
                  content={m.content}
                  index={idx}
                />
              ))
            )}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {loading && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex justify-start mb-6"
              >
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 border-2 border-border/50">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <Loader2 className="h-4 w-4" />
                    </motion.div>
                  </div>
                  <div className="bg-gradient-to-br from-background to-muted/50 border border-border/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-muted-foreground/60 rounded-full"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 1.5,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={endRef} />
        </div>
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="border-t border-border/50 bg-background/80 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-end gap-3">
            <TemplateSelector value={template} onChange={setTemplate} />

            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                className="pr-12 min-h-[44px] resize-none border-2 border-border/50 focus:border-primary/50 bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 rounded-xl"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <Button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="send"
                        initial={{ opacity: 0, rotate: -90 }}
                        animate={{ opacity: 1, rotate: 0 }}
                        exit={{ opacity: 0, rotate: 90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Send className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-muted-foreground mt-2 text-center"
          >
            Press Enter to send, Shift + Enter for new line
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
