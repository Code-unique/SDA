// hooks/useConversations.ts
import { useState, useEffect, useCallback } from 'react'
import { safeLocalStorage } from '@/lib/optimization'

export type Conversation = {
  id: string
  title: string
  messages: any[]
  createdAt: number
  category: string
  isStarred: boolean
}

const DEFAULT_CONVERSATION: Conversation = {
  id: 'default',
  title: 'Welcome',
  messages: [],
  createdAt: Date.now(),
  category: 'General',
  isStarred: false
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = safeLocalStorage.get('fashion-coach-conversations')
    return saved?.length > 0 ? saved : [DEFAULT_CONVERSATION]
  })

  const [currentConversationId, setCurrentConversationId] = useState(() => {
    const saved = conversations[0]?.id || 'default'
    return saved
  })

  // Save to localStorage
  useEffect(() => {
    safeLocalStorage.set('fashion-coach-conversations', conversations)
  }, [conversations])

  const addConversation = useCallback((title: string) => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title,
      messages: [],
      createdAt: Date.now(),
      category: 'General',
      isStarred: false
    }
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversationId(newConversation.id)
    return newConversation.id
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    
    if (currentConversationId === id) {
      const nextConv = conversations.find(c => c.id !== id)
      if (nextConv) {
        setCurrentConversationId(nextConv.id)
      }
    }
  }, [conversations, currentConversationId])

  const toggleStar = useCallback((id: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, isStarred: !conv.isStarred } : conv
    ))
  }, [])

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, ...updates } : conv
    ))
  }, [])

  const addMessage = useCallback((conversationId: string, message: any) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversationId) {
        // Auto-generate title from first user message
        let title = conv.title
        if (conv.title === 'Welcome' && message.role === 'user') {
          title = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
        }
        
        return {
          ...conv,
          title,
          messages: [...conv.messages, message]
        }
      }
      return conv
    }))
  }, [])

  return {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    deleteConversation,
    toggleStar,
    updateConversation,
    addMessage
  }
}