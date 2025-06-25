import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StepContentProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

export function StepContent({ children, isActive, className }: StepContentProps) {
  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn("space-y-4", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}