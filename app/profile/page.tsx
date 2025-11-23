'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ToastAction } from '@/components/ui/toast-action'
import { useToast } from '@/components/ui/use-toast'

import {
  Edit3,
  MapPin,
  Globe,
  Users,
  Camera,
  Shield,
  TrendingUp,
  Zap,
  Sparkles,
  Heart
} from 'lucide-react'

import { useUser } from '@clerk/nextjs'
import Image from 'next/image'

interface UserData {
  _id: string
  username: string
  firstName: string
  lastName: string
  avatar: string
  banner: string
  bio: string
  location: string
  website: string
  role: string
  interests: string[]
  skills: string[]
  isVerified: boolean
  followers: any[]
  following: any[]
  createdAt: string
  stats?: {
    postCount: number
    totalLikes: number
    engagementRate: number
  }
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoaded } = useUser()

  const [userData, setUserData] = useState<UserData | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [optimisticUpdate, setOptimisticUpdate] = useState<Partial<UserData> | null>(null)

  const displayData = useMemo(() => {
    return optimisticUpdate && userData ? { ...userData, ...optimisticUpdate } : userData
  }, [userData, optimisticUpdate])

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      if (!user) return

      setLoading(true)

      const [userResponse, achievementsResponse] = await Promise.all([
        fetch('/api/users/me'),
        fetch('/api/users/me/achievements')
      ])

      if (userResponse.ok) {
        const data = await userResponse.json()
        setUserData(data.user)
      } else if (userResponse.status === 401) {
        router.push('/auth/signin')
        return
      }

      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json()
        setAchievements(achievementsData.achievements || [])
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
      toast({
        title: 'Connection Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
        action: <ToastAction altText="Retry" onClick={fetchUserData}>Retry</ToastAction>
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast, user])

  useEffect(() => {
    if (isLoaded) fetchUserData()
  }, [isLoaded, fetchUserData])

  // Single handleImageUpload function
  const handleImageUpload = async (type: 'avatar' | 'banner', file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('type', type)

    try {
      // Optimistic update
      if (type === 'avatar') setOptimisticUpdate({ avatar: URL.createObjectURL(file) })
      else setOptimisticUpdate({ banner: URL.createObjectURL(file) })

      const response = await fetch('/api/users/me/image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      setUserData(prev => prev ? { ...prev, [type]: data.url } : null)
      setOptimisticUpdate(null)
      
      toast({
        title: "Success!",
        description: `${type === 'avatar' ? 'Profile picture' : 'Banner'} updated successfully`,
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      setOptimisticUpdate(null)
      toast({
        title: "Upload Failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  // Skeleton loader
  const ProfileSkeleton = () => (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="h-64 bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="container mx-auto px-6 -mt-20">
        <Card className="rounded-2xl overflow-hidden mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-6">
              <Skeleton className="w-32 h-32 rounded-2xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (loading) return <ProfileSkeleton />

  if (!displayData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-slate-400 mx-auto" />
          <h1 className="text-2xl font-bold">Profile Unavailable</h1>
          <p className="text-slate-600 dark:text-slate-400">
            We couldn't load your profile information
          </p>
          <div className="space-x-3">
            <Button onClick={fetchUserData}>Retry</Button>
            <Button variant="outline" onClick={() => router.push('/')}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Enhanced Banner with Gradient Overlay */}
      <div className="h-64 bg-gradient-to-r from-rose-100 via-purple-100 to-blue-100 dark:from-rose-900/20 dark:via-purple-900/20 dark:to-blue-900/20 relative group">
        {displayData.banner && (
          <Image
            src={displayData.banner}
            alt="Profile banner"
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Banner Upload Overlay */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload('banner', e.target.files[0])}
            />
            <Button variant="secondary" size="sm" className="rounded-xl backdrop-blur-sm">
              <Camera className="w-4 h-4 mr-2" />
              Change Banner
            </Button>
          </label>
        </div>
      </div>

      <div className="container mx-auto px-6 -mt-20 relative">
        {/* Enhanced Profile Header */}
        <Card className="rounded-2xl overflow-hidden mb-8 border-0 shadow-2xl">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-0 lg:space-x-6">
              {/* Enhanced Avatar with Status */}
              <div className="relative group">
                <div className="relative">
                  <Image
                    src={displayData.avatar || '/default-avatar.png'}
                    alt={`${displayData.firstName} ${displayData.lastName}`}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-800 bg-white shadow-xl"
                  />
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
                </div>
                
                {/* Avatar Upload */}
                <label className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload('avatar', e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl bg-white/90 backdrop-blur-sm shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </label>
              </div>

              {/* Enhanced User Info */}
              <div className="flex-1">
                <div className="flex items-center justify-center lg:justify-start space-x-3 mb-2 flex-wrap gap-2">
                  <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-rose-600 to-purple-600 bg-clip-text text-transparent">
                    {displayData.firstName} {displayData.lastName}
                  </h1>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={displayData.role === 'admin' ? 'default' : 'secondary'} 
                      className="rounded-full"
                    >
                      {displayData.role}
                    </Badge>
                    {displayData.isVerified && (
                      <Badge variant="default" className="rounded-full bg-blue-500 text-white">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-3">
                  @{displayData.username}
                </p>

                <p className="text-slate-700 dark:text-slate-300 max-w-2xl mb-4 leading-relaxed">
                  {displayData.bio || (
                    <span className="text-slate-400 italic">
                      No bio yet. Tell everyone about yourself!
                    </span>
                  )}
                </p>

                {/* Enhanced Stats */}
                <div className="flex items-center justify-center lg:justify-start space-x-6 text-sm text-slate-500 mb-4">
                  {displayData.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{displayData.location}</span>
                    </div>
                  )}
                  {displayData.website && (
                    <div className="flex items-center space-x-1">
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{displayData.followers?.length || 0} followers</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{displayData.following?.length || 0} following</span>
                  </div>
                </div>

                {/* Enhanced Skills & Interests with Animation */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
                  {displayData.skills?.map((skill, index) => (
                    <Badge 
                      key={skill} 
                      variant="secondary" 
                      className="rounded-lg transition-all hover:scale-105 cursor-pointer"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {skill}
                    </Badge>
                  ))}
                  {displayData.interests?.map((interest, index) => (
                    <Badge 
                      key={interest} 
                      variant="outline" 
                      className="rounded-lg transition-all hover:scale-105 cursor-pointer"
                    >
                      <Heart className="w-3 h-3 mr-1" />
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="flex flex-col space-y-3">
                <Button 
                  variant="outline" 
                  className="rounded-xl group"
                  onClick={() => router.push('/profile/edit')}
                >
                  <Edit3 className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
                  Edit Profile
                </Button>
                {displayData.stats && (
                  <Button 
                    variant="ghost" 
                    className="rounded-xl text-xs"
                    onClick={() => router.push('/profile/analytics')}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    View Analytics
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Achievements */}
            {achievements.length > 0 && (
              <Card className="rounded-2xl border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold">Achievements</h3>
                  </div>
                  <div className="space-y-3">
                    {achievements.slice(0, 3).map((achievement) => (
                      <div key={achievement.id} className="flex items-center space-x-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center
                          ${achievement.tier === 'gold' ? 'bg-yellow-100 text-yellow-600' : ''}
                          ${achievement.tier === 'silver' ? 'bg-gray-100 text-gray-600' : ''}
                          ${achievement.tier === 'bronze' ? 'bg-orange-100 text-orange-600' : ''}
                        `}>
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{achievement.name}</div>
                          <div className="text-xs text-slate-500">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced About Card */}
            <Card className="rounded-2xl border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">About</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white mb-1">
                      Member Since
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      {displayData.createdAt && new Date(displayData.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  {displayData.location && (
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white mb-1">
                        Location
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {displayData.location}
                      </div>
                    </div>
                  )}
                  {displayData.website && (
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white mb-1">
                        Website
                      </div>
                      <a 
                        href={displayData.website} 
                        className="text-blue-600 hover:underline flex items-center"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe className="w-3 h-3 mr-1" />
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Main Content */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Recent Activity</h3>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-rose-600" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Your recent activity will appear here
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/create')}
                  >
                    Create Your First Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}