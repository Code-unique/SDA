// app/explore/page.tsx - Simple explore page
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Search, Users, UserPlus, MessageSquare, Shirt, MapPin } from 'lucide-react'

interface User {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  bio: string
  location?: string
  role: string
  followers: any[]
}

export default function ExplorePage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true
    
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
    const username = user.username.toLowerCase()
    const bio = user.bio.toLowerCase()
    const location = user.location?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    
    return fullName.includes(query) || username.includes(query) || bio.includes(query) || location.includes(query)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Explore</h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Connect with fashion designers and enthusiasts
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search by name, username, location, or interests..."
              className="pl-12 rounded-xl text-lg py-6 border-0 bg-slate-100 dark:bg-slate-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {filteredUsers.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                {searchQuery ? 'No users found' : 'No users to display'}
              </h3>
              <p className="text-slate-500">
                {searchQuery ? 'Try a different search term' : 'Check back later for new users'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user._id} className="rounded-2xl overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="h-32 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/10 dark:to-pink-900/10" />
                <CardContent className="p-6 -mt-16">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <Avatar className="w-20 h-20 border-4 border-white dark:border-slate-900">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      {user.role === 'designer' && (
                        <Badge className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500">
                          <Shirt className="w-3 h-3 mr-1" />
                          Designer
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-2">
                      @{user.username}
                    </p>
                    
                    {user.location && (
                      <div className="flex items-center justify-center text-sm text-slate-500 mb-3">
                        <MapPin className="w-4 h-4 mr-1" />
                        {user.location}
                      </div>
                    )}
                    
                    <p className="text-slate-700 dark:text-slate-300 text-sm mb-4 line-clamp-2">
                      {user.bio || 'No bio yet'}
                    </p>

                    <div className="flex items-center justify-center space-x-2 mb-4 text-sm text-slate-600 dark:text-slate-400">
                      <Users className="w-4 h-4" />
                      <span>{user.followers?.length || 0} followers</span>
                    </div>

                    <div className="flex space-x-2 w-full">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-full"
                        onClick={() => router.push(`/profile/${user.username}`)}
                      >
                        Profile
                      </Button>
                      <Button
                        variant="default"
                        className="flex-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                        onClick={() => router.push(`/messages?start=${user._id}`)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}