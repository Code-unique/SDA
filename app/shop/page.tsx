'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, ShoppingCart, Star, Heart, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { useCart } from '@/lib/cart-context'

interface Product {
  _id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  designer?: {
    username: string
    avatar: string
  }
  category: string
  rating: number
  reviews: number
  stock: number
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false) // NEW: Hide filters by default
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const { addToCart, getCartCount } = useCart()

  useEffect(() => {
    fetchProducts()
  }, [page, category, sortBy])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        sort: sortBy,
        ...(category && { category }),
        ...(searchTerm && { search: searchTerm })
      })

      const res = await fetch(`/api/products?${params}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch products')
      }
      
      const data = await res.json()
      
      // Transform data to ensure all required fields exist
      const transformedProducts = (data.products || []).map((product: any) => ({
        _id: product._id || Math.random().toString(),
        name: product.name || 'Unnamed Product',
        description: product.description || 'No description available',
        price: product.price || 0,
        originalPrice: product.originalPrice,
        images: product.images || ['/api/placeholder/400/500'],
        designer: product.designer || { 
          username: 'Designer', 
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (product.name || 'Product')
        },
        category: product.category || 'uncategorized',
        rating: product.rating || 0,
        reviews: product.reviews || 0,
        stock: product.stock || 0,
      }))
      
      setProducts(transformedProducts)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchProducts()
  }

  const handleAddToCart = (product: Product) => {
    if (!isSignedIn) {
      router.push('/sign-in')
      return
    }

    // FIXED: Added the required quantity property
    addToCart({
      _id: product._id,
      name: product.name,
      price: product.price,
      images: product.images,
      stock: product.stock,
      quantity: 1, // Added this required property
      designer: product.designer
    })
  }

  const categories = [
    'All', 'dresses', 'tops', 'bottoms', 'outerwear', 
    'accessories', 'shoes', 'bags', 'jewelry'
  ]

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
  ]

  // Get safe image URL
  const getSafeImageUrl = (images: string[]) => {
    if (images && images.length > 0 && images[0]) {
      return images[0]
    }
    return `/api/placeholder/400/500`
  }

  // Get safe designer info
  const getSafeDesigner = (product: Product) => {
    return {
      username: product.designer?.username || 'Designer',
      avatar: product.designer?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${product.name}`
    }
  }

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

        {/* Cart Button */}
        <div className="fixed top-4 right-4 z-50">
          <Button 
            variant="outline" 
            size="icon" 
            className="relative bg-white shadow-lg rounded-full w-12 h-12"
            onClick={() => router.push('/cart')}
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {getCartCount()}
            </span>
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="rounded-2xl mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col space-y-4">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search products, designers, categories..."
                    className="pl-10 rounded-2xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="rounded-2xl">
                  Search
                </Button>
              </form>

              {/* Sort and Filter Toggle */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Filter Toggle Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                    {showFilters ? (
                      <ChevronUp className="w-4 h-4 ml-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </Button>

                  {/* Sort Dropdown */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48 rounded-full">
                      <SlidersHorizontal className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Results Count */}
                {!loading && products.length > 0 && (
                  <div className="text-sm text-slate-600">
                    Showing {products.length} products
                  </div>
                )}
              </div>

              {/* Collapsible Filters Section */}
              {showFilters && (
                <div className="border-t pt-6 mt-4 space-y-6 animate-in fade-in duration-300">
                  {/* Category Filters */}
                  <div>
                    <h3 className="font-medium mb-3 text-slate-700">Categories</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2">
                      {categories.map(cat => (
                        <Button
                          key={cat}
                          variant={category === (cat === 'All' ? '' : cat) ? "default" : "outline"}
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            setCategory(cat === 'All' ? '' : cat)
                            setPage(1)
                          }}
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Active Filters Display */}
                  {(category || searchTerm) && (
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {searchTerm && (
                            <Badge className="px-3 py-1">
                              Search: "{searchTerm}"
                              <button
                                onClick={() => setSearchTerm('')}
                                className="ml-2 hover:text-red-500"
                              >
                                ×
                              </button>
                            </Badge>
                          )}
                          {category && category !== 'All' && (
                            <Badge className="px-3 py-1">
                              Category: {category}
                              <button
                                onClick={() => setCategory('')}
                                className="ml-2 hover:text-red-500"
                              >
                                ×
                              </button>
                            </Badge>
                          )}
                        </div>
                        {(category || searchTerm) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-500 hover:text-rose-600"
                            onClick={() => {
                              setSearchTerm('')
                              setCategory('')
                              setPage(1)
                            }}
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                      <div className="font-semibold text-rose-600">
                        {products.filter(p => p.stock > 0).length}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">In Stock</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="font-semibold text-blue-600">
                        {products.filter(p => p.originalPrice && p.originalPrice > p.price).length}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">On Sale</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <div className="font-semibold text-emerald-600">
                        {Math.max(...products.map(p => p.rating)) || 0}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">Top Rating</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="font-semibold text-purple-600">
                        {categories.length}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400">Categories</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 text-slate-300">
              <Search className="w-full h-full" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm || category 
                ? 'Try changing your search criteria' 
                : 'No products available yet. Check back soon!'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              {(searchTerm || category) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('')
                    setCategory('')
                    setPage(1)
                    setShowFilters(true)
                  }}
                >
                  Clear Filters
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Show All Filters
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Products Count and Filter Toggle for Mobile */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
              <div className="text-slate-600 dark:text-slate-400 mb-4 sm:mb-0">
                {searchTerm 
                  ? `Found ${products.length} results for "${searchTerm}"`
                  : category 
                    ? `${products.length} products in ${category}`
                    : `${products.length} products available`
                }
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Hide Filters
                  </>
                ) : (
                  <>
                    <Filter className="w-4 h-4" />
                    Show Filters
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const designer = getSafeDesigner(product)
                const imageUrl = getSafeImageUrl(product.images)
                const hasDiscount = product.originalPrice && product.originalPrice > product.price
                const discountPercent = hasDiscount 
                  ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
                  : 0
                
                return (
                  <Card key={product._id} className="rounded-2xl overflow-hidden hover:shadow-xl transition-shadow group">
                    <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `/api/placeholder/400/500?text=${encodeURIComponent(product.name)}`
                        }}
                      />
                      
                      {/* Wishlist Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-xl backdrop-blur-sm"
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                      
                      {/* Discount Badge */}
                      {hasDiscount && (
                        <Badge className="absolute top-2 left-2 bg-rose-600 text-white border-0">
                          {discountPercent}% OFF
                        </Badge>
                      )}
                      
                      {/* Stock Status Overlay */}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Badge className="bg-white text-red-600 border-0 px-4 py-2 text-sm">
                            Out of Stock
                          </Badge>
                        </div>
                      )}
                      {product.stock > 0 && product.stock < 10 && (
                        <div className="absolute bottom-2 left-2">
                          <Badge className="bg-amber-100 text-amber-800 border-0">
                            Only {product.stock} left
                          </Badge>
                        </div>
                      )}
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                        <div className="text-right">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-rose-600">
                              ${product.price.toFixed(2)}
                            </span>
                            {hasDiscount && (
                              <span className="text-sm text-slate-400 line-through">
                                ${product.originalPrice?.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
                        {product.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <img
                            src={designer.avatar}
                            alt={designer.username}
                            className="w-6 h-6 rounded-full border"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${designer.username}`
                            }}
                          />
                          <span className="text-sm text-slate-500">@{designer.username}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm">{product.rating.toFixed(1)}</span>
                          <span className="text-xs text-slate-400">({product.reviews})</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-slate-500">
                          {product.stock > 0 
                            ? `${product.stock} in stock` 
                            : 'Out of stock'
                          }
                        </div>
                        <Button 
                          className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock === 0}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t">
                <div className="text-sm text-slate-600">
                  Page {page} of {totalPages} • {products.length} products
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="rounded-full"
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1
                    if (page > 3) {
                      pageNum = page - 2 + i
                    }
                    if (pageNum > totalPages) return null
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="rounded-full w-10 h-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="rounded-full"
                  >
                    Next
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="text-slate-600 hover:text-slate-900"
                >
                  Back to top ↑
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}