"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import { ChevronDown, Sparkles, TrendingUp } from "lucide-react";

export function TemplateSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const templates = [
    {
      value: "plain",
      label: "Plain",
      icon: Sparkles,
      description: "General purpose chat",
    },
    {
      value: "financial",
      label: "Financial",
      icon: TrendingUp,
      description: "Financial analysis & insights",
    },
  ];

  const currentTemplate =
    templates.find((t) => t.value === value) || templates[0];
  const CurrentIcon = currentTemplate.icon;

  return (
    <div className="relative">
      <Select value={value} onValueChange={onChange} onOpenChange={setIsOpen}>
        <SelectTrigger className="group relative overflow-hidden border-2 border-transparent bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 dark:from-slate-800 dark:to-slate-900 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-300 hover:border-primary/20 focus:border-primary/40 shadow-sm hover:shadow-md w-fit min-w-[140px]">
          <motion.div
            className="flex items-center gap-2 text-sm font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <CurrentIcon className="h-4 w-4 text-primary" />
            </motion.div>
            <span className="text-foreground">{currentTemplate.label}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </motion.div>
          </motion.div>

          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            layoutId="template-bg"
          />
        </SelectTrigger>

        <SelectContent className="border-2 border-border/50 shadow-xl backdrop-blur-sm bg-background/95">
          <AnimatePresence>
            {templates.map((template, index) => {
              const Icon = template.icon;
              return (
                <motion.div
                  key={template.value}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SelectItem
                    value={template.value}
                    className="group cursor-pointer hover:bg-primary/5 focus:bg-primary/10 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 py-1">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Icon className="h-4 w-4 text-primary group-hover:text-primary/80" />
                      </motion.div>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {template.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {template.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </SelectContent>
      </Select>
    </div>
  );
}
