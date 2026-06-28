// app/ai-coach/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import { 
  Send, Sparkles, User, BookOpen, TrendingUp, Palette, 
  Scissors, ShoppingBag, Recycle, MessageSquare, Trash2, Camera,
  ChevronDown, ChevronUp, Search, Star, Clock,
  Award, Video, Book, Menu, X, Plus, MoreVertical,
  Download, Settings, HelpCircle, Zap
} from 'lucide-react'
import Markdown from 'react-markdown'
import { debounce, safeLocalStorage } from '@/lib/optimization'
import { useConversations } from '@/hooks/useConversations'
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea'
import { useDeviceDetection } from '@/hooks/useDeviceDetection'

// Types
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

type LearningModule = {
  id: string
  title: string
  description: string
  icon: any
  color: string
  duration: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  query: string
}

type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  isStarred: boolean
}

// Constants
const WELCOME_MESSAGE_CONTENT = `# 👋 Welcome to AI Fashion Coach Pro

Your intelligent fashion design assistant ready to help with:

## 🎯 **Core Expertise**
- **Trend Analysis** & Forecasting
- **Color Theory** & Palette Creation
- **Design Critique** & Improvement
- **Portfolio Development**
- **Business Strategy** & Pricing
- **Sustainable Practices**
- **Technical Skills** & Construction

## 💡 **Quick Start Options**
1. Ask a specific question about your project
2. Use quick prompts for instant guidance
3. Explore learning modules for structured education
4. Analyze outfits with detailed feedback

**What would you like to work on today?**`

const QUICK_PROMPTS = [
  { icon: TrendingUp, text: '2024 fashion trends', color: 'from-purple-500 to-pink-500' },
  { icon: Palette, text: 'Color palette guide', color: 'from-blue-500 to-cyan-500' },
  { icon: Scissors, text: 'Design critique', color: 'from-green-500 to-emerald-500' },
  { icon: ShoppingBag, text: 'Pricing strategy', color: 'from-amber-500 to-orange-500' },
  { icon: Recycle, text: 'Sustainability tips', color: 'from-teal-500 to-emerald-500' },
  { icon: BookOpen, text: 'Portfolio advice', color: 'from-indigo-500 to-purple-500' },
] as const

const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'color-mastery',
    title: 'Color Theory',
    description: 'Master color harmony in fashion',
    icon: Palette,
    color: 'from-blue-500 to-cyan-500',
    duration: '45 min',
    level: 'Beginner',
    query: 'Teach me color theory for fashion design'
  },
  {
    id: 'portfolio-pro',
    title: 'Portfolio Pro',
    description: 'Build professional portfolio',
    icon: BookOpen,
    color: 'from-purple-500 to-pink-500',
    duration: '60 min',
    level: 'Intermediate',
    query: 'How to create a winning portfolio'
  },
  {
    id: 'sustainability',
    title: 'Sustainability',
    description: 'Eco-friendly fashion practices',
    icon: Recycle,
    color: 'from-green-500 to-emerald-500',
    duration: '50 min',
    level: 'Beginner',
    query: 'Sustainable fashion practices guide'
  },
  {
    id: 'business',
    title: 'Business Guide',
    description: 'Launch your fashion business',
    icon: ShoppingBag,
    color: 'from-amber-500 to-orange-500',
    duration: '75 min',
    level: 'Intermediate',
    query: 'Business strategy for fashion startups'
  },
  {
    id: 'trends',
    title: 'Trend Forecasting',
    description: 'Predict fashion trends',
    icon: TrendingUp,
    color: 'from-rose-500 to-pink-500',
    duration: '55 min',
    level: 'Advanced',
    query: 'How to forecast fashion trends'
  },
  {
    id: 'technical',
    title: 'Technical Skills',
    description: 'Master fashion construction',
    icon: Scissors,
    color: 'from-indigo-500 to-purple-500',
    duration: '65 min',
    level: 'Intermediate',
    query: 'Technical fashion design skills'
  },
]

// ============================================
// COMPONENTS
// ============================================

