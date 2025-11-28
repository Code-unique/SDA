// app/profile/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  MapPin,
  Link,
  Users,
  UserPlus,
  Mail,
  Camera,
  Edit3,
  Share2,
  User,
  Shirt,
  Bookmark,
  Palette,
  Heart,
  MessageCircle
} from 'lucide-react'
import Image from 'next/image'

interface UserData {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar?: string
  banner?: string
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
  title: string
  media: Array<{
    url: string
  }>
  likes: string[]
  comments: any[]
  saves: string[]
  createdAt: string
}

interface UserApiResponse {
  success: boolean
  data: {
    user: UserData
    isFollowing: boolean
  }
  error?: string
}

interface PostsApiResponse {
  success: boolean
  posts: Post[]
  data?: Post[]
}

// Safe avatar placeholder component
const AvatarPlaceholder = () => (
  <div className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 shadow-lg flex items-center justify-center">
    <User className="w-16 h-16 text-slate-400" />
  </div>
)

// Helper function to get safe image URL
const getSafeImageUrl = (url: string | undefined): string => {
  if (!url) return ''
  return url
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const userId = params.id as string
  const [userData, setUserData] = useState<UserData | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isCurrentUser, setIsCurrentUser] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('designs')
  const [imageErrors, setImageErrors] = useState({ avatar: false, banner: false })

  // Fetch profile data with proper cleanup
  useEffect(() => {
    let mounted = true

    const fetchProfileData = async () => {
      if (!userId || !mounted) return
      
      try {
        setLoading(true)
        
        const [userResponse, postsResponse] = await Promise.all([
          fetch(`/api/users/${userId}`),
          fetch(`/api/users/${userId}/posts`)
        ])

        if (!mounted) return

        // Handle user response - FIXED: Access nested data structure
        if (userResponse.ok) {
          const data: UserApiResponse = await userResponse.json()
          console.log('📦 User API Response:', data)
          
          if (data.success && data.data && data.data.user && mounted) {
            console.log('✅ User profile data loaded:', data.data.user.username)
            setUserData(data.data.user)
            setIsFollowing(data.data.isFollowing || false)
          } else {
            console.log('❌ User API returned unsuccessful:', data.error)
            setUserData(null)
          }
        } else if (userResponse.status === 404) {
          console.log('❌ User not found')
          setUserData(null)
        } else {
          console.log('❌ User API error status:', userResponse.status)
          setUserData(null)
        }

        // Handle posts response
        if (postsResponse.ok && mounted) {
          const postsData: PostsApiResponse = await postsResponse.json()
          console.log('✅ Posts data loaded:', postsData)
          setPosts(postsData.posts || postsData.data || [])
        }

        // Check if current user
        await checkIfCurrentUser()

      } catch (error) {
        console.error('❌ Error fetching profile data:', error)
        if (mounted) {
          toast({
            title: "Connection Error",
            description: "Failed to load profile data",
            variant: "destructive"
          })
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    if (userId) {
      fetchProfileData()
    }

    return () => {
      mounted = false
    }
  }, [userId, toast])

  const checkIfCurrentUser = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const currentUserData = await response.json()
        console.log('👤 Current user data:', currentUserData)
        
        if (currentUserData.success && currentUserData.user) {
          const currentUserId = currentUserData.user._id
          setIsCurrentUser(currentUserId === userId)
          console.log('🆔 Is current user:', currentUserId === userId)
        }
      }
    } catch (error) {
      console.error('Error checking current user:', error)
    }
  }

  const handleFollow = async () => {
    if (!userData || followLoading) return

    try {
      setFollowLoading(true)
      
      // Optimistic update
      const previousIsFollowing = isFollowing
      const previousFollowers = userData.followers.length
      
      setIsFollowing(!isFollowing)
      setUserData(prev => prev ? {
        ...prev,
        followers: isFollowing 
          ? prev.followers.slice(0, -1)
          : [...prev.followers, { _id: 'temp', username: 'temp', firstName: 'Temp', lastName: 'User', avatar: '' }]
      } : null)

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
        const userResponse = await fetch(`/api/users/${userId}`)
        if (userResponse.ok) {
          const userData: UserApiResponse = await userResponse.json()
          if (userData.success && userData.data) {
            setUserData(userData.data.user)
            console.log('✅ User data updated with fresh data')
          }
        }

        toast({
          title: result.data.following ? "Following" : "Unfollowed",
          description: result.data.following 
            ? `You are now following ${userData.firstName}` 
            : `You unfollowed ${userData.firstName}`
        })
      } else {
        // Revert optimistic update on error
        console.log('❌ Follow API error, reverting optimistic update')
        setIsFollowing(previousIsFollowing)
        setUserData(prev => prev ? {
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

  // Handle post interactions
  const handlePostAction = async (postId: string, action: 'like' | 'save') => {
    try {
      const response = await fetch(`/api/posts/${postId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setPosts(prev => prev.map(post => {
          if (post._id === postId) {
            const currentLikes = post.likes || []
            const currentSaves = post.saves || []

            if (action === 'like') {
              const isLiked = currentLikes.includes(userId)
              return {
                ...post,
                likes: isLiked 
                  ? currentLikes.filter(id => id !== userId)
                  : [...currentLikes, userId]
              }
            } else if (action === 'save') {
              const isSaved = currentSaves.includes(userId)
              return {
                ...post,
                saves: isSaved 
                  ? currentSaves.filter(id => id !== userId)
                  : [...currentSaves, userId]
              }
            }
          }
          return post
        }))
      }
    } catch (error) {
      console.error(`Error ${action}ing post:`, error)
      toast({
        title: "Error",
        description: `Failed to ${action} post`,
        variant: "destructive",
      })
    }
  }

  // Enhanced skeleton loader
  const ProfileSkeleton = () => (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <Skeleton className="h-64 w-full bg-slate-200 dark:bg-slate-800" />
      <div className="max-w-4xl mx-auto px-4 -mt-20">
        <div className="flex flex-col items-center space-y-6">
          <Skeleton className="w-32 h-32 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="text-center space-y-3">
            <Skeleton className="h-8 w-64 bg-slate-300 dark:bg-slate-700" />
            <Skeleton className="h-4 w-48 bg-slate-300 dark:bg-slate-700" />
            <Skeleton className="h-16 w-96 max-w-full bg-slate-300 dark:bg-slate-700" />
          </div>
          <div className="flex space-x-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <Skeleton className="h-7 w-8 bg-slate-300 dark:bg-slate-700 mb-1" />
                <Skeleton className="h-4 w-16 bg-slate-300 dark:bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) return <ProfileSkeleton />

  if (!userData) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-semibold">User Not Found</h1>
          <p className="text-slate-500">This user doesn't exist or has been removed.</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Designs', value: posts.length, icon: Shirt },
    { label: 'Followers', value: userData.followers?.length || 0, icon: Users },
    { label: 'Following', value: userData.following?.length || 0, icon: Users },
  ]

  const tabs = [
    { id: 'designs', label: 'Designs', icon: Shirt, count: posts.length },
    { id: 'saved', label: 'Saved', icon: Bookmark, count: 0 },
    { id: 'about', label: 'About', icon: User, count: 0 },
  ]

  // Safe image URL checks
  const bannerUrl = getSafeImageUrl(userData.banner)
  const hasValidBanner = bannerUrl && !imageErrors.banner

  const avatarUrl = getSafeImageUrl(userData.avatar)
  const hasValidAvatar = avatarUrl && !imageErrors.avatar

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Banner Section */}
      <div className="h-64 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 relative overflow-hidden">
        {hasValidBanner ? (
          <Image
            src={bannerUrl}
            alt={`${userData.firstName}'s banner`}
            fill
            className="object-cover"
            priority
            onError={() => setImageErrors(prev => ({ ...prev, banner: true }))}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20" />
        )}
        
        <div className="absolute inset-0 bg-black/5" />
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 pb-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-6 mb-12">
          {/* Avatar */}
          <div className="relative">
            {hasValidAvatar ? (
              <div className="relative w-32 h-32 rounded-full border-4 border-white dark:border-slate-950 bg-white shadow-lg overflow-hidden">
                <Image
                  src={avatarUrl}
                  alt={`${userData.firstName} ${userData.lastName}`}
                  width={128}
                  height={128}
                  className="object-cover"
                  priority
                  onError={() => setImageErrors(prev => ({ ...prev, avatar: true }))}
                />
              </div>
            ) : (
              <AvatarPlaceholder />
            )}
            
            {userData.isVerified && (
              <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* User Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {userData.firstName} {userData.lastName}
              </h1>
              {userData.role === 'designer' && (
                <Badge className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  Fashion Designer
                </Badge>
              )}
              {userData.role === 'admin' && (
                <Badge className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  Admin
                </Badge>
              )}
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              @{userData.username}
            </p>

            <p className="text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed">
              {userData.bio || 'No bio yet.'}
            </p>

            {/* Location & Website */}
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-500 flex-wrap gap-2">
              {userData.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{userData.location}</span>
                </div>
              )}
              {userData.website && (
                <div className="flex items-center space-x-1">
                  <Link className="w-4 h-4" />
                  <a 
                    href={userData.website.startsWith('http') ? userData.website : `https://${userData.website}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {userData.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>Joined {new Date(userData.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center group cursor-pointer">
                <div className="flex items-center justify-center space-x-2">
                  <stat.icon className="w-4 h-4 text-slate-400" />
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                </div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 pt-4">
            <Button variant="outline" size="sm" className="rounded-full">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="rounded-full">
              <Mail className="w-4 h-4 mr-2" />
              Message
            </Button>
            {!isCurrentUser && (
              <Button 
                variant={isFollowing ? "outline" : "default"} 
                size="sm" 
                className={`rounded-full ${
                  isFollowing 
                    ? 'border-2' 
                    : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
                }`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {followLoading ? '...' : (isFollowing ? 'Following' : 'Follow')}
              </Button>
            )}
            {isCurrentUser && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full"
                onClick={() => router.push('/profile/edit')}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="space-y-8">
          {/* Tab Navigation */}
          <div className="flex items-center justify-center space-x-1 border-b border-slate-200 dark:border-slate-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-medium'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full min-w-6">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Designs Grid */}
          {activeTab === 'designs' && (
            <div>
              {posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.map((post) => {
                    const isLiked = post.likes?.includes(userId)
                    const isSaved = post.saves?.includes(userId)
                    const postImageUrl = post.media[0]?.url
                    
                    return (
                      <Card key={post._id} className="rounded-2xl overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer">
                        <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                          {postImageUrl ? (
                            <Image
                              src={postImageUrl}
                              alt={post.title || 'Design post'}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Shirt className="w-12 h-12 text-slate-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          
                          {/* Action Buttons */}
                          {!isCurrentUser && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 space-y-2">
                              <Button
                                size="icon"
                                variant="secondary"
                                className={`rounded-full w-8 h-8 backdrop-blur-sm ${
                                  isLiked ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-white/90 hover:bg-white'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePostAction(post._id, 'like')
                                }}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className={`rounded-full w-8 h-8 backdrop-blur-sm ${
                                  isSaved ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white/90 hover:bg-white'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePostAction(post._id, 'save')
                                }}
                              >
                                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <CardContent className="p-4">
                          <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1 mb-2">
                            {post.title || 'Untitled Design'}
                          </h3>
                          <div className="flex items-center justify-between text-sm text-slate-500">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <Heart className="w-4 h-4" />
                                <span>{post.likes?.length || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4" />
                                <span>{post.comments?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card className="rounded-2xl border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Shirt className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                      No Designs Yet
                    </h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                      {userData.firstName} hasn't shared any designs yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Stats */}
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Stats</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Followers</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{userData.followers?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Following</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{userData.following?.length || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-400">Designs</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{posts.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Skills */}
                {userData.skills && userData.skills.length > 0 && (
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {userData.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="rounded-lg">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Interests */}
                {userData.interests && userData.interests.length > 0 && (
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {userData.interests.map((interest, index) => (
                          <Badge key={index} variant="outline" className="rounded-lg">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Main About Content */}
              <div className="lg:col-span-2">
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">About {userData.firstName}</h3>
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Bio</h4>
                        <p className="text-slate-700 dark:text-slate-300">
                          {userData.bio || 'No bio provided.'}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {userData.location && (
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Location</h4>
                            <p className="text-slate-600 dark:text-slate-400 flex items-center">
                              <MapPin className="w-4 h-4 mr-2" />
                              {userData.location}
                            </p>
                          </div>
                        )}
                        
                        {userData.website && (
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Website</h4>
                            <a 
                              href={userData.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-blue-400 flex items-center hover:underline"
                            >
                              <Link className="w-4 h-4 mr-2" />
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Member Since</h4>
                        <p className="text-slate-600 dark:text-slate-400">
                          {new Date(userData.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}