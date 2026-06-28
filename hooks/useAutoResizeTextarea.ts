// hooks/useAutoResizeTextarea.ts
import { useEffect, RefObject } from 'react'

export function useAutoResizeTextarea(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string
) {
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = `${Math.min(ref.current.scrollHeight, 150)}px`
    }
  }, [ref, value])
}