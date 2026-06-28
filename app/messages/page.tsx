// app/messages/page.tsx - WITH SUSPENSE BOUNDARY
'use client'

import { Suspense } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { format } from 'date-fns'
import { 
  Search, 
  Send, 
  ChevronLeft,
  User,
  Check,
  CheckCheck,
  MessageSquare,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface Conversation {
  _id: string
  participants: Array<{
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar?: string
  }>
  lastMessage?: {
    content: string
    createdAt: string
    sender: { _id: string }
  }
  unreadCount: number
  updatedAt: string
}

interface Message {
  _id: string
  sender: {
    _id: string
    firstName: string
    lastName: string
    avatar?: string
  }
  content: string
  read: boolean
  createdAt: string
}

interface CurrentUser {
  _id: string
  firstName: string
  lastName: string
  avatar?: string
}

// Main component wrapped in Suspense
function MessagesContent() {
  const router = useRouter()
  const searchParams = useSearchParams() // Now safe to use in Suspense boundary
  const { user: clerkUser, isLoaded } = useUser()
  
  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showConversations, setShowConversations] = useState(true)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conversationId = searchParams.get('conversation')

  // Auto-scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages])

  // Initial load
  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetchCurrentUser()
    }
  }, [isLoaded, clerkUser])

  // Load conversations
  useEffect(() => {
    if (currentUser) {
      fetchConversations()
    }
  }, [currentUser])

  // Handle URL conversation
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c._id === conversationId)
      if (conv) {
        setSelectedConversation(conv)
        setShowConversations(false)
        fetchMessages(conv._id)
      }
    }
  }, [conversationId, conversations])

  // Fetch user
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/users/me')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setCurrentUser(data.user)
        }
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch messages
  const fetchMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  // Send message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || !currentUser) return

    try {
      setSending(true)
      const otherParticipant = selectedConversation.participants.find(
        p => p._id !== currentUser._id
      )

      if (!otherParticipant) return

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: otherParticipant._id,
          content: newMessage.trim()
        })
      })

      if (res.ok) {
        setNewMessage('')
        await fetchMessages(selectedConversation._id)
        await fetchConversations()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Get other participant
  const getOtherParticipant = (conversation: Conversation) => {
    if (!currentUser) return conversation.participants[0]
    return conversation.participants.find(p => p._id !== currentUser._id) || conversation.participants[0]
  }

  // Format time
  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a')
  }

  // Filter conversations
  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery.trim()) return true
    
    const other = getOtherParticipant(conversation)
    const fullName = `${other.firstName} ${other.lastName}`.toLowerCase()
    const username = other.username.toLowerCase()
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || username.includes(query)
  })

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowConversations(false)
    fetchMessages(conversation._id)
    router.push(`/messages?conversation=${conversation._id}`)
  }

  // Toggle conversations
  const toggleConversations = () => {
    setShowConversations(!showConversations)
  }

  // Loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    )
  }

  // Not signed in
  if (!clerkUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center max-w-sm w-full">
          <MessageSquare className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to message</h2>
          <p className="text-gray-600 mb-6">Connect with other fashion enthusiasts</p>
          <Button 
            onClick={() => router.push('/sign-in')}
            className="w-full bg-rose-500 hover:bg-rose-600"
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {/* Conversations List View */}
        {showConversations && (
          <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">Messages</h1>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/explore')}
                    className="h-8 w-8"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Search */}
              <div className="mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-9 h-9 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto bg-white">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-center">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => router.push('/explore')}
                      className="mt-4"
                      variant="outline"
                    >
                      Find People
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredConversations.map((conversation) => {
                    const other = getOtherParticipant(conversation)
                    
                    return (
                      <div
                        key={conversation._id}
                        className="p-3 active:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelectConversation(conversation)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={other.avatar} />
                              <AvatarFallback className="bg-rose-100 text-rose-600 text-sm">
                                {other.firstName[0]}{other.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.unreadCount > 0 && (
                              <div className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                                {conversation.unreadCount}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-sm truncate">
                                {other.firstName} {other.lastName}
                              </h3>
                              <span className="text-xs text-gray-500">
                                {format(new Date(conversation.updatedAt), 'MMM d')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {conversation.lastMessage?.content || 'Start a conversation'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation View */}
        {!showConversations && selectedConversation && (
          <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleConversations}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {(() => {
                    const other = getOtherParticipant(selectedConversation)
                    return (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={other.avatar} />
                          <AvatarFallback className="bg-rose-100 text-rose-600 text-xs">
                            {other.firstName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="font-medium text-sm">{other.firstName}</h2>
                          <p className="text-xs text-gray-500">Active now</p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.push(`/profile/${getOtherParticipant(selectedConversation).username}`)}
                >
                  <User className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="text-center max-w-xs">
                    <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="w-6 h-6 text-rose-500" />
                    </div>
                    <h3 className="font-medium mb-1">No messages yet</h3>
                    <p className="text-sm text-gray-500">
                      Send your first message to start the conversation
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isCurrentUser = currentUser && message.sender._id === currentUser._id
                    
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${!isCurrentUser ? 'mr-auto' : 'ml-auto'}`}>
                          <div className={`rounded-xl px-3 py-2 ${isCurrentUser ? 'bg-rose-500 text-white' : 'bg-white border border-gray-200'}`}>
                            <p className="text-sm">{message.content}</p>
                            <div className={`flex items-center justify-end mt-1 ${isCurrentUser ? 'text-rose-100' : 'text-gray-500'}`}>
                              <span className="text-xs">
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {isCurrentUser && (
                                <span className="ml-1 text-xs">
                                  {message.read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="sticky bottom-0 bg-white border-t px-3 py-2">
              <form onSubmit={sendMessage} className="flex items-center space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 h-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage(e)
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="h-10 w-10 p-0 bg-rose-500 hover:bg-rose-600 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex h-screen bg-white">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold">Messages</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/explore')}
                className="h-8 w-8"
              >
                <User className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-9 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                      <div className="h-2 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <MessageSquare className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-3">
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => router.push('/explore')}
                    variant="outline"
                    className="text-sm"
                  >
                    Find People
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((conversation) => {
                  const other = getOtherParticipant(conversation)
                  const isSelected = selectedConversation?._id === conversation._id
                  
                  return (
                    <div
                      key={conversation._id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-rose-50' : ''}`}
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={other.avatar} />
                            <AvatarFallback className="bg-rose-100 text-rose-600 text-sm">
                              {other.firstName[0]}{other.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          {conversation.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 h-5 w-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm truncate">
                              {other.firstName}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {format(new Date(conversation.updatedAt), 'MMM d')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {conversation.lastMessage?.content || 'Say hello!'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {(() => {
                    const other = getOtherParticipant(selectedConversation)
                    return (
                      <>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={other.avatar} />
                          <AvatarFallback className="bg-rose-100 text-rose-600">
                            {other.firstName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="font-semibold">{other.firstName}</h2>
                          <p className="text-sm text-gray-500">Active now</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.push(`/profile/${getOtherParticipant(selectedConversation).username}`)}
                >
                  <User className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-sm">
                      <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageSquare className="w-6 h-6 text-rose-500" />
                      </div>
                      <h3 className="font-medium mb-1">No messages yet</h3>
                      <p className="text-sm text-gray-500">
                        Send your first message to start the conversation
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    {messages.map((message) => {
                      const isCurrentUser = currentUser && message.sender._id === currentUser._id
                      
                      return (
                        <div
                          key={message._id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}
                        >
                          <div className={`max-w-[70%] ${!isCurrentUser ? 'mr-auto' : 'ml-auto'}`}>
                            {!isCurrentUser && (
                              <p className="text-xs font-medium text-gray-600 mb-1 ml-1">
                                {message.sender.firstName}
                              </p>
                            )}
                            <div className={`rounded-xl px-4 py-3 ${isCurrentUser ? 'bg-rose-500 text-white' : 'bg-gray-100'}`}>
                              <p className="text-sm">{message.content}</p>
                              <div className={`flex items-center justify-end mt-2 ${isCurrentUser ? 'text-rose-100' : 'text-gray-500'}`}>
                                <span className="text-xs">
                                  {formatMessageTime(message.createdAt)}
                                </span>
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs">
                                    {message.read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage(e)
                      }
                    }}
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-2">Your Messages</h3>
                <p className="text-gray-500 mb-6">
                  Select a conversation from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main export with Suspense boundary
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}