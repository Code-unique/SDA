// components/posts/create-post.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Image, X, Upload, Hash } from 'lucide-react'

interface CreatePostProps {
  onPostCreated?: () => void
}

export function CreatePost({ onPostCreated }: CreatePostProps) {
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages = Array.from(files)
    setImages(prev => [...prev, ...newImages])

    // Create preview URLs
    const newPreviews = newImages.map(file => URL.createObjectURL(file))
    setImagePreviews(prev => [...prev, ...newPreviews])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const extractHashtags = (text: string) => {
    const hashtagRegex = /#\w+/g
    const matches = text.match(hashtagRegex)
    return matches ? matches : []
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!caption.trim() || images.length === 0) return

    setIsLoading(true)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('caption', caption)
      formData.append('hashtags', JSON.stringify(extractHashtags(hashtags)))
      
      images.forEach((image, index) => {
        formData.append(`images`, image)
      })

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setCaption('')
        setHashtags('')
        setImages([])
        setImagePreviews([])
        onPostCreated?.()
        router.refresh()
      } else {
        throw new Error('Failed to create post')
      }
    } catch (error) {
      console.error('Error creating post:', error)
      alert('Failed to create post. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Create New Post</CardTitle>
        <CardDescription>
          Share your latest fashion designs with the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Images</label>
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-rose-300 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Click to upload images or drag and drop
                </span>
                <span className="text-xs text-slate-500">
                  PNG, JPG, GIF up to 4MB each
                </span>
              </label>
            </div>
            
            {/* Preview Images */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {imagePreviews.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label htmlFor="caption" className="block text-sm font-medium mb-2">
              Caption
            </label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe your design, inspiration, or creative process..."
              className="rounded-2xl min-h-[100px]"
              required
            />
          </div>

          {/* Hashtags */}
          <div>
            <label htmlFor="hashtags" className="block text-sm font-medium mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Hashtags
            </label>
            <Input
              id="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#fashion #design #sustainable #trending"
              className="rounded-2xl"
            />
            <p className="text-xs text-slate-500 mt-1">
              Separate hashtags with spaces
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !caption.trim() || images.length === 0}
            className="w-full rounded-2xl"
            variant="premium"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Posting...
              </>
            ) : (
              'Share Post'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}