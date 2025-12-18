import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  images: string[];
  category: string;
  designer: {
    clerkId: string;
    username: string;
    avatar: string;
  };
  rating: number;
  reviews: number;
  stock: number;
  isActive: boolean;
  tags: string[];
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Virtual for discount percentage
  discountPercentage: number;
}

const ProductSchema = new Schema<IProduct>({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [3, 'Product name must be at least 3 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative'],
    validate: {
      validator: function(this: IProduct, value: number) {
        return value >= this.price;
      },
      message: 'Original price must be greater than or equal to sale price'
    }
  },
  images: [{
    type: String,
    required: [true, 'At least one image is required'],
    validate: {
      validator: function(images: string[]) {
        return images.length > 0 && images.length <= 10;
      },
      message: 'Products must have 1-10 images'
    }
  }],
  category: {
    type: String,
    required: [true, 'Category is required'],
    index: true,
    enum: ['dresses', 'tops', 'bottoms', 'outerwear', 'accessories', 'shoes', 'bags', 'jewelry', 'activewear', 'lingerie', 'other']
  },
  designer: {
    clerkId: {
      type: String,
      required: [true, 'Designer ID is required'],
      index: true,
    },
    username: {
      type: String,
      required: [true, 'Designer username is required'],
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },
    avatar: {
      type: String,
      required: [true, 'Designer avatar is required'],
      default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=designer',
    },
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    set: (val: number) => Math.round(val * 10) / 10, // Round to 1 decimal
  },
  reviews: {
    type: Number,
    default: 0,
    min: [0, 'Review count cannot be negative'],
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    default: 0,
    min: [0, 'Stock cannot be negative'],
    max: [10000, 'Stock cannot exceed 10000'],
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters'],
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function(this: IProduct) {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }
  return 0;
});

// Compound indexes for common queries
ProductSchema.index({ category: 1, isActive: 1, featured: 1 });
ProductSchema.index({ price: 1, isActive: 1 });
ProductSchema.index({ rating: -1, reviews: -1, isActive: 1 });
ProductSchema.index({ createdAt: -1, isActive: 1 });

// Text search index
ProductSchema.index({ 
  name: 'text', 
  description: 'text', 
  tags: 'text',
  'designer.username': 'text' 
});

// Pre-save middleware for data normalization
ProductSchema.pre('save', function(next) {
  // Normalize tags: remove duplicates, trim, lowercase
  if (this.tags) {
    this.tags = [...new Set(this.tags.map(tag => tag.trim().toLowerCase()))];
  }
  
  // Ensure at least one image
  if (this.images && this.images.length > 0) {
    this.images = this.images.filter(img => img && img.trim().length > 0);
  }
  
  // Round price to 2 decimal places
  this.price = Math.round(this.price * 100) / 100;
  if (this.originalPrice) {
    this.originalPrice = Math.round(this.originalPrice * 100) / 100;
  }
  
  next();
});

// Static method for finding active products
ProductSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method for finding featured products
ProductSchema.statics.findFeatured = function() {
  return this.find({ isActive: true, featured: true });
};

// Static method for finding products by category
ProductSchema.statics.findByCategory = function(category: string) {
  return this.find({ isActive: true, category });
};

// Instance method for checking stock availability
ProductSchema.methods.isInStock = function(quantity: number = 1) {
  return this.stock >= quantity;
};

// Instance method for updating stock
ProductSchema.methods.updateStock = async function(quantity: number) {
  if (this.stock + quantity < 0) {
    throw new Error('Insufficient stock');
  }
  this.stock += quantity;
  return this.save();
};

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);