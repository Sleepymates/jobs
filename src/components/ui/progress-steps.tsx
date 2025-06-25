import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
}

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="relative">
      <div className="absolute top-5 left-1 right-1 h-0.5 bg-gray-200 dark:bg-gray-700" />
      <div
        className="absolute top-5 left-1 h-0.5 bg-gray-900 dark:bg-white transition-all duration-500"
        style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
      />
      <div className="relative flex justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step} className="flex flex-col items-center">
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 relative z-10",
                  isCompleted ? "bg-gray-900 border-gray-900 dark:bg-white dark:border-white" : 
                  isCurrent ? "bg-white border-gray-900 dark:bg-black dark:border-white" :
                  "bg-white border-gray-200 dark:bg-black dark:border-gray-700"
                )}
                initial={false}
                animate={{
                  scale: isCurrent ? 1.2 : 1,
                  transition: { type: "spring", stiffness: 500, damping: 30 }
                }}
              >
                {isCompleted ? (
                  <Check className={cn(
                    "w-5 h-5",
                    isCompleted ? "text-white dark:text-gray-900" : "text-gray-400"
                  )} />
                ) : (
                  <span className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-gray-900 dark:text-white" : "text-gray-400"
                  )}>
                    {index + 1}
                  </span>
                )}
              </motion.div>
              <span className={cn(
                "mt-2 text-sm font-medium",
                isCurrent ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
              )}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}