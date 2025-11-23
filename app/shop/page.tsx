//app/shop/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, ShoppingCart, Star, Heart } from 'lucide-react'

interface Product {
  _id: string
  name: string
  description: string
  price: number
  image: string
  designer: {
    username: string
    avatar: string
  }
  category: string
  rating: number
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data - replace with actual API call
    setProducts([
      {
        _id: '1',
        name: 'Sustainable Cotton Dress',
        description: 'Eco-friendly summer dress made from organic cotton',
        price: 89.99,
        image: '/api/placeholder/400/500',
        designer: { username: 'sarahchen', avatar: '/avatars/sarah.jpg' },
        category: 'dresses',
        rating: 4.8
      },
      {
        _id: '2',
        name: 'Handcrafted Leather Bag',
        description: 'Artisanal leather bag with unique patterns',
        price: 149.99,
        image: '/api/placeholder/400/500',
        designer: { username: 'marcusrivera', avatar: '/avatars/marcus.jpg' },
        category: 'accessories',
        rating: 4.9
      }
    ])
    setLoading(false)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif font-bold mb-4">Fashion Marketplace</h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Discover unique fashion pieces from independent designers
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search products, designers, categories..."
                  className="pl-10 rounded-2xl"
                />
              </div>
              <Button variant="outline" className="rounded-2xl">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-shadow">
              <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 relative">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-xl"
                >
                  <Heart className="w-4 h-4" />
                </Button>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <span className="text-2xl font-bold text-rose-600">${product.price}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img
                      src={product.designer.avatar}
                      alt={product.designer.username}
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm text-slate-500">@{product.designer.username}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{product.rating}</span>
                  </div>
                </div>
                <Button className="w-full mt-4 rounded-xl">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}