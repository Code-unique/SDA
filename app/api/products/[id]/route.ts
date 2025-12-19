import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { requireAdmin } from '@/lib/utils/role-check';

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET single product
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await connectToDatabase();
    
    const { id } = await params;
    const product = await Product.findById(id);
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('GET product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT update product - ADMIN ONLY
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // FIRST check if user is admin
    await requireAdmin();
    
    await connectToDatabase();
    
    const { id } = await params;
    const body = await request.json();
    
    console.log('Admin updating product:', id, {
      name: body.name,
      price: body.price,
      originalPrice: body.originalPrice,
      image: body.image ? 'Cloudinary image' : 'no image'
    });

    // Get the existing product
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    
    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    
    if (body.description !== undefined) {
      updateData.description = body.description.trim();
    }
    
    if (body.price !== undefined) {
      updateData.price = parseFloat(body.price);
    }
    
    // Handle originalPrice - convert empty string to undefined
    if (body.originalPrice !== undefined) {
      if (body.originalPrice === '' || body.originalPrice === null) {
        updateData.originalPrice = undefined;
      } else {
        updateData.originalPrice = parseFloat(body.originalPrice);
      }
    }
    
    if (body.stock !== undefined) {
      updateData.stock = parseInt(body.stock);
    }
    
    if (body.image !== undefined) {
      updateData.image = body.image.trim();
    }
    
    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        updateData.tags = body.tags.filter((tag: any) => tag && typeof tag === 'string' && tag.trim().length > 0);
      } else if (typeof body.tags === 'string') {
        updateData.tags = body.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      } else {
        updateData.tags = [];
      }
    }
    
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }
    
    if (body.featured !== undefined) {
      updateData.featured = Boolean(body.featured);
    }
    
    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    
    if (body.rating !== undefined) {
      updateData.rating = parseFloat(body.rating);
    }
    
    if (body.reviews !== undefined) {
      updateData.reviews = parseInt(body.reviews);
    }
    
    // Update designer info if provided (admin can change ownership)
    if (body.designer !== undefined) {
      updateData.designer = {
        clerkId: body.designer.clerkId || existingProduct.designer.clerkId,
        username: body.designer.username || existingProduct.designer.username,
        avatar: body.designer.avatar || existingProduct.designer.avatar,
      };
    }
    
    updateData.updatedAt = new Date();
    
    console.log('Admin update data:', {
      ...updateData,
      price: updateData.price,
      originalPrice: updateData.originalPrice
    });
    
    // Use findByIdAndUpdate with runValidators
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
    );
    
    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    console.log('Product updated successfully by admin:', updatedProduct.name);
    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error('PUT product error details:', {
      message: error.message,
      name: error.name,
      errors: error.errors
    });
    
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      console.log('Validation errors:', errors);
      
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
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// DELETE product - ADMIN ONLY
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // FIRST check if user is admin
    await requireAdmin();
    
    await connectToDatabase();
    
    const { id } = await params;
    
    console.log('Admin deleting product:', id);
    
    // For admin, we can do hard delete or soft delete
    const deletedProduct = await Product.findByIdAndDelete(id);
    
    if (!deletedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    console.log('Product deleted successfully by admin:', deletedProduct.name);
    
    return NextResponse.json({ 
      message: 'Product deleted successfully',
      product: deletedProduct 
    });
  } catch (error: any) {
    console.error('DELETE product error:', error);
    
    if (error.message === 'Admin access required') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}