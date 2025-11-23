// app/profile/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MapPin, 
  Globe, 
  Users, 
  UserPlus, 
  Mail, 
  Star,
  Camera,
  Edit3,
  Share2
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

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
  followers: any[]
  following: any[]
  createdAt: string
}

interface Post {
  _id: string
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

export default function ProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const { toast } = useToast()
  
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchProfileData()
    }
  }, [userId])

  const fetchProfileData = async () => {
    try {
      setLoading(true)
      
      const [userResponse, postsResponse] = await Promise.all([
        fetch(`/api/users/${userId}`),
        fetch(`/api/users/${userId}/posts`)
      ])

      // Handle user response with consistent format
      if (userResponse.ok) {
        const userData = await userResponse.json()
        console.log('📦 User API Response:', userData)
        
        if (userData.success) {
          setUser(userData.data.user)
          setIsFollowing(userData.data.isFollowing)
          console.log('✅ User data loaded, isFollowing:', userData.data.isFollowing)
        } else {
          console.log('❌ User API returned success: false')
          setUser(null)
        }
      } else if (userResponse.status === 404) {
        console.log('❌ User not found')
        setUser(null)
      } else {
        console.log('❌ User API error status:', userResponse.status)
        setUser(null)
      }

      // Handle posts response
      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        console.log('📦 Posts API Response:', postsData)
        
        if (postsData.success) {
          setPosts(postsData.data?.posts || postsData.data || postsData.posts || [])
        } else {
          setPosts([])
        }
      } else {
        console.log('❌ Posts API error status:', postsResponse.status)
        setPosts([])
      }

      // Check if current user
      await checkIfCurrentUser()

    } catch (error) {
      console.error('❌ Error fetching profile data:', error)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const checkIfCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const currentUserData = await response.json()
        console.log('👤 Current user data:', currentUserData)
        
        if (currentUserData.success) {
          const currentUserId = currentUserData.data?.user?._id || currentUserData.user?._id
          setIsCurrentUser(currentUserId === userId)
          console.log('🆔 Is current user:', currentUserId === userId)
        }
      }
    } catch (error) {
      console.error('Error checking current user:', error)
    }
  }

  const handleFollow = async () => {
    if (!user || followLoading) return

    try {
      setFollowLoading(true)
      
      // Optimistic update
      const previousIsFollowing = isFollowing
      const previousFollowers = user.followers.length
      
      setIsFollowing(!isFollowing)
      setUser(prev => prev ? {
        ...prev,
        followers: isFollowing 
          ? prev.followers.slice(0, -1)
          : [...prev.followers, { _id: 'temp', username: 'temp', firstName: 'Temp', lastName: 'User', avatar: '' }]
      } : null)

      console.log('🔄 Sending follow request...')
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      console.log('📨 Follow API Response:', result)

      if (response.ok && result.success) {
        // Success - update with real data
        setIsFollowing(result.data.following)
        
        // Refetch user data to get accurate follower count
        console.log('🔄 Refetching user data...')
        const userResponse = await fetch(`/api/users/${userId}`)
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.success) {
            setUser(userData.data.user)
            console.log('✅ User data updated with fresh data')
          }
        }

        toast({
          title: result.data.following ? "Following" : "Unfollowed",
          description: result.data.following 
            ? `You are now following ${user.firstName}` 
            : `You unfollowed ${user.firstName}`
        })
      } else {
        // Revert optimistic update on error
        console.log('❌ Follow API error, reverting optimistic update')
        setIsFollowing(previousIsFollowing)
        setUser(prev => prev ? {
          ...prev,
          followers: previousIsFollowing 
            ? [...prev.followers]
            : prev.followers.filter(f => f._id !== 'temp')
        } : null)
        
        toast({
          title: "Error",
          description: result.error || "Failed to update follow status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Network error following user:', error)
      toast({
        title: "Error",
        description: "Network error occurred",
        variant: "destructive"
      })
    } finally {
      setFollowLoading(false)
    }
  }

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

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              User Not Found
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              The user doesn't exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Banner */}
      <div className="h-64 bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/20 dark:to-pink-900/20 relative">
        {user.banner && (
          <img
            src={user.banner}
            alt={`${user.firstName}'s banner`}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      <div className="container mx-auto px-6 -mt-20 relative">
        {/* Profile Header */}
        <Card className="rounded-2xl overflow-hidden mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-4 lg:space-y-0 lg:space-x-6 mb-6 lg:mb-0">
                <div className="relative">
                  <img
                    src={user.avatar || '/default-avatar.png'}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-800 bg-white shadow-xl"
                  />
                  {user.isVerified && (
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1">
                      <Star className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-center lg:justify-start space-x-2 mb-2">
                    <h1 className="text-3xl font-serif font-bold">
                      {user.firstName} {user.lastName}
                    </h1>
                    {user.role === 'designer' && (
                      <Badge variant="secondary" className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                        Fashion Designer
                      </Badge>
                    )}
                    {user.role === 'admin' && (
                      <Badge variant="default" className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        Admin
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 text-lg mb-3">
                    @{user.username}
                  </p>

                  <p className="text-slate-700 dark:text-slate-300 max-w-md mb-4">
                    {user.bio || 'No bio yet.'}
                  </p>

                  <div className="flex items-center justify-center lg:justify-start space-x-4 text-sm text-slate-500">
                    {user.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.website && (
                      <div className="flex items-center space-x-1">
                        <Globe className="w-4 h-4" />
                        <a 
                          href={user.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Website
                        </a>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <Mail className="w-4 h-4 mr-2" />
                  Message
                </Button>
                {!isCurrentUser && (
                  <Button 
                    variant={isFollowing ? "outline" : "default"} 
                    size="sm" 
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
                  </Button>
                )}
                {isCurrentUser && (
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Followers</span>
                  <span className="font-semibold">{user.followers?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Following</span>
                  <span className="font-semibold">{user.following?.length || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Posts</span>
                  <span className="font-semibold">{posts.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            {user.skills && user.skills.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="rounded-lg">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interests */}
            {user.interests && user.interests.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <Badge key={index} variant="outline" className="rounded-lg">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="posts" className="space-y-6">
              <TabsList className="rounded-2xl p-1 bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Camera className="w-4 h-4 mr-2" />
                  Posts ({posts.length})
                </TabsTrigger>
                <TabsTrigger value="about" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700">
                  <Edit3 className="w-4 h-4 mr-2" />
                  About
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts">
                {posts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                      <Card key={post._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300">
                        {post.media.length > 0 && (
                          <div className="aspect-square bg-slate-200 dark:bg-slate-700">
                            <img
                              src={post.media[0].url}
                              alt="Post media"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 mb-2">
                            {post.caption}
                          </p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{post.likes.length} likes</span>
                            <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="rounded-2xl">
                    <CardContent className="p-12 text-center">
                      <Camera className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        No posts yet
                      </h3>
                      <p className="text-slate-500 dark:text-slate-500">
                        {user.firstName} hasn't shared any posts yet.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="about">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>About {user.firstName}</CardTitle>
                    <CardDescription>
                      Learn more about {user.firstName}'s background and interests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-2">Bio</h4>
                      <p className="text-slate-700 dark:text-slate-300">
                        {user.bio || 'No bio provided.'}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {user.location && (
                        <div>
                          <h4 className="font-semibold mb-2">Location</h4>
                          <p className="text-slate-600 dark:text-slate-400 flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {user.location}
                          </p>
                        </div>
                      )}
                      
                      {user.website && (
                        <div>
                          <h4 className="font-semibold mb-2">Website</h4>
                          <a 
                            href={user.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 flex items-center hover:underline"
                          >
                            <Globe className="w-4 h-4 mr-2" />
                            Visit Website
                          </a>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Member Since</h4>
                      <p className="text-slate-600 dark:text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}