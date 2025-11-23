// app/dashboard/posts/create/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreatePost } from '@/components/posts/create-post'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function CreatePostPage() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const handlePostCreated = () => {
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-2xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        
      </div>

      {/* Create Post Form */}
      <CreatePost onPostCreated={handlePostCreated} />

      {/* Tips Card */}
      <Card className="rounded-2xl mt-6">
        <CardHeader>
          <CardTitle>Posting Tips</CardTitle>
          <CardDescription>
            Make your posts stand out
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-600 text-sm font-bold">1</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Use high-quality images that showcase your designs clearly
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-600 text-sm font-bold">2</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Add relevant hashtags to reach more people (#fashion #design #style)
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-600 text-sm font-bold">3</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Write engaging captions that tell the story behind your design
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}