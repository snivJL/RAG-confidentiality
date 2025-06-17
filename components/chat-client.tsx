"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { ChatMessage } from "@/components/chat-message";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/components/template-selector";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Send, Loader2, MessageSquare } from "lucide-react";

type HiddenDoc = { docId: string; ownerEmail: string };

// extend Msg so we can stash `hidden` on a system message
type Msg =
  | { role: "user" | "ai" | "system"; content: string }
  | { role: "system"; hidden?: HiddenDoc[] };

export default function ChatClient() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [template, setTemplate] = useState("plain");
  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // scroll on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function requestAccess(docId: string, ownerEmail: string) {
    try {
      await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, ownerEmail }),
      });
      toast(`Requested access from ${ownerEmail}`);
    } catch (e) {
      toast.error(`Failed to request access: ${String(e)}`);
    }
  }

  async function send() {
    if (!input.trim() || loading) return;

    // push the user msg
    setMessages((m) => [...m, { role: "user", content: input }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, template }),
      });
      const data = (await res.json()) as {
        answer?: string;
        citations?: { n: number; title: string; url: string }[];
        hidden?: HiddenDoc[];
        error?: string;
      };

      // handle errors
      if (data.error) {
        setMessages((m) => [...m, { role: "ai", content: `❌ ${data.error}` }]);
        return;
      }

      // no docs at all
      if (data.answer === "No results from the API.") {
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            content:
              "Sorry, I couldn’t find any documents in the knowledge base to answer your query.",
          },
        ]);
        return;
      }

      // hidden-docs case
      if (data.hidden?.length) {
        setMessages((m) => [
          ...m,
          { role: "ai", content: data.answer! },
          { role: "system", hidden: data.hidden },
        ]);
        return;
      }

      // normal case with citations
      const answerWithLinks =
        (data.answer ?? "") +
        "\n\n" +
        (data.citations ?? []).map((c) => `[${c.n}](${c.url})`).join(" ");

      setMessages((m) => [...m, { role: "ai", content: answerWithLinks }]);
    } catch (e) {
      console.error(e);
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 && (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
              >
                <MessageSquare className="h-16 w-16 text-primary/60 mb-6 animate-pulse" />
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Search the knowledge base
                </h2>
                <p className="text-muted-foreground max-w-md">
                  Ask me anything! I&apos;m here to help with your questions.
                </p>
              </motion.div>
            )}

            {messages.map((m, idx) => {
              if ("content" in m && m.role !== "system") {
                return (
                  <ChatMessage
                    key={idx}
                    role={m.role}
                    content={m.content}
                    index={idx}
                  />
                );
              }

              // hidden docs notice
              if (m.role === "system" && "hidden" in m) {
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md mb-4 space-y-2"
                  >
                    <p className="text-sm text-yellow-800">
                      You don’t have access to {m.hidden!.length} document
                      {m.hidden!.length > 1 ? "s" : ""}.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {m.hidden!.map(({ docId, ownerEmail }) => (
                        <DropdownMenu key={docId}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                            >
                              Request access from {ownerEmail}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onSelect={() => requestAccess(docId, ownerEmail)}
                            >
                              Via Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={() =>
                                navigator.clipboard.writeText(ownerEmail)
                              }
                            >
                              Copy email
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ))}
                    </div>
                  </motion.div>
                );
              }

              return null;
            })}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
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
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
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
