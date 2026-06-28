var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import mongoose, { Schema } from 'mongoose';
const ProductSchema = new Schema({
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
        min: [0.01, 'Price must be greater than 0'],
    },
    originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative'],
        validate: {
            validator: function (value) {
                // If originalPrice is not provided or is 0, it's valid
                if (!value || value === 0)
                    return true;
                // Get the current price from the document
                const doc = this;
                const price = doc.price;
                // If price is not set yet (during initial creation), allow any originalPrice
                if (!price)
                    return true;
                // Check if originalPrice >= price
                return value >= price;
            },
            message: 'Original price must be greater than or equal to sale price'
        }
    },
    image: {
        type: String,
        required: [true, 'Product image is required'],
        validate: {
            validator: function (img) {
                if (!img || typeof img !== 'string')
                    return false;
                const trimmedImg = img.trim();
                if (trimmedImg.length === 0)
                    return false;
                return (trimmedImg.startsWith('data:image/') ||
                    trimmedImg.startsWith('http://') ||
                    trimmedImg.startsWith('https://') ||
                    trimmedImg.startsWith('/api/placeholder/') ||
                    trimmedImg.startsWith('/'));
            },
            message: 'Product must have a valid image URL (data URL, http, https, /api/placeholder/, or relative path)'
        }
    },
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
        set: (val) => Math.round(val * 10) / 10,
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
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Create a new object without __v
            const _a = ret, { __v } = _a, result = __rest(_a, ["__v"]);
            // Access originalPrice properly
            if (result.originalPrice !== undefined) {
                // Convert to number if it's a string
                if (typeof result.originalPrice === 'string') {
                    result.originalPrice = parseFloat(result.originalPrice);
                }
                // Ensure it's a number
                result.originalPrice = Number(result.originalPrice);
            }
            // Also parse price if needed
            if (result.price !== undefined) {
                if (typeof result.price === 'string') {
                    result.price = parseFloat(result.price);
                }
                result.price = Number(result.price);
            }
            // Convert rating if needed
            if (result.rating !== undefined && typeof result.rating === 'string') {
                result.rating = parseFloat(result.rating);
            }
            // Convert reviews if needed
            if (result.reviews !== undefined && typeof result.reviews === 'string') {
                result.reviews = parseInt(result.reviews, 10);
            }
            // Convert stock if needed
            if (result.stock !== undefined && typeof result.stock === 'string') {
                result.stock = parseInt(result.stock, 10);
            }
            return result;
        }
    },
    toObject: {
        virtuals: true,
        transform: function (doc, ret) {
            // Create a new object without __v
            const _a = ret, { __v } = _a, result = __rest(_a, ["__v"]);
            // Access originalPrice properly
            if (result.originalPrice !== undefined) {
                // Convert to number if it's a string
                if (typeof result.originalPrice === 'string') {
                    result.originalPrice = parseFloat(result.originalPrice);
                }
                // Ensure it's a number
                result.originalPrice = Number(result.originalPrice);
            }
            // Also parse price if needed
            if (result.price !== undefined) {
                if (typeof result.price === 'string') {
                    result.price = parseFloat(result.price);
                }
                result.price = Number(result.price);
            }
            // Convert rating if needed
            if (result.rating !== undefined && typeof result.rating === 'string') {
                result.rating = parseFloat(result.rating);
            }
            // Convert reviews if needed
            if (result.reviews !== undefined && typeof result.reviews === 'string') {
                result.reviews = parseInt(result.reviews, 10);
            }
            // Convert stock if needed
            if (result.stock !== undefined && typeof result.stock === 'string') {
                result.stock = parseInt(result.stock, 10);
            }
            return result;
        }
    },
});
// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function () {
    if (this.originalPrice && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    }
    return 0;
});
// Pre-save middleware for data normalization
ProductSchema.pre('save', function (next) {
    // Type assertion to access document properties
    const doc = this;
    // Normalize tags
    if (doc.tags && Array.isArray(doc.tags)) {
        doc.tags = [...new Set(doc.tags.map((tag) => {
                if (tag && typeof tag === 'string') {
                    return tag.trim().toLowerCase();
                }
                return tag;
            }).filter((tag) => tag && tag.length > 0))];
    }
    // Clean and validate image
    if (doc.image && typeof doc.image === 'string') {
        doc.image = doc.image.trim();
    }
    // Round prices to 2 decimal places
    if (doc.price !== undefined) {
        doc.price = Math.round(Number(doc.price) * 100) / 100;
    }
    if (doc.originalPrice !== undefined) {
        doc.originalPrice = Math.round(Number(doc.originalPrice) * 100) / 100;
    }
    // Ensure originalPrice is undefined if not provided or 0
    if (doc.originalPrice === 0 || doc.originalPrice === null) {
        delete doc.originalPrice;
    }
    next();
});
// Pre-validate middleware to handle empty originalPrice
ProductSchema.pre('validate', function (next) {
    const doc = this;
    // Convert empty string or 0 to undefined
    if (doc.originalPrice === '' || doc.originalPrice === 0 || doc.originalPrice === null) {
        delete doc.originalPrice;
    }
    // Ensure price is a number
    if (doc.price !== undefined && typeof doc.price === 'string') {
        doc.price = parseFloat(doc.price);
    }
    next();
});
// Static methods with proper typing
ProductSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};
ProductSchema.statics.findFeatured = function () {
    return this.find({ isActive: true, featured: true });
};
ProductSchema.statics.findByCategory = function (category) {
    return this.find({ isActive: true, category });
};
// Instance methods
ProductSchema.methods.isInStock = function (quantity = 1) {
    return this.stock >= quantity;
};
ProductSchema.methods.updateStock = async function (quantity) {
    if (this.stock + quantity < 0) {
        throw new Error('Insufficient stock');
    }
    this.stock += quantity;
    return this.save();
};
// Indexes
ProductSchema.index({ category: 1, isActive: 1, featured: 1 });
ProductSchema.index({ price: 1, isActive: 1 });
ProductSchema.index({ rating: -1, reviews: -1, isActive: 1 });
ProductSchema.index({ createdAt: -1, isActive: 1 });
ProductSchema.index({
    name: 'text',
    description: 'text',
    tags: 'text',
    'designer.username': 'text'
});
// Type assertion for the model
const ProductModel = mongoose.models.Product ||
    mongoose.model('Product', ProductSchema);
export default ProductModel;
