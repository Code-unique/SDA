// components/profile/profile-tabs.tsx
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PostCard } from '@/components/posts/post-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Image, BookOpen, Users, Heart } from 'lucide-react'

interface ProfileTabsProps {
  user: any
  posts: any[]
  isOwnProfile: boolean
}

export function ProfileTabs({ user, posts, isOwnProfile }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState('posts')

  const handleLike = async (postId: string) => {
    // Implement like functionality
  }

  const handleComment = async (postId: string, comment: string) => {
    // Implement comment functionality
  }

  const handleSave = async (postId: string) => {
    // Implement save functionality
  }

  return (
    <div className="mt-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger 
            value="posts" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Image className="w-4 h-4 mr-2" />
            Posts
          </TabsTrigger>
          <TabsTrigger 
            value="courses" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Courses
          </TabsTrigger>
          <TabsTrigger 
            value="followers" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Users className="w-4 h-4 mr-2" />
            Followers
          </TabsTrigger>
          <TabsTrigger 
            value="likes" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Heart className="w-4 h-4 mr-2" />
            Likes
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts" className="space-y-6">
          {posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={handleLike}
                onComment={handleComment}
                onSave={handleSave}
              />
            ))
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="p-12 text-center">
                <Image className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {isOwnProfile ? 'No posts yet' : 'No posts to show'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {isOwnProfile 
                    ? 'Share your first design to start building your portfolio' 
                    : 'This user hasn\'t shared any posts yet'
                  }
                </p>
                {isOwnProfile && (
                  <Button asChild variant="premium">
                    <a href="/dashboard/posts/create">
                      Create First Post
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-slate-500">
                Course management features are coming in the next update
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Followers Tab */}
        <TabsContent value="followers">
          <div className="grid gap-4">
            {user.followers?.map((follower: any) => (
              <Card key={follower._id} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={follower.avatar || '/default-avatar.png'}
                      alt={follower.username}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">
                        {follower.firstName} {follower.lastName}
                      </h4>
                      <p className="text-slate-500 text-sm">
                        @{follower.username}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Follow
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Likes Tab */}
        <TabsContent value="likes">
          <Card className="rounded-2xl">
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-slate-500">
                Liked posts will appear here in the next update
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}