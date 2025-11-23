//app/community/page.tsx
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
  Globe,
  UserPlus,
  Star,
  Heart,
  MessageCircle,
  Calendar
} from 'lucide-react'

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

  useEffect(() => {
    fetchCommunityData()
  }, [])

  const fetchCommunityData = async () => {
    try {
      setLoading(true)
      const [usersResponse, postsResponse] = await Promise.all([
        fetch('/api/community/users'),
        fetch('/api/community/posts?limit=9')
      ])

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.users || [])
      }

      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        setPosts(postsData.posts || [])
      }
    } catch (error) {
      console.error('Error fetching community data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (userId: string) => {
    try {
      setFollowLoading(userId)
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        
        // Update local state
        setUsers(prev => prev.map(user => {
          if (user._id === userId) {
            const newFollowers = result.following 
              ? [...user.followers, 'current-user'] 
              : user.followers.filter(id => id !== 'current-user')
            
            return { ...user, followers: newFollowers }
          }
          return user
        }))
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
    .sort((a, b) => b.followers.length - a.followers.length)
    .slice(0, 6)

  const trendingPosts = posts
    .sort((a, b) => (b.likes.length + b.comments.length) - (a.likes.length + a.comments.length))
    .slice(0, 9)

  const recentPosts = posts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 9)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center min-h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-rose-100 dark:bg-rose-900/30 rounded-2xl">
                <Users className="w-8 h-8 text-rose-600" />
              </div>
            </div>
            <h1 className="text-4xl font-serif font-bold mb-4">Fashion Community</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
              Connect with designers, share your work, and get inspired by the creative community
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search designers, skills, interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 rounded-2xl border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{users.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Community Members</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {users.filter(u => u.role === 'designer').length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Designers</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{posts.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Designs Shared</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {users.reduce((acc, user) => acc + user.followers.length, 0)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Follows</div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 max-w-md mx-auto">
          {[
            { id: 'designers' as const, label: 'Top Designers', icon: Sparkles },
            { id: 'trending' as const, label: 'Trending', icon: TrendingUp },
            { id: 'recent' as const, label: 'Recent', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content based on active tab */}
        {activeTab === 'designers' && (
          <div className="space-y-8">
            {/* Featured Designers */}
            {featuredDesigners.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-bold">Featured Designers</h2>
                  <Badge variant="secondary" className="rounded-xl">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Top Creators
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredDesigners.map((user) => (
                    <UserCard 
                      key={user._id} 
                      user={user} 
                      onFollow={handleFollow}
                      isLoading={followLoading === user._id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Designers */}
            <section>
              <h2 className="text-2xl font-serif font-bold mb-6">
                {searchQuery ? 'Search Results' : 'All Community Members'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((user) => (
                  <UserCard 
                    key={user._id} 
                    user={user} 
                    onFollow={handleFollow}
                    isLoading={followLoading === user._id}
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
            <h2 className="text-2xl font-serif font-bold mb-6">Trending Designs</h2>
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
            <h2 className="text-2xl font-serif font-bold mb-6">Recent Activity</h2>
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
  isLoading = false 
}: { 
  user: User; 
  onFollow: (userId: string) => void;
  isLoading?: boolean;
}) {
  const isFollowing = user.followers.includes('current-user')

  const handleFollowClick = () => {
    onFollow(user._id)
  }

  return (
    <Card className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
      <div className="h-32 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 relative">
        {user.banner ? (
          <img
            src={user.banner}
            alt={`${user.firstName}'s banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-200 to-pink-200 dark:from-rose-800 dark:to-pink-800" />
        )}
      </div>
      
      <CardContent className="p-6 -mt-16 relative">
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-4">
            <img
              src={user.avatar || '/default-avatar.png'}
              alt={`${user.firstName} ${user.lastName}`}
              className="w-20 h-20 rounded-2xl border-4 border-white dark:border-slate-800 bg-white shadow-lg"
            />
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
              <Badge variant="premium" className="rounded-full text-xs mb-2">
                Fashion Designer
              </Badge>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {user.bio || 'No bio yet'}
            </p>
          </div>

          {/* Location & Website */}
          <div className="flex items-center space-x-4 text-xs text-slate-500 mb-4">
            {user.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{user.location}</span>
              </div>
            )}
            {user.website && (
              <div className="flex items-center space-x-1">
                <Globe className="w-3 h-3" />
                <span>Website</span>
              </div>
            )}
          </div>

          {/* Skills & Interests */}
          <div className="w-full space-y-3">
            {user.skills.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-2">SKILLS</h4>
                <div className="flex flex-wrap gap-1 justify-center">
                  {user.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs rounded-lg">
                      {skill}
                    </Badge>
                  ))}
                  {user.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs rounded-lg">
                      +{user.skills.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {user.interests.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-2">INTERESTS</h4>
                <div className="flex flex-wrap gap-1 justify-center">
                  {user.interests.slice(0, 2).map((interest, index) => (
                    <Badge key={index} variant="secondary" className="text-xs rounded-lg">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats & Action */}
          <div className="flex items-center justify-between w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-4 text-xs text-slate-500">
              <div className="text-center">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {user.followers.length}
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
              <Link href={`/profile/${user.username}`}>
                <Button variant="outline" size="sm" className="rounded-xl">
                  View Profile
                </Button>
              </Link>
              <Button 
                variant={isFollowing ? "outline" : "premium"} 
                size="sm" 
                className="rounded-xl min-w-20"
                onClick={handleFollowClick}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3 mr-1" />
                    {isFollowing ? 'Following' : 'Follow'}
                  </>
                )}
              </Button>
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
    <Card className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
      {post.media.length > 0 ? (
        <div className="aspect-square bg-slate-200 dark:bg-slate-700 relative">
          <img
            src={post.media[0].url}
            alt="Post media"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-square bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-slate-400" />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 mb-3">
          <img
            src={post.author.avatar || '/default-avatar.png'}
            alt={post.author.username}
            className="w-8 h-8 rounded-full"
          />
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
              <span>{post.likes.length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3" />
              <span>{post.comments.length}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {post.hashtags.length > 0 && (
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