//app/message/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Send, User, Clock } from 'lucide-react'

interface Conversation {
  _id: string
  participants: any[]
  lastMessage: any
  unreadCount: number
  updatedAt: string
}

interface Message {
  _id: string
  sender: any
  receiver: any
  content: string
  messageType: string
  read: boolean
  createdAt: string
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      const otherParticipant = selectedConversation.participants.find(
        (p: any) => p._id !== selectedConversation._id // This needs to be current user's ID
      )

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: otherParticipant._id,
          content: newMessage
        }),
      })

      if (response.ok) {
        setNewMessage('')
        fetchMessages(selectedConversation._id)
        fetchConversations() // Refresh conversations to update last message
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="rounded-2xl lg:w-1/3">
            <CardContent className="p-0">
              {/* Search */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Conversations */}
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      No conversations yet
                    </p>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const otherParticipant = conversation.participants[0] // Simplified
                    return (
                      <div
                        key={conversation._id}
                        className={`p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
                          selectedConversation?._id === conversation._id ? 'bg-slate-50 dark:bg-slate-800' : ''
                        }`}
                        onClick={() => {
                          setSelectedConversation(conversation)
                          fetchMessages(conversation._id)
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={otherParticipant.avatar || '/default-avatar.png'}
                            alt={otherParticipant.username}
                            className="w-12 h-12 rounded-xl"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold truncate">
                                {otherParticipant.firstName} {otherParticipant.lastName}
                              </h3>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="default" className="rounded-full">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                              {conversation.lastMessage?.content || 'No messages yet'}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">
                                {new Date(conversation.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="rounded-2xl flex-1 flex flex-col">
            <CardContent className="p-0 flex flex-col flex-1">
              {selectedConversation ? (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`flex ${message.sender._id === 'current-user-id' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md rounded-2xl p-3 ${
                            message.sender._id === 'current-user-id'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender._id === 'current-user-id'
                              ? 'text-rose-100'
                              : 'text-slate-500'
                          }`}>
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="rounded-xl flex-1"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="rounded-xl"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <User className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Select a conversation
                    </h3>
                    <p className="text-slate-500 dark:text-slate-500">
                      Choose a conversation from the list to start messaging
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}