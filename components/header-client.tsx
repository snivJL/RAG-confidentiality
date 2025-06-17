"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { User, LogOut, LogIn } from "lucide-react";
import type { Session } from "next-auth";
import Image from "next/image";

interface HeaderClientProps {
  session: Session | null;
}

export function HeaderClient({ session }: HeaderClientProps) {
  console.log(session);
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl shadow-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand / Logo */}
        <Link href="/chat" className="group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2"
          >
            <Image
              src="/logo-sm.svg"
              height={64}
              width={64}
              priority
              alt="logo korefocus small"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Korefocus RAG Demo
              </span>
              <span className="text-xs text-muted-foreground -mt-1">
                AI-Powered Search
              </span>
            </div>
          </motion.div>
        </Link>

        {/* Right-side user actions */}
        <div className="flex items-center gap-4">
          {session?.user ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                  <User className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">
                    {session.user.email}
                  </span>
                  {session.user.roles?.[0] && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {session.user.roles[0]}
                    </span>
                  )}
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-2 border-2 border-border/50 hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive transition-all duration-200"
                  onClick={() =>
                    signOut({ redirect: true, callbackUrl: "/login" })
                  }
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                asChild
                size="sm"
                className="h-8 gap-2 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Link href="/login">
                  <LogIn className="h-3 w-3" />
                  Sign in
                </Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
