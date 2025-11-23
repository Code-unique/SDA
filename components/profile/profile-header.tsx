// components/profile/profile-header.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { User, MapPin, Link as LinkIcon, Calendar, Users, Edit, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ProfileHeaderProps {
  user: any
  isOwnProfile: boolean
  currentUserId?: string
}

export function ProfileHeader({ user, isOwnProfile, currentUserId }: ProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(
    user.followers?.some((follower: any) => follower._id.toString() === currentUserId) || false
  )
  const [followersCount, setFollowersCount] = useState(user.followers?.length || 0)

  const handleFollow = async () => {
    try {
      const response = await fetch(`/api/users/${user._id}/follow`, {
        method: 'POST',
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        setFollowersCount((prev: number) => isFollowing ? prev - 1 : prev + 1)
      }
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
      {/* Banner */}
      <div className="h-48 bg-gradient-to-r from-rose-500 to-pink-500 relative">
        {user.banner && (
          <img
            src={user.banner}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Edit banner button for own profile */}
        {isOwnProfile && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 rounded-xl backdrop-blur-sm bg-white/20 text-white border-white/30 hover:bg-white/30"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Cover
          </Button>
        )}
      </div>

      {/* Profile info */}
      <div className="px-6 pb-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between -mt-16 relative">
          {/* Avatar and basic info */}
          <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              <img
                src={user.avatar || '/default-avatar.png'}
                alt={user.username}
                className="w-32 h-32 rounded-2xl border-4 border-white dark:border-slate-800 bg-white object-cover"
              />
              {isOwnProfile && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute -bottom-2 -right-2 rounded-xl border-2 border-white dark:border-slate-800 bg-slate-100 hover:bg-slate-200"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-serif font-bold">
                  {user.firstName} {user.lastName}
                </h1>
                {user.role === 'admin' && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full text-xs font-medium flex items-center">
                    <User className="w-3 h-3 mr-1" />
                    Admin
                  </span>
                )}
                {user.role === 'designer' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-medium flex items-center">
                    <Edit className="w-3 h-3 mr-1" />
                    Designer
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                @{user.username}
              </p>
              
              {/* Stats */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">{followersCount}</span>
                  <span className="text-slate-500">Followers</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">{user.following?.length || 0}</span>
                  <span className="text-slate-500">Following</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">
                    Joined {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            {isOwnProfile ? (
              <Button variant="outline" className="rounded-2xl">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button 
                  variant={isFollowing ? "outline" : "premium"} 
                  className="rounded-2xl"
                  onClick={handleFollow}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button variant="outline" className="rounded-2xl">
                  <Mail className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Bio and details */}
        <div className="mt-6 space-y-4">
          {user.bio && (
            <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">
              {user.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            {user.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{user.location}</span>
              </div>
            )}
            
            {user.website && (
              <div className="flex items-center space-x-1">
                <LinkIcon className="w-4 h-4" />
                <a 
                  href={user.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-rose-600 hover:text-rose-700"
                >
                  {user.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Interests and Skills */}
          {(user.interests?.length > 0 || user.skills?.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {user.interests?.map((interest: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
              {user.skills?.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}