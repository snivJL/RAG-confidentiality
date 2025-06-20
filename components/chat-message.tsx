"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { User, Bot, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Renders either a user or AI bubble */
export function ChatMessage({
  role,
  content,
  index = 0,
  actions,
}: {
  role: "user" | "ai";
  content: string;
  index?: number;
  actions?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Text copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
      toast.error("Failed to copy text");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6 group relative`}
    >
      <div
        className={`flex items-start gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md ${
            isUser
              ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
              : "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-foreground border-2 border-border/50"
          }`}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </motion.div>

        {/* Message Content */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={`relative rounded-2xl px-4 py-3 shadow-lg backdrop-blur-sm ${
            isUser
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md"
              : "bg-gradient-to-br from-background to-muted/50 text-foreground border border-border/50 rounded-bl-md"
          }`}
        >
          {/* Message bubble tail */}
          <div
            className={`absolute top-4 w-3 h-3 transform rotate-45 ${
              isUser
                ? "-right-1 bg-gradient-to-br from-primary to-primary/90"
                : "-left-1 bg-gradient-to-br from-background to-muted/50 border-l border-b border-border/50"
            }`}
          />

          {/* Content */}
          <div className="relative z-10 pr-8">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                ),
                code: ({ children }) => (
                  <code
                    className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                      isUser
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`underline underline-offset-2 hover:no-underline transition-all duration-200 ${
                      isUser
                        ? "text-primary-foreground/90 hover:text-primary-foreground"
                        : "text-primary hover:text-primary/80"
                    }`}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
            {actions && (
              <div className="mt-3 flex flex-wrap gap-2">{actions}</div>
            )}
          </div>
        </motion.div>

        {/* Copy button - positioned outside the message bubble */}
        {!isUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            whileHover={{ opacity: 1, scale: 1.05 }}
            className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-all duration-200"
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={copyToClipboard}
              className="h-8 w-8 p-0 rounded-full hover:bg-muted/80 transition-all duration-200"
            >
              <motion.div
                animate={{ scale: copied ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.2 }}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </motion.div>
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
