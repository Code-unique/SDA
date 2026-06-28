'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Plus, Edit, Trash2, Loader2, Star, Shield } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// Cloudinary configuration
const CLOUDINARY_CONFIG = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: 'sutra_courses',
};

const categories = [
  'dresses', 'tops', 'bottoms', 'outerwear', 'accessories', 
  'shoes', 'bags', 'jewelry', 'activewear', 'lingerie', 'other'
];

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  stock: number;
  tags: string[];
  rating: number;
  reviews: number;
  isActive: boolean;
  featured: boolean;
  designer: {
    clerkId: string;
    username: string;
    avatar: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  category: string;
  stock: string;
  tags: string;
  image: string;
}

export default function AdminProductsPage() {
  // ALL HOOKS MUST BE CALLED HERE - NO CONDITIONAL HOOKS
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { getToken, userId } = useAuth();
  const router = useRouter();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: '',
    stock: '1',
    tags: '',
    image: '',
  });

  // SINGLE useEffect - not duplicated!
  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin]);

  // Move fetchProducts definition BEFORE the conditional returns
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products?limit=100');
      if (!res.ok) throw new Error('Failed to fetch products');
      
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Loading state - this is now AFTER all hooks
  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // Not admin state
  if (isAdmin === false) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access the admin panel. Only administrators can manage products.
            </p>
            <Button onClick={() => router.push('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // REMOVED THE DUPLICATE useEffect HERE!

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG, JPG, JPEG, WebP)');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset || '');
      formData.append('folder', 'fashion-marketplace/products');
      
      const cloudName = CLOUDINARY_CONFIG.cloudName;
      if (!cloudName) {
        throw new Error('Cloudinary cloud name is not configured');
      }
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary upload failed:', errorText);
        throw new Error('Failed to upload image to Cloudinary');
      }
      
      const result = await response.json();
      
      if (!result.secure_url) {
        throw new Error('Invalid response from Cloudinary');
      }
      
      setFormData(prev => ({
        ...prev,
        image: result.secure_url
      }));
      
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = await getToken();
      
      if (!token) {
        toast.error('You must be logged in to save products');
        setSubmitting(false);
        return;
      }
      
      const url = editingProduct 
        ? `/api/products/${editingProduct._id}`
        : '/api/products';
      
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Product name is required');
      }
      
      if (!formData.description.trim() || formData.description.trim().length < 10) {
        throw new Error('Description must be at least 10 characters');
      }
      
      const price = parseFloat(formData.price);
      if (!formData.price || isNaN(price) || price <= 0) {
        throw new Error('Valid price is required');
      }
      
      if (!formData.category) {
        throw new Error('Category is required');
      }
      
      if (!formData.image.trim()) {
        throw new Error('Product image is required');
      }
      
      let originalPrice: number | undefined;
      if (formData.originalPrice && formData.originalPrice.trim() !== '') {
        originalPrice = parseFloat(formData.originalPrice);
        if (isNaN(originalPrice) || originalPrice < 0) {
          throw new Error('Original price must be a valid number');
        }
        if (originalPrice < price) {
          throw new Error('Original price must be greater than or equal to sale price');
        }
      }
      
      const body = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        originalPrice: originalPrice,
        category: formData.category,
        stock: parseInt(formData.stock) || 1,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        image: formData.image.trim(),
        rating: editingProduct?.rating || 0,
        reviews: editingProduct?.reviews || 0,
        isActive: editingProduct?.isActive ?? true,
        featured: editingProduct?.featured || false,
        designer: {
          clerkId: userId || 'admin_user',
          username: 'Admin',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
        }
      };

      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
        setShowForm(false);
        setEditingProduct(null);
        setFormData({
          name: '',
          description: '',
          price: '',
          originalPrice: '',
          category: '',
          stock: '1',
          tags: '',
          image: '',
        });
        fetchProducts();
      } else {
        let errorMessage = 'Failed to save product';
        if (result.error) {
          errorMessage = result.error;
          if (result.error.includes('Unauthorized')) {
            errorMessage = 'You do not have permission to perform this action';
          }
        } else if (result.details) {
          const errorDetails = result.details.map((err: any) => 
            `${err.field}: ${err.message} (value: ${err.value})`
          ).join(', ');
          errorMessage = errorDetails;
        } else if (result.message) {
          errorMessage = result.message;
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      category: '',
      stock: '1',
      tags: '',
      image: '',
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      originalPrice: product.originalPrice?.toString() || '',
      category: product.category || '',
      stock: product.stock?.toString() || '1',
      tags: product.tags?.join(', ') || '',
      image: product.image || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    
    try {
      const token = await getToken();
      if (!token) {
        toast.error('You must be logged in to delete products');
        return;
      }

      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const result = await res.json();
        let errorMessage = result.error || 'Failed to delete product';
        if (errorMessage.includes('Unauthorized')) {
          errorMessage = 'You do not have permission to delete products';
        }
        throw new Error(errorMessage);
      }

      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Product Management</h1>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Shield className="w-3 h-3 mr-1" />
              Admin Mode
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {products.length} products • {products.filter(p => p.isActive).length} active
          </p>
        </div>
        <Button 
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 border-2 border-dashed border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-6">
              {editingProduct ? 'Edit Product' : 'Create New Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-1">
                      Product Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Enter product name"
                      minLength={3}
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.name.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description" className="flex items-center gap-1">
                      Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                      rows={4}
                      placeholder="Describe your product in detail..."
                      minLength={10}
                      maxLength={2000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.description.length}/2000 characters • Minimum 10 characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price" className="flex items-center gap-1">
                        Price ($) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        required
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="originalPrice">Original Price ($)</Label>
                      <Input
                        id="originalPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.originalPrice}
                        onChange={(e) => setFormData(prev => ({ ...prev, originalPrice: e.target.value }))}
                        placeholder="Optional"
                      />
                      {formData.originalPrice && parseFloat(formData.originalPrice) > parseFloat(formData.price || '0') && (
                        <p className="text-xs text-green-600 mt-1">
                          Discount: {Math.round(((parseFloat(formData.originalPrice) - parseFloat(formData.price)) / parseFloat(formData.originalPrice)) * 100)}% off
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category" className="flex items-center gap-1">
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stock" className="flex items-center gap-1">
                        Stock <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                        required
                        placeholder="Quantity"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="summer, cotton, dress, fashion, ..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate tags with commas
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1">
                      Product Image <span className="text-red-500">*</span>
                    </Label>
                    {formData.image && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove Image
                      </Button>
                    )}
                  </div>
                  
                  {formData.image ? (
                    <div className="relative group">
                      <img
                        src={formData.image}
                        alt="Product preview"
                        className="w-full h-64 object-cover rounded-lg border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/400/400?text=Product+Image';
                        }}
                      />
                      <div className="absolute bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
                        Cloudinary Image
                      </div>
                    </div>
                  ) : (
                    <label className={`border-2 border-dashed rounded-lg h-64 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      uploading 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }`}>
                      {uploading ? (
                        <>
                          <Loader2 className="w-10 h-10 text-blue-400 mb-2 animate-spin" />
                          <span className="text-sm text-blue-600">Uploading to Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Upload Product Image</span>
                          <span className="text-xs text-gray-400 mt-1">
                            PNG, JPG, WebP up to 5MB
                          </span>
                          <span className="text-xs text-gray-400 mt-1">
                            Uses Cloudinary for storage
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                            e.target.value = '';
                          }
                        }}
                        disabled={uploading}
                      />
                    </label>
                  )}
                  
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      Upload a single high-quality product image.
                    </p>
                    {!formData.image && (
                      <p className="text-sm text-red-500">
                        Product image is required
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Image Requirements:</h4>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• Max 5MB per image</li>
                      <li>• Supported formats: PNG, JPG, JPEG, WebP</li>
                      <li>• Recommended size: 800x1000px or similar aspect ratio</li>
                      <li>• Clear, well-lit product photos work best</li>
                      <li>• Images are stored on Cloudinary CDN</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || uploading || !formData.image}
                  className="min-w-[150px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingProduct ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    editingProduct ? 'Update Product' : 'Create Product'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Products</h2>
        <div className="text-sm text-gray-600">
          Showing {products.length} products
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 dark:bg-gray-700"></div>
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start by adding your first product
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product._id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <div className="aspect-square relative overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={product.image || '/api/placeholder/400/400?text=' + encodeURIComponent(product.name)}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/api/placeholder/400/400?text=' + encodeURIComponent(product.name);
                  }}
                />
                {!product.isActive && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge variant="destructive" className="px-3 py-1">
                      Inactive
                    </Badge>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {product.stock === 0 ? (
                    <Badge variant="destructive" className="px-2 py-1 text-xs">
                      Out of Stock
                    </Badge>
                  ) : product.stock < 10 ? (
                    <Badge variant="secondary" className="px-2 py-1 text-xs bg-amber-100 text-amber-800">
                      Low Stock
                    </Badge>
                  ) : null}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                      {product.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-lg">${product.price?.toFixed(2)}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <p className="text-sm text-gray-400 line-through">
                        ${product.originalPrice?.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <span>Stock: {product.stock}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {product.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{product.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-gray-400">({product.reviews || 0})</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDelete(product._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}