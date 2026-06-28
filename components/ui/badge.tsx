// components/ui/badge.tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 
    | 'default' 
    | 'primary' 
    | 'secondary' 
    | 'success' 
    | 'warning' 
    | 'premium' 
    | 'outline'
    | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
}

export function Badge({ 
  className, 
  variant = 'default', 
  size = 'md',
  glow = false,
  ...props 
}: BadgeProps) {

  const base =
    "inline-flex items-center font-semibold transition-all duration-300 hover:-translate-y-0.5"

  const sizes = {
    sm: "px-2 py-1 text-xs rounded-full",
    md: "px-3 py-1.5 text-sm rounded-xl",
    lg: "px-4 py-2 text-base rounded-2xl"
  }

  const variants = {
    default: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
    primary: "bg-rose-500 text-white shadow-glow",
    secondary: "bg-pink-200 text-pink-800 dark:bg-pink-800 dark:text-pink-200",
    success: "bg-emerald-500 text-white shadow-glow",
    warning: "bg-amber-500 text-white shadow-glow",
    premium:
      "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-glow",
    outline:
      "border border-slate-400 dark:border-slate-600 text-slate-700 dark:text-slate-300 bg-transparent",
    destructive:
      "bg-red-600 text-white shadow-glow"
  }

  return (
    <span
      className={cn(
        base,
        sizes[size],
        variants[variant],
        glow && "shadow-glow",
        className
      )}
      {...props}
    />
  )
}
