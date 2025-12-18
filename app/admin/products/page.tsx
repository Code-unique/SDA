'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Upload, X, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

const categories = [
  'dresses', 'tops', 'bottoms', 'outerwear', 'accessories', 
  'shoes', 'bags', 'jewelry', 'activewear', 'lingerie'
];

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { getToken, userId } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: '',
    stock: '1',
    tags: '',
    images: [] as string[],
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      setProducts(data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      
      // Convert to base64 for simple storage
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String);
          setUploading(false);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }).then(base64String => {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, base64String]
        }));
      });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct._id}`
        : '/api/products';
      
      const body = {
        ...formData,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        stock: parseInt(formData.stock) || 1,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        rating: 0,
        reviews: 0,
        isActive: true,
        designer: {
          username: 'Admin',
          avatar: '/avatars/default.png'
        }
      };

      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(editingProduct ? 'Product updated!' : 'Product created!');
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
          images: [],
        });
        fetchProducts();
      } else {
        const error = await res.json();
        alert(`Error: ${error.error || 'Failed to save product'}`);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      originalPrice: product.originalPrice?.toString() || '',
      category: product.category,
      stock: product.stock.toString(),
      tags: product.tags?.join(', ') || '',
      images: product.images || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Product deleted!');
        fetchProducts();
      } else {
        alert('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Product Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      required
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price ($) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        required
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
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
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
                      <Label htmlFor="stock">Stock *</Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="summer, cotton, dress, ..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Product Images *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Product ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index)
                          }))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    
                    {formData.images.length < 4 && (
                      <label className="border-2 border-dashed border-gray-300 rounded-lg h-48 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                        {uploading ? (
                          <Loader2 className="w-8 h-8 text-gray-400 mb-2 animate-spin" />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        )}
                        <span className="text-sm text-gray-500">
                          {uploading ? 'Uploading...' : 'Upload Image'}
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Upload up to 4 images. First image will be the main product image.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
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
                      images: [],
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading || submitting || formData.images.length === 0}
                >
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-500 text-lg">No products found. Create your first product!</p>
            </div>
          ) : (
            products.map((product: any) => (
              <Card key={product._id} className="hover:shadow-lg transition-shadow">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={product.images?.[0] || '/api/placeholder/400/400'}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                    <span className="font-bold text-lg">${product.price}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>Stock: {product.stock}</span>
                    <span className="capitalize bg-gray-100 px-2 py-1 rounded">
                      {product.category}
                    </span>
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
            ))
          )}
        </div>
      )}
    </div>
  );
}