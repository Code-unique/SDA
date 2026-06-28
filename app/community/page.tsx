// app/community/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Users, 
  TrendingUp, 
  Sparkles, 
  MapPin,
  UserPlus,
  Star,
  Heart,
  MessageCircle,
  Calendar,
  Shirt,
  Zap,
  Palette
} from 'lucide-react'
import Image from 'next/image'

interface User {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar: string
  banner: string
  bio: string
  location: string
  website: string
  role: 'user' | 'admin' | 'designer'
  interests: string[]
  skills: string[]
  isVerified: boolean
  followers: string[]
  following: string[]
  createdAt: string
  postCount: number
}

interface Post {
  _id: string
  author: {
    _id: string
    username: string
    firstName: string
    lastName: string
    avatar: string
  }
  media: Array<{
    type: 'image' | 'video'
    url: string
    thumbnail?: string
  }>
  caption: string
  hashtags: string[]
  likes: string[]
  comments: Array<{
    user: string
    text: string
    createdAt: string
  }>
  createdAt: string
}

export default function CommunityPage() {
  const [users, setUsers] = useState<User[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'designers' | 'trending' | 'recent'>('designers')
  const [followLoading, setFollowLoading] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchCommunityData()
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const userData = await response.json()
        if (userData.success && userData.user) {
          setCurrentUserId(userData.user._id)
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const fetchCommunityData = async () => {
    try {
      setLoading(true)
      const [usersResponse, postsResponse] = await Promise.all([
        fetch('/api/community/users'),
        fetch('/api/community/posts?limit=9')
      ])

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        console.log('Users data:', usersData)
        setUsers(usersData.users || [])
      }

      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        console.log('Posts data:', postsData)
        setPosts(postsData.posts || [])
      }
    } catch (error) {
      console.error('Error fetching community data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string) => {
    if (!currentUserId) {
      console.log('No current user ID available')
      return
    }

    try {
      setFollowLoading(userId)
      
      // Get current follow status before making the request
      const user = users.find(u => u._id === userId)
      const isCurrentlyFollowing = user?.followers?.includes(currentUserId) || false
      
      console.log('Following user:', userId, 'Current status:', isCurrentlyFollowing)

      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Follow API response:', result)
        
        // Update local state based on API response
        setUsers(prev => prev.map(user => {
          if (user._id === userId) {
            const currentFollowers = user.followers || []
            let newFollowers: string[]
            
            if (result.data?.following) {
              // If now following, add current user to followers
              newFollowers = [...currentFollowers, currentUserId]
            } else {
              // If unfollowing, remove current user from followers
              newFollowers = currentFollowers.filter(id => id !== currentUserId)
            }
            
            return { 
              ...user, 
              followers: newFollowers 
            }
          }
          return user
        }))
      } else {
        console.error('Follow API error:', response.status)
        const errorText = await response.text()
        console.error('Error response:', errorText)
      }
    } catch (error) {
      console.error('Error following user:', error)
    } finally {
      setFollowLoading(null)
    }
  }

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase()
    const usernameMatch = user.username?.toLowerCase().includes(query) ?? false
    const firstNameMatch = user.firstName?.toLowerCase().includes(query) ?? false
    const lastNameMatch = user.lastName?.toLowerCase().includes(query) ?? false
    const interestsMatch = user.interests?.some(interest => interest?.toLowerCase().includes(query)) ?? false
    const skillsMatch = user.skills?.some(skill => skill?.toLowerCase().includes(query)) ?? false

    return usernameMatch || firstNameMatch || lastNameMatch || interestsMatch || skillsMatch
  })

  const featuredDesigners = users
    .filter(user => user.role === 'designer')
    .sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0))
    .slice(0, 6)

  const trendingPosts = posts
    .sort((a, b) => (b.likes?.length || 0) + (b.comments?.length || 0) - (a.likes?.length || 0) + (a.comments?.length || 0))
    .slice(0, 9)

  const recentPosts = posts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 9)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20">
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900/20">
      {/* Header */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-purple-600/5" />
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-r from-rose-500 to-purple-600 rounded-2xl shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-4">
              Fashion Community
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Discover talented designers, share your creations, and get inspired
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search designers, skills, interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Members', value: users.length, icon: Users, color: 'from-blue-500 to-cyan-500' },
            { label: 'Designers', value: users.filter(u => u.role === 'designer').length, icon: Palette, color: 'from-purple-500 to-pink-500' },
            { label: 'Designs', value: posts.length, icon: Shirt, color: 'from-rose-500 to-orange-500' },
            { label: 'Connections', value: users.reduce((acc, user) => acc + (user.followers?.length || 0), 0), icon: Zap, color: 'from-green-500 to-emerald-500' }
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{stat.label}</div>
              </div>
            )
          })}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
          {[
            { id: 'designers' as const, label: 'Designers', icon: Sparkles },
            { id: 'trending' as const, label: 'Trending', icon: TrendingUp },
            { id: 'recent' as const, label: 'Recent', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        {activeTab === 'designers' && (
          <div className="space-y-8">
            {/* Featured Designers */}
            {featuredDesigners.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Featured Designers</h2>
                  <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Top Rated
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredDesigners.map((user) => (
                    <UserCard 
                      key={user._id} 
                      user={user} 
                      onFollow={handleFollow}
                      isLoading={followLoading === user._id}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Designers */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {searchQuery ? 'Search Results' : 'Community Members'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                  <UserCard 
                    key={user._id} 
                    user={user} 
                    onFollow={handleFollow}
                    isLoading={followLoading === user._id}
                    currentUserId={currentUserId}
                  />
                ))}
              </div>
              
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                    No users found
                  </h3>
                  <p className="text-slate-500 dark:text-slate-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'No community members yet'}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'trending' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Trending Designs</h2>
              <Badge variant="secondary" className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
                <TrendingUp className="w-3 h-3 mr-1" />
                Popular Now
              </Badge>
            </div>
            {trendingPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  No trending posts yet
                </h3>
                <p className="text-slate-500 dark:text-slate-500">
                  Be the first to create engaging content!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Recent Activity</h2>
            {recentPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  No recent activity
                </h3>
                <p className="text-slate-500 dark:text-slate-500">
                  Share your first design to get started!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// User Card Component
function UserCard({ 
  user, 
  onFollow, 
  isLoading = false,
  currentUserId
}: { 
  user: User; 
  onFollow: (userId: string) => void;
  isLoading?: boolean;
  currentUserId: string | null;
}) {
  const isFollowing = currentUserId ? user.followers?.includes(currentUserId) : false

  const handleFollowClick = () => {
    onFollow(user._id)
  }

  return (
    <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-slate-200 dark:border-slate-700">
      <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 relative">
        {user.banner && (
          <Image
            src={user.banner}
            alt={`${user.firstName}'s banner`}
            fill
            className="object-cover"
            onError={(e) => {
              // Hide broken banner images
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
      </div>
      
      <CardContent className="p-6 -mt-12 relative">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl border-4 border-white dark:border-slate-800 bg-white shadow-lg overflow-hidden">
              <Image
                src={user.avatar || '/default-avatar.png'}
                alt={`${user.firstName} ${user.lastName}`}
                width={64}
                height={64}
                className="object-cover"
                onError={(e) => {
                  // Fallback to default avatar if image fails to load
                  e.currentTarget.src = '/default-avatar.png'
                }}
              />
            </div>
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <Star className="w-3 h-3 text-white fill-white" />
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-1">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
              @{user.username}
            </p>
            {user.role === 'designer' && (
              <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs mb-2">
                Designer
              </Badge>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {user.bio || 'No bio yet'}
            </p>
          </div>

          {/* Location */}
          {user.location && (
            <div className="flex items-center space-x-1 text-xs text-slate-500 mb-4">
              <MapPin className="w-3 h-3" />
              <span>{user.location}</span>
            </div>
          )}

          {/* Stats & Action */}
          <div className="flex items-center justify-between w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-4 text-xs text-slate-500">
              <div className="text-center">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {user.followers?.length || 0}
                </div>
                <div>Followers</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {user.postCount || 0}
                </div>
                <div>Designs</div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Link href={`/profile/${user._id}`}>
                <Button variant="outline" size="sm" className="rounded-lg">
                  View
                </Button>
              </Link>
              {currentUserId && currentUserId !== user._id && (
                <Button 
                  variant={isFollowing ? "outline" : "default"} 
                  size="sm" 
                  className={`rounded-lg min-w-20 ${
                    isFollowing ? '' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  onClick={handleFollowClick}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      {isFollowing ? 'Following' : 'Follow'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Post Card Component
function PostCard({ post }: { post: Post }) {
  return (
    <Card className="rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 border border-slate-200 dark:border-slate-700">
      {post.media.length > 0 ? (
        <div className="aspect-square bg-slate-200 dark:bg-slate-700 relative">
          <Image
            src={post.media[0].url}
            alt="Post media"
            fill
            className="object-cover"
            onError={(e) => {
              // Hide broken images
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      ) : (
        <div className="aspect-square bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <Shirt className="w-12 h-12 text-slate-400" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 mb-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={post.author.avatar || '/default-avatar.png'}
              alt={post.author.username}
              width={32}
              height={32}
              className="object-cover"
              onError={(e) => {
                e.currentTarget.src = '/default-avatar.png'
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {post.author.firstName} {post.author.lastName}
            </p>
            <p className="text-slate-500 text-xs">@{post.author.username}</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-2">
          {post.caption || "Check out this amazing design!"}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Heart className="w-3 h-3" />
              <span>{post.likes?.length || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3" />
              <span>{post.comments?.length || 0}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.hashtags.slice(0, 3).map((tag, index) => (
              <span key={index} className="text-xs text-blue-600 dark:text-blue-400">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}