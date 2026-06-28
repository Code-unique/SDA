// lib/optimization.ts
// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  let lastFunc: NodeJS.Timeout
  let lastRan: number
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      lastRan = Date.now()
      inThrottle = true
    } else {
      clearTimeout(lastFunc)
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan >= limit) {
          func(...args)
          lastRan = Date.now()
        }
      }, limit - (Date.now() - lastRan))
    }
  }
}

// Local storage with error handling
export const safeLocalStorage = {
  get: (key: string): any => {
    if (typeof window === 'undefined') return null
    
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('LocalStorage get error:', error)
      return null
    }
  },
  
  set: (key: string, value: any): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('LocalStorage set error:', error)
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('LocalStorage remove error:', error)
    }
  }
}

// Performance measurement
export const perf = {
  start: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label)
    }
  },
  
  end: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(label)
    }
  },
  
  measure: <T extends (...args: any[]) => any>(
    label: string,
    func: T
  ): (...args: Parameters<T>) => ReturnType<T> => {
    return (...args: Parameters<T>) => {
      perf.start(label)
      const result = func(...args)
      perf.end(label)
      return result
    }
  }
}

// Virtual scrolling helper
export class VirtualScrollHelper {
  private observer: IntersectionObserver | null = null
  private visibleItems = new Set<string>()
  
  observe(element: HTMLElement, id: string) {
    if (!this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.visibleItems.add(id)
            } else {
              this.visibleItems.delete(id)
            }
          })
        },
        { threshold: 0.1 }
      )
    }
    
    this.observer.observe(element)
  }
  
  unobserve(element: HTMLElement) {
    this.observer?.unobserve(element)
  }
  
  isVisible(id: string): boolean {
    return this.visibleItems.has(id)
  }
  
  destroy() {
    this.observer?.disconnect()
    this.observer = null
    this.visibleItems.clear()
  }
}