// app/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Edit3,
  MapPin,
  Link,
  Users,
  Camera,
  Shirt,
  Bookmark,
  Palette,
  Heart,
  MessageCircle,
  Share2,
  User
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
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
  role: string
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

interface ApiResponse {
  user: UserData
  success: boolean
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

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: clerkUser, isLoaded } = useUser()

  const [userData, setUserData] = useState<UserData | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [activeTab, setActiveTab] = useState('designs')
  const [loading, setLoading] = useState(true)
  const [imageErrors, setImageErrors] = useState({ avatar: false, banner: false })

  // Fetch user data with proper cleanup
  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      if (!clerkUser || !mounted) return
      
      try {
        setLoading(true)
        
        const [userRes, postsRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/posts?user=me')
        ])

        if (!mounted) return

        if (userRes.ok) {
          const data: ApiResponse = await userRes.json()
          if (data.success && data.user && mounted) {
            console.log('✅ User data loaded:', data.user.username)
            setUserData(data.user)
          } else {
            console.error('❌ User API returned unsuccessful:', data)
            throw new Error('Failed to load user data')
          }
        } else {
          console.error('❌ User API error:', userRes.status)
          throw new Error('Failed to load user data')
        }

        if (postsRes.ok && mounted) {
          const postsData = await postsRes.json()
          setPosts(postsData.posts || postsData.data || [])
        }

      } catch (error) {
        console.error('Error fetching data:', error)
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

    if (isLoaded) {
      if (clerkUser) {
        fetchData()
      } else {
        router.push('/sign-in')
      }
    }

    return () => {
      mounted = false
    }
  }, [clerkUser, isLoaded, toast, router])

  // Handle image upload
  const handleImageUpload = async (type: 'avatar' | 'banner', file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('type', type)

      const response = await fetch('/api/users/me/image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      setUserData(prev => prev ? { ...prev, [type]: data.url } : null)
      setImageErrors(prev => ({ ...prev, [type]: false }))
      
      toast({
        title: "Success!",
        description: `${type === 'avatar' ? 'Profile picture' : 'Banner'} updated successfully`,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: "Please try again with a different image",
        variant: "destructive",
      })
    }
  }

  // Handle post interactions
  const handlePostAction = async (postId: string, action: 'like' | 'save') => {
    if (!clerkUser) {
      router.push('/sign-in')
      return
    }

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
            const userId = clerkUser.id

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
          <h1 className="text-2xl font-semibold">Profile Not Found</h1>
          <p className="text-slate-500">We couldn't load your profile data.</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
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
    { id: 'courses', label: 'Courses', icon: Palette, count: 0 },
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
            alt="Profile banner"
            fill
            className="object-cover"
            priority
            onError={() => setImageErrors(prev => ({ ...prev, banner: true }))}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20" />
        )}
        
        <div className="absolute inset-0 bg-black/5" />
        
        {/* Banner Upload Button */}
        <div className="absolute bottom-4 right-4">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImageUpload('banner', file)
                e.target.value = ''
              }}
            />
            <Button 
              variant="secondary" 
              size="sm" 
              className="rounded-full backdrop-blur-sm bg-white/80 hover:bg-white"
            >
              <Camera className="w-4 h-4" />
            </Button>
          </label>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 pb-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-6 mb-12">
          {/* Avatar with Upload */}
          <div className="relative group">
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
            
            {/* Avatar Upload Button */}
            <label className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload('avatar', file)
                  e.target.value = ''
                }}
              />
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full w-8 h-8 bg-white shadow-lg border"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </label>
          </div>

          {/* User Information */}
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-3">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {userData.firstName} {userData.lastName}
              </h1>
              {userData.isVerified && (
                <Badge variant="secondary" className="rounded-full bg-blue-500 text-white">
                  Verified
                </Badge>
              )}
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              @{userData.username}
            </p>

            <p className="text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed">
              {userData.bio || 'Fashion designer and creative enthusiast. Sharing my journey and inspirations.'}
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
            <Button 
              onClick={() => router.push('/profile/edit')}
              className="rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/create')}
              className="rounded-full border-2"
            >
              <Shirt className="w-4 h-4 mr-2" />
              New Design
            </Button>
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
                    const isLiked = post.likes?.includes(clerkUser?.id || '')
                    const isSaved = post.saves?.includes(clerkUser?.id || '')
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
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                toast({
                                  title: "Share",
                                  description: "Share functionality coming soon!"
                                })
                              }}
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-16 space-y-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                    <Shirt className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">No Designs Yet</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">
                    Start sharing your fashion designs and inspirations with the community.
                  </p>
                  <Button 
                    onClick={() => router.push('/create')}
                    className="rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    <Shirt className="w-4 h-4 mr-2" />
                    Create Your First Design
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Other Tabs */}
          {activeTab === 'saved' && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Bookmark className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">No Saved Items</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Save your favorite designs and courses to find them easily later.
              </p>
              <Button 
                onClick={() => router.push('/explore')}
                variant="outline"
                className="rounded-full"
              >
                Explore Designs
              </Button>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                <Palette className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">No Courses</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Explore fashion design courses to enhance your skills and knowledge.
              </p>
              <Button 
                onClick={() => router.push('/courses')}
                variant="outline"
                className="rounded-full"
              >
                Browse Courses
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}