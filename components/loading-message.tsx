"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export function LoadingMessage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        type: "spring",
        stiffness: 200,
        damping: 20,
      }}
      className="flex justify-start mb-6"
    >
      <div className="flex items-start gap-3 max-w-[85%]">
        {/* Avatar */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-foreground border-2 border-border/50"
        >
          <Bot className="h-4 w-4" />
        </motion.div>

        {/* Loading Content */}
        <motion.div className="relative rounded-2xl px-4 py-3 shadow backdrop-blur-sm bg-gradient-to-br from-background to-muted/50 text-foreground border border-border/50 rounded-bl-md min-w-[200px]">
          {/* Message bubble tail */}
          <div className="absolute top-4 -left-1 w-3 h-3 transform rotate-45 bg-gradient-to-br from-background to-muted/50 border-l border-b border-border/50" />

          {/* Skeleton Content */}
          <div className="relative z-10 space-y-2">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
              className="flex items-center gap-2"
            >
              <div className="flex gap-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.6,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0,
                  }}
                  className="w-2 h-2 bg-primary/60 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.6,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.2,
                  }}
                  className="w-2 h-2 bg-primary/60 rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{
                    duration: 0.6,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: 0.4,
                  }}
                  className="w-2 h-2 bg-primary/60 rounded-full"
                />
              </div>
              <span className="text-sm text-muted-foreground">
                Kornelia is thinking...
              </span>
            </motion.div>

            {/* Skeleton lines */}
            <div className="space-y-2">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: 0.5,
                }}
                className="h-3 bg-muted/50 rounded w-3/4"
              />
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: 1,
                }}
                className="h-3 bg-muted/50 rounded w-1/2"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
