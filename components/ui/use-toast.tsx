//components/ui/use-toast.tsx
'use client'

import { useState, createContext, useContext } from 'react'
import { cn } from "@/lib/utils"

export type ToastType = 'default' | 'destructive' | 'success' | 'warning' | 'premium'

export interface Toast {
  id: string
  title: string
  description?: string
  action?: React.ReactNode
  variant?: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  toast: (props: Omit<Toast, 'id'> & { id?: string }) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (props: Omit<Toast, 'id'> & { id?: string }) => {
    const id = props.id || Math.random().toString(36).substring(2, 9)
    const duration = props.duration || 5000
    const newToast = { ...props, id, duration }
    
    setToasts(prev => [...prev, newToast])
    
    // Auto remove after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, duration)
  }

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  const variantStyles = {
    default: "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 shadow-xl",
    destructive: "bg-red-500 text-white border-red-600 shadow-xl",
    success: "bg-emerald-500 text-white border-emerald-600 shadow-xl",
    warning: "bg-amber-500 text-white border-amber-600 shadow-xl",
    premium: "bg-gradient-to-r from-rose-500 to-pink-500 text-white border-pink-600 shadow-glow-lg"
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={cn(
            "p-4 rounded-2xl border-2 transition-all duration-500 animate-slide-in-right",
            variantStyles[toast.variant || 'default'],
            "hover-lift cursor-pointer"
          )}
          style={{ animationDelay: `${index * 100}ms` }}
          onClick={() => dismiss(toast.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold">{toast.title}</p>
              {toast.description && (
                <p className="text-sm opacity-90 mt-1">{toast.description}</p>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                dismiss(toast.id)
              }}
              className="ml-4 text-current opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {toast.action && (
            <div className="mt-3">
              {toast.action}
            </div>
          )}
          {/* Progress bar */}
          <div className="w-full bg-black/10 rounded-full h-1 mt-3 overflow-hidden">
            <div 
              className="h-full bg-white/30 transition-all duration-100 ease-linear"
              style={{ 
                width: '100%',
                animation: `shrink ${toast.duration}ms linear forwards` 
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}