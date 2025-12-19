import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { requireAdmin } from '@/lib/utils/role-check';

// GET all products (public)
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;
    
    const category = searchParams.get('category');
    const designer = searchParams.get('designer');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') || '-createdAt';
    
    const query: any = { isActive: true };
    
    if (category) query.category = category;
    if (designer) query['designer.clerkId'] = designer;
    if (minPrice) query.price = { ...query.price, $gte: parseFloat(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: parseFloat(maxPrice) };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { 'designer.username': { $regex: search, $options: 'i' } },
      ];
    }
    
    const sortOptions: any = {};
    switch (sort) {
      case 'price_asc': sortOptions.price = 1; break;
      case 'price_desc': sortOptions.price = -1; break;
      case 'rating': sortOptions.rating = -1; break;
      case 'newest': sortOptions.createdAt = -1; break;
      case 'oldest': sortOptions.createdAt = 1; break;
      default: sortOptions.createdAt = -1;
    }
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);
    
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create product (admin only)
export async function POST(request: NextRequest) {
  try {
    // FIRST check if user is admin
    await requireAdmin();
    
    await connectToDatabase();
    
    const body = await request.json();
    
    console.log('Admin creating new product:', {
      ...body,
      price: body.price,
      originalPrice: body.originalPrice,
      image: body.image ? 'image provided' : 'no image'
    });
    
    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }
    
    if (!body.description || !body.description.trim() || body.description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }
    
    const price = parseFloat(body.price);
    if (!body.price || isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: 'Valid price is required (must be greater than 0)' },
        { status: 400 }
      );
    }
    
    if (!body.category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }
    
    if (!body.image || !body.image.trim()) {
      return NextResponse.json(
        { error: 'Product image is required' },
        { status: 400 }
      );
    }
    
    // FIX: Check if originalPrice exists and handle it properly
    let originalPrice: number | undefined;
    if (body.originalPrice !== undefined && body.originalPrice !== null) {
      // Convert to string first to check if it's empty, then parse
      const originalPriceStr = String(body.originalPrice);
      
      if (originalPriceStr.trim() !== '') {
        originalPrice = parseFloat(originalPriceStr);
        if (isNaN(originalPrice) || originalPrice < 0) {
          return NextResponse.json(
            { error: 'Original price must be a valid number' },
            { status: 400 }
          );
        }
        if (originalPrice < price) {
          return NextResponse.json(
            { error: 'Original price must be greater than or equal to sale price' },
            { status: 400 }
          );
        }
      }
    }
    
    const cleanedImage = body.image.trim();
    
    if (cleanedImage.length === 0) {
      return NextResponse.json(
        { error: 'Product image is required' },
        { status: 400 }
      );
    }
    
    // Get the user ID from auth for the designer field
    const { userId } = await auth();
    
    const productData = {
      name: body.name.trim(),
      description: body.description.trim(),
      price: price,
      originalPrice: originalPrice,
      category: body.category,
      stock: parseInt(body.stock) || 1,
      tags: Array.isArray(body.tags) 
        ? body.tags.filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0)
        : body.tags && typeof body.tags === 'string' 
          ? body.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
          : [],
      image: cleanedImage,
      rating: body.rating || 0,
      reviews: body.reviews || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      featured: body.featured || false,
      designer: {
        clerkId: userId || 'admin_user',
        username: body.designer?.username || 'Admin',
        avatar: body.designer?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
      },
    };
    
    console.log('Creating product with data:', productData.name);
    
    const product = new Product(productData);
    await product.save();
    
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('POST product error:', error);
    
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }));
      
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: errors,
          message: error.message 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}