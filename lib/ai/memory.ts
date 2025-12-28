// lib/ai/memory.ts
export interface MemoryItem {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export class SimpleMemory {
  private memories: MemoryItem[] = []
  private maxSize: number
  
  constructor(maxSize: number = 20) {
    this.maxSize = maxSize
  }
  
  addMemory(item: Omit<MemoryItem, 'timestamp'>): MemoryItem {
    const memory: MemoryItem = {
      ...item,
      timestamp: new Date()
    }
    
    this.memories.push(memory)
    
    // Keep memory size manageable
    if (this.memories.length > this.maxSize) {
      this.memories = this.memories.slice(-this.maxSize)
    }
    
    return memory
  }
  
  getRecentMemories(count: number = 5): MemoryItem[] {
    return this.memories.slice(-count)
  }
  
  getAllMemories(): MemoryItem[] {
    return [...this.memories]
  }
  
  clearMemories(): void {
    this.memories = []
  }
  
  summarize(): string {
    if (this.memories.length === 0) return ''
    
    const userMessages = this.memories
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content.substring(0, 100))
    
    return `Recent topics: ${userMessages.join('; ')}`
  }
}