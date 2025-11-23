// components/ui/toast-action.tsx
'use client'

import { FC, ReactNode } from 'react'

interface ToastActionProps {
  onClick: () => void
  altText?: string
  children: ReactNode
}

export const ToastAction: FC<ToastActionProps> = ({ onClick, altText, children }) => (
  <button 
    onClick={onClick} 
    aria-label={altText}
    className="ml-2 px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20 transition"
  >
    {children}
  </button>
)