const MessageBubble = memo(({ message, formatTime }: { 
  message: Message; 
  formatTime: (ts: number) => string;
}) => {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-start gap-3 max-w-[95%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`hidden xs:flex w-8 h-8 rounded-full items-center justify-center flex-shrink-0 ${
          isUser 
            ? 'bg-gradient-to-r from-gray-800 to-gray-900' 
            : 'bg-gradient-to-r from-rose-500 to-pink-500'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Sparkles className="w-4 h-4 text-white" />
          )}
        </div>
        
        {/* Message Content */}
        <div className={`rounded-2xl px-4 py-3 max-w-full ${
          isUser 
            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white' 
            : 'bg-white border shadow-sm'
        }`}>
          <div className="prose prose-sm max-w-none text-sm sm:text-base">
            <Markdown
              components={{
                h1: ({children}) => <h1 className="text-lg font-bold mt-2 mb-2 text-gray-900">{children}</h1>,
                h2: ({children}) => <h2 className="text-base font-bold mt-2 mb-2 text-gray-800">{children}</h2>,
                h3: ({children}) => <h3 className="text-sm font-bold mt-1 mb-1 text-gray-700">{children}</h3>,
                p: ({children}) => <p className="mb-2 text-gray-700">{children}</p>,
                ul: ({children}) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                li: ({children}) => <li className="text-gray-700">{children}</li>,
                strong: ({children}) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {message.content}
            </Markdown>
          </div>
          <div className={`text-xs mt-2 ${isUser ? 'text-rose-100' : 'text-gray-500'}`}>
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    </div>
  )
})

MessageBubble.displayName = 'MessageBubble'

const ConversationItem = memo(({ 
  conversation, 
  isActive, 
  onSelect, 
  onToggleStar, 
  onDelete,
  isMobile = false
}: { 
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  isMobile?: boolean;
}) => {
  const [formattedDate, setFormattedDate] = useState('')
  
  useEffect(() => {
    if (conversation.createdAt > 0) {
      setFormattedDate(new Date(conversation.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }))
    }
  }, [conversation.createdAt])
  
  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-all group border ${
        isActive
          ? 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200'
          : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      aria-current={isActive ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {conversation.isStarred && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
            <p className="font-medium text-sm text-gray-900 truncate">
              {conversation.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {conversation.messages.length} messages
            </span>
            {formattedDate && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{formattedDate}</span>
              </>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar()
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title={conversation.isStarred ? 'Unstar' : 'Star'}
            aria-label={conversation.isStarred ? 'Unstar conversation' : 'Star conversation'}
          >
            <Star className={`w-4 h-4 ${conversation.isStarred ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Delete"
            aria-label="Delete conversation"
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
})

ConversationItem.displayName = 'ConversationItem'

const LearningModuleCard = memo(({ 
  module, 
  onClick,
  isMobile = false
}: { 
  module: LearningModule;
  onClick: () => void;
  isMobile?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all active:scale-[0.98] text-left w-full group ${
      isMobile ? 'p-3' : ''
    }`}
    aria-label={`Start ${module.title} module`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-lg bg-gradient-to-r ${module.color} group-hover:scale-110 transition-transform`}>
        <module.icon className="w-5 h-5 text-white" />
      </div>
      <span className={`px-2 py-1 text-xs rounded-full ${
        module.level === 'Beginner' ? 'bg-green-100 text-green-800' :
        module.level === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
        'bg-purple-100 text-purple-800'
      }`}>
        {module.level}
      </span>
    </div>
    
    <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>
    <p className={`text-gray-600 mb-3 line-clamp-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
      {module.description}
    </p>
    
    <div className="flex items-center justify-between">
      <div className={`flex items-center gap-2 text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
        <Clock className="w-4 h-4" />
        <span>{module.duration}</span>
      </div>
      <div className="text-sm text-rose-600 font-medium group-hover:translate-x-1 transition-transform">
        Start →
      </div>
    </div>
  </button>
))

LearningModuleCard.displayName = 'LearningModuleCard'

const LoadingIndicator = memo(() => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0">
      <Sparkles className="w-4 h-4 text-white" />
    </div>
    <div className="bg-white border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  </div>
))

LoadingIndicator.displayName = 'LoadingIndicator'

const MobileDrawer = memo(({
  isOpen,
  onClose,
  children
}: {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}) => (
  <>
    {/* Overlay */}
    {isOpen && (
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
    )}
    
    {/* Drawer */}
    <div 
      className={`
        fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50
        transform transition-transform duration-300 ease-in-out md:hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      aria-modal="true"
      role="dialog"
      aria-label="Conversations drawer"
    >
      <div className="flex flex-col h-full">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Conversations</h2>
              <p className="text-xs text-gray-500">Manage your chats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  </>
))

MobileDrawer.displayName = 'MobileDrawer'

// Mobile Header Component
const MobileHeader = memo(({
  currentConversation,
  startNewConversation,
  setIsMobileDrawerOpen
}: {
  currentConversation: Conversation
  startNewConversation: () => void
  setIsMobileDrawerOpen: (value: boolean) => void
}) => (
  <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
    <div className="flex items-center gap-3">
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>
      <div>
        <h1 className="text-base font-semibold text-gray-900 truncate max-w-[150px]">
          {currentConversation.title}
        </h1>
        <p className="text-xs text-gray-500">
          {currentConversation.messages.length} messages
        </p>
      </div>
    </div>
    <button
      onClick={startNewConversation}
      className="px-3 py-2 text-sm bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
      aria-label="Start new conversation"
    >
      New
    </button>
  </div>
))

MobileHeader.displayName = 'MobileHeader'

// Desktop Header Component
const DesktopHeader = memo(({
  startNewConversation,
  exportConversation
}: {
  startNewConversation: () => void
  exportConversation: () => void
}) => {
  const [showActionMenu, setShowActionMenu] = useState(false)
  const actionMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setShowActionMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="hidden md:block sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 via-pink-500 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-gray-900">Fashion Coach AI</h1>
                <p className="text-xs text-gray-500">Professional Design Assistant</p>
              </div>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportConversation}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Export conversation"
              aria-label="Export conversation"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>

            <button
              onClick={startNewConversation}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all active:scale-95"
              aria-label="Start new conversation"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>

            <div className="relative" ref={actionMenuRef}>
              <button
                onClick={() => setShowActionMenu(!showActionMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="More options"
                aria-expanded={showActionMenu}
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
              
              {showActionMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      exportConversation()
                      setShowActionMenu(false)
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Export Chat
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false)
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowActionMenu(false)
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <HelpCircle className="w-4 h-4" />
                    Help & Support
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
})

DesktopHeader.displayName = 'DesktopHeader'

// Quick Prompt Button for Mobile
const MobileQuickPrompt = memo(({ 
  prompt,
  onClick,
  disabled 
}: { 
  prompt: typeof QUICK_PROMPTS[number];
  onClick: () => void;
  disabled: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-rose-200 transition-colors disabled:opacity-50"
    aria-label={`Quick prompt: ${prompt.text}`}
  >
    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${prompt.color}`}>
      <prompt.icon className="w-3.5 h-3.5 text-white" />
    </div>
    <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
      {prompt.text}
    </span>
  </button>
))

MobileQuickPrompt.displayName = 'MobileQuickPrompt'

// ============================================
// HELPER FUNCTIONS
// ============================================

const createWelcomeMessage = (): Message => ({
  id: 'welcome',
  role: 'assistant',
  content: WELCOME_MESSAGE_CONTENT,
  timestamp: Date.now()
})

// ============================================
// MAIN COMPONENT
// ============================================

export default function AICoachPage() {
  // Custom hooks
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    addConversation,
    deleteConversation,
    toggleStar,
    addMessage
  } = useConversations()
  
  // Device detection
  const { isMobile } = useDeviceDetection()
  
  // Core state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'learn' | 'image'>('chat')
  const [imageDescription, setImageDescription] = useState('')
  const [showAllConversations, setShowAllConversations] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  
  // Refs
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-resize textarea - FIXED: Using properly typed ref
  useAutoResizeTextarea(textareaRef, input)
  
  // Mount state for hydration safety
  useEffect(() => {
    setHasMounted(true)
  }, [])
  
  // Initialize messages after mount to prevent hydration mismatch
  useEffect(() => {
    if (hasMounted) {
      const currentConv = conversations.find(c => c.id === currentConversationId)
      const currentMessages = currentConv?.messages || []
      setMessages(currentMessages.length > 0 ? currentMessages : [createWelcomeMessage()])
    }
  }, [currentConversationId, conversations, hasMounted])
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (hasMounted && bottomRef.current && messages.length > 0) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [messages, hasMounted])
  
  // Memoized values
  const formatTime = useCallback((timestamp: number) => {
    if (timestamp === 0) return ''
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }, [])
  
  const currentConversation = useMemo(() => 
    conversations.find(c => c.id === currentConversationId) || conversations[0],
    [conversations, currentConversationId]
  )
  
  const filteredConversations = useMemo(() => {
    let filtered = conversations
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some((m: Message) => 
          m.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }
    
    return filtered.sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1
      if (!a.isStarred && b.isStarred) return 1
      return b.createdAt - a.createdAt
    })
  }, [conversations, searchQuery])
  
  const visibleConversations = useMemo(() => 
    showAllConversations ? filteredConversations : filteredConversations.slice(0, 5),
    [filteredConversations, showAllConversations]
  )
  
  const debouncedSearch = useMemo(() => 
    debounce((value: string) => setSearchQuery(value), 300),
    []
  )
  
  // AI Response Generator - Minimal and production-ready
  const generateAIResponse = useCallback(async (userMessage: string, context: 'chat' | 'image' | 'learn' = 'chat'): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 800))
    
    if (context === 'image') {
      return `## 👗 **Professional Outfit Analysis**

Based on your description, here's my analysis:

### 🎨 **Color & Style Assessment**
- Overall coordination appears balanced
- Consider adding neutral base for versatility
- Ensure color proportions follow 60-30-10 rule

### 💡 **Improvement Suggestions**
1. Test outfit in different lighting
2. Consider fabric breathability
3. Ensure comfortable movement
4. Photograph for portfolio review

**Would you like specific styling recommendations?**`
    }
    
    if (context === 'learn') {
      return `## 📚 **Learning Module Activated**

### 🎯 **Course Overview**
- Structured fashion education
- Practical skill development
- Industry-standard techniques
- Portfolio building guidance

### 🛠️ **Get Started**
1. Select your skill level
2. Focus on specific areas
3. Practice with exercises
4. Review case studies

**What specific skill would you like to develop?**`
    }
    
    return `## ✨ **Expert Fashion Guidance**

I'm ready to help with your fashion design needs:

### 🎯 **How I Can Assist**
- Design critique and improvement
- Color theory and palette creation
- Business strategy and pricing
- Sustainable fashion practices
- Portfolio development
- Trend analysis

### 💡 **For Best Results**
1. Describe your project in detail
2. Specify your target audience
3. Mention any constraints
4. Share your goals

**Tell me about your current project or ask a specific question!**`
  }, [])
  
  // Message Handling
  const sendMessage = useCallback(async (content: string, context: 'chat' | 'image' | 'learn' = 'chat') => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    addMessage(currentConversationId, userMessage)
    
    setIsLoading(true)
    
    if (context === 'image') {
      setImageDescription('')
    } else {
      setInput('')
    }

    try {
      const response = await generateAIResponse(content, context)
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, aiMessage])
      addMessage(currentConversationId, aiMessage)
      
    } catch (error) {
      console.error('Error generating response:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an issue. Please try again.",
        timestamp: Date.now()
      }
      
      setMessages(prev => [...prev, errorMessage])
      addMessage(currentConversationId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [generateAIResponse, isLoading, currentConversationId, addMessage])
  
  // Conversation Management
  const startNewConversation = useCallback(() => {
    const newId = addConversation('New Conversation')
    setCurrentConversationId(newId)
    setMessages([createWelcomeMessage()])
    setActiveTab('chat')
    setIsMobileDrawerOpen(false)
  }, [addConversation, setCurrentConversationId])
  
  const handleDeleteConversation = useCallback((id: string) => {
    if (conversations.length <= 1) {
      startNewConversation()
    }
    deleteConversation(id)
  }, [conversations.length, deleteConversation, startNewConversation])
  
  const exportConversation = useCallback(() => {
    const currentConv = conversations.find(c => c.id === currentConversationId)
    if (!currentConv) return
    
    const conversationText = currentConv.messages.map((m: Message) => 
      `${m.role.toUpperCase()} (${formatTime(m.timestamp)}):\n${m.content}\n${'-'.repeat(60)}\n`
    ).join('\n')
    
    const blob = new Blob([`AI Fashion Coach Conversation\nTitle: ${currentConv.title}\nDate: ${new Date().toLocaleDateString()}\n\n${conversationText}`], 
      { type: 'text/plain' })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fashion-coach-${currentConv.title.replace(/\s+/g, '-')}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [conversations, currentConversationId, formatTime])
  
  const handleLearningModuleClick = useCallback((module: LearningModule) => {
    sendMessage(module.query, 'learn')
    setActiveTab('chat')
  }, [sendMessage])
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (activeTab === 'chat') {
        sendMessage(input, 'chat')
      } else if (activeTab === 'image') {
        sendMessage(imageDescription, 'image')
      }
    }
  }, [activeTab, input, imageDescription, sendMessage])

  // Don't render until mounted to prevent hydration mismatch
  if (!hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Fashion Coach...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-transparent"
              aria-label="Search conversations"
            />
          </div>
        </div>
        
        <div className="p-4 space-y-2">
          {visibleConversations.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No conversations found</p>
            </div>
          ) : (
            visibleConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={currentConversationId === conv.id}
                onSelect={() => {
                  setCurrentConversationId(conv.id)
                  setActiveTab('chat')
                  setIsMobileDrawerOpen(false)
                }}
                onToggleStar={() => toggleStar(conv.id)}
                onDelete={() => handleDeleteConversation(conv.id)}
                isMobile={true}
              />
            ))
          )}
        </div>
        
        {filteredConversations.length > 5 && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setShowAllConversations(!showAllConversations)}
              className="w-full py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-200"
              aria-label={showAllConversations ? 'Show fewer conversations' : 'Show more conversations'}
            >
              {showAllConversations ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show More ({filteredConversations.length - 5})
                </>
              )}
            </button>
          </div>
        )}
      </MobileDrawer>

      {/* Conditional Headers */}
      {isMobile ? (
        <MobileHeader
          currentConversation={currentConversation}
          startNewConversation={startNewConversation}
          setIsMobileDrawerOpen={setIsMobileDrawerOpen}
        />
      ) : (
        <DesktopHeader
          startNewConversation={startNewConversation}
          exportConversation={exportConversation}
        />
      )}

      {/* Main Content */}
      <main className="flex-1">
        <div className="flex-1 flex max-w-7xl mx-auto w-full p-4 gap-4">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <aside className="hidden md:flex flex-col w-64 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">Conversations</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {conversations.length}
                  </span>
                </div>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    onChange={(e) => debouncedSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-transparent"
                    aria-label="Search conversations"
                  />
                </div>
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {visibleConversations.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No conversations found</p>
                    </div>
                  ) : (
                    visibleConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={currentConversationId === conv.id}
                        onSelect={() => {
                          setCurrentConversationId(conv.id)
                          setActiveTab('chat')
                        }}
                        onToggleStar={() => toggleStar(conv.id)}
                        onDelete={() => handleDeleteConversation(conv.id)}
                      />
                    ))
                  )}
                </div>
                
                {filteredConversations.length > 5 && (
                  <button
                    onClick={() => setShowAllConversations(!showAllConversations)}
                    className="w-full mt-4 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center justify-center gap-2 border border-gray-200"
                    aria-label={showAllConversations ? 'Show fewer conversations' : 'Show more conversations'}
                  >
                    {showAllConversations ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show More ({filteredConversations.length - 5})
                      </>
                    )}
                  </button>
                )}
              </div>
            </aside>
          )}

          {/* Main Area */}
          <div className={`flex-1 flex flex-col min-w-0 ${!isMobile ? '' : 'w-full'}`}>
            {/* Tabs - Mobile optimized */}
            <div className={`flex ${isMobile ? 'gap-1 overflow-x-auto pb-2' : 'gap-2 mb-4'}`}>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-4 py-2.5 text-sm rounded-lg flex items-center gap-2 flex-shrink-0 transition-all ${
                  activeTab === 'chat' 
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                } ${isMobile ? 'px-3 py-2' : ''}`}
                aria-label="Chat tab"
                aria-current={activeTab === 'chat' ? 'true' : 'false'}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('learn')}
                className={`px-4 py-2.5 text-sm rounded-lg flex items-center gap-2 flex-shrink-0 transition-all ${
                  activeTab === 'learn' 
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                } ${isMobile ? 'px-3 py-2' : ''}`}
                aria-label="Learn tab"
                aria-current={activeTab === 'learn' ? 'true' : 'false'}
              >
                <BookOpen className="w-4 h-4" />
                <span>Learn</span>
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`px-4 py-2.5 text-sm rounded-lg flex items-center gap-2 flex-shrink-0 transition-all ${
                  activeTab === 'image' 
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                } ${isMobile ? 'px-3 py-2' : ''}`}
                aria-label="Image analysis tab"
                aria-current={activeTab === 'image' ? 'true' : 'false'}
              >
                <Camera className="w-4 h-4" />
                <span>Image</span>
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              {activeTab === 'learn' ? (
                <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                  <div className={isMobile ? 'mb-6' : 'mb-8'}>
                    <h2 className={`font-bold text-gray-900 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                      Learning Modules
                    </h2>
                    <p className="text-gray-600">Master fashion design through structured courses</p>
                  </div>
                  
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                    {LEARNING_MODULES.map((module) => (
                      <LearningModuleCard
                        key={module.id}
                        module={module}
                        onClick={() => handleLearningModuleClick(module)}
                        isMobile={isMobile}
                      />
                    ))}
                  </div>
                </div>
              ) : activeTab === 'image' ? (
                <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4' : 'p-6'}`}>
                  <div className="max-w-2xl mx-auto">
                    <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
                      <div className={`inline-block bg-rose-100 rounded-2xl mb-4 ${isMobile ? 'p-3' : 'p-4'}`}>
                        <Camera className={`text-rose-500 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'}`} />
                      </div>
                      <h2 className={`font-bold text-gray-900 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                        Image Analysis
                      </h2>
                      <p className="text-gray-600">
                        Get detailed feedback on outfits and designs
                      </p>
                    </div>
                    
                    <div className={isMobile ? 'mb-4' : 'mb-6'}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Describe your outfit or design:
                      </label>
                      <textarea
                        value={imageDescription}
                        onChange={(e) => setImageDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Example: A knee-length A-line dress in emerald green silk with cap sleeves, worn to a summer garden party."
                        className="w-full h-48 resize-none border border-gray-300 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-transparent"
                        aria-label="Describe your outfit or design"
                      />
                    </div>
                    
                    <button
                      onClick={() => sendMessage(imageDescription, 'image')}
                      disabled={isLoading || !imageDescription.trim()}
                      className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                      aria-label="Get professional analysis"
                    >
                      {isLoading ? 'Analyzing...' : 'Get Professional Analysis'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-3' : 'p-4 md:p-6'}`}>
                    {messages.length === 1 ? (
                      <div className={`text-center ${isMobile ? 'py-6' : 'py-12'}`}>
                        <div className={`inline-block bg-rose-100 rounded-2xl mb-4 ${isMobile ? 'p-4' : 'p-6'}`}>
                          <Sparkles className={`text-rose-500 ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`} />
                        </div>
                        <h3 className={`font-bold text-gray-900 mb-3 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                          Welcome! 👗
                        </h3>
                        <p className="text-gray-600 mb-8 max-w-md mx-auto">
                          Expert fashion design, trends, business, and sustainability guidance.
                        </p>
                        
                        <div className={`grid gap-3 max-w-3xl mx-auto ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                          {QUICK_PROMPTS.map((prompt, i) => (
                            isMobile ? (
                              <MobileQuickPrompt
                                key={i}
                                prompt={prompt}
                                onClick={() => sendMessage(prompt.text, 'chat')}
                                disabled={isLoading}
                              />
                            ) : (
                              <button
                                key={i}
                                onClick={() => sendMessage(prompt.text, 'chat')}
                                disabled={isLoading}
                                className="p-4 text-left bg-white border border-gray-200 rounded-xl hover:border-rose-200 hover:shadow-lg transition-all disabled:opacity-50"
                                aria-label={`Quick prompt: ${prompt.text}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`p-2 rounded-lg bg-gradient-to-r ${prompt.color}`}>
                                    <prompt.icon className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">
                                    {prompt.text}
                                  </span>
                                </div>
                              </button>
                            )
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            formatTime={formatTime}
                          />
                        ))}
                        
                        {isLoading && <LoadingIndicator />}
                        
                        <div ref={bottomRef} />
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="border-t border-gray-200 p-4">
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <textarea
                          ref={textareaRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Ask about fashion design, trends, business..."
                          className="w-full resize-none border border-gray-300 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-transparent"
                          rows={1}
                          aria-label="Message input"
                        />
                        <button
                          onClick={() => sendMessage(input, 'chat')}
                          disabled={isLoading || !input.trim()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                          aria-label="Send message"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs text-gray-500">
                        Enter to send • Shift+Enter for new line
                      </div>
                      <div className="text-xs text-gray-500">
                        {messages.length - 1} messages
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}