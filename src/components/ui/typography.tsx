import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function AnimatedTitle({ text, className, delay = 0 }: AnimatedTextProps) {
  return (
    <motion.h1 
      className={cn(
        "text-5xl md:text-7xl font-bold tracking-tight mb-4 flex flex-col items-center gap-4",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-white/80">
        {text}
      </span>
    </motion.h1>
  );
}

export function AnimatedSubtitle({ text, className, delay = 0.2 }: AnimatedTextProps) {
  return (
    <motion.p 
      className={cn(
        "text-xl text-gray-600 dark:text-gray-400",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      {text}
    </motion.p>
  );
}