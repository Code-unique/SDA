//app/designer/portfolio/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Eye, Heart, MessageCircle } from 'lucide-react'

interface Design {
  _id: string
  title: string
  description: string
  image: string
  likes: number
  comments: number
  views: number
  createdAt: string
}

export default function DesignerPortfolioPage() {
  const [designs, setDesigns] = useState<Design[]>([])

  useEffect(() => {
    // Mock data - replace with actual API call
    setDesigns([
      {
        _id: '1',
        title: 'Summer Collection 2024',
        description: 'Inspired by Mediterranean coastlines',
        image: '/api/placeholder/400/500',
        likes: 124,
        comments: 23,
        views: 1500,
        createdAt: '2024-01-15'
      },
      {
        _id: '2',
        title: 'Urban Streetwear',
        description: 'Bold patterns and comfortable fabrics',
        image: '/api/placeholder/400/500',
        likes: 89,
        comments: 15,
        views: 980,
        createdAt: '2024-01-10'
      }
    ])
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold">My Portfolio</h1>
            <p className="text-slate-600 dark:text-slate-400">
              Showcase your fashion designs and creations
            </p>
          </div>
          <Button className="rounded-2xl">
            <Plus className="w-4 h-4 mr-2" />
            New Design
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">{designs.length}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Designs</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {designs.reduce((acc, design) => acc + design.likes, 0)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Likes</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {designs.reduce((acc, design) => acc + design.comments, 0)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Comments</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-rose-600">
                {designs.reduce((acc, design) => acc + design.views, 0)}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Views</div>
            </CardContent>
          </Card>
        </div>

        {/* Designs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <Card key={design._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
              <div className="aspect-square bg-slate-200 dark:bg-slate-700">
                <img
                  src={design.image}
                  alt={design.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2">{design.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                  {design.description}
                </p>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{design.likes}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{design.comments}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>{design.views}</span>
                    </div>
                  </div>
                  <span className="text-xs">
                    {new Date(design.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}