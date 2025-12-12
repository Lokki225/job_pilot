"use client";

import { Progress } from "@/components/ui/progress";

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({ 
  value, 
  label, 
  showPercentage = false, 
  size = "md",
  className = ""
}: ProgressBarProps) {
  const heightClass = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3"
  }[size];

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1 text-sm">
          {label && (
            <span className="text-gray-600 dark:text-gray-400">{label}</span>
          )}
          {showPercentage && (
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {Math.round(value)}%
            </span>
          )}
        </div>
      )}
      <Progress value={value} className={heightClass} />
    </div>
  );
}
