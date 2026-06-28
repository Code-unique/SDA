// components/ui/progress.tsx
"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  showAnimation?: boolean
  gradient?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, showAnimation = true, gradient = true, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 transition-all duration-500",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full w-full flex-1 transition-all duration-1000 ease-out",
            gradient 
              ? "bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500" 
              : "bg-rose-600",
            showAnimation && "animate-pulse-soft"
          )}
          style={{ 
            transform: `translateX(-${100 - percentage}%)`,
            transition: showAnimation ? 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
          }}
        />
        {showAnimation && (
          <div
            className="absolute inset-0 animate-shimmer"
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        )}
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }