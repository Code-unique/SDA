// lib/models/Order.ts - UPDATED TYPE FIXES
import mongoose, { Schema } from 'mongoose';
const OrderSchema = new Schema({
    orderNumber: {
        type: String,
        required: [true, 'Order number is required'],
        unique: true,
        index: true,
        default: () => {
            const date = new Date();
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const random = Math.random().toString(36).substr(2, 6).toUpperCase();
            return `ORD${year}${month}${day}${random}`;
        }
    },
    user: {
        clerkId: {
            type: String,
            required: [true, 'User ID is required'],
            index: true,
        },
        email: {
            type: String,
            required: [true, 'User email is required'],
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        },
        name: {
            type: String,
            required: [true, 'User name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        phone: {
            type: String,
            trim: true,
        },
    },
    items: [{
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: [true, 'Product ID is required'],
            },
            name: {
                type: String,
                required: [true, 'Product name is required'],
                trim: true,
            },
            price: {
                type: Number,
                required: [true, 'Product price is required'],
                min: [0, 'Price cannot be negative'],
            },
            quantity: {
                type: Number,
                required: [true, 'Quantity is required'],
                min: [1, 'Quantity must be at least 1'],
                max: [100, 'Quantity cannot exceed 100'],
            },
            image: {
                type: String,
                required: [true, 'Product image is required'],
            },
            designer: {
                username: {
                    type: String,
                    required: [true, 'Designer username is required'],
                },
                avatar: {
                    type: String,
                    required: [true, 'Designer avatar is required'],
                },
            },
        }],
    shippingAddress: {
        fullName: {
            type: String,
            required: [true, 'Full name is required'],
            trim: true,
        },
        street: {
            type: String,
            required: [true, 'Street address is required'],
            trim: true,
        },
        city: {
            type: String,
            required: [true, 'City is required'],
            trim: true,
        },
        state: {
            type: String,
            required: [true, 'State/Province is required'],
            trim: true,
        },
        postalCode: {
            type: String,
            required: [true, 'Postal code is required'],
            trim: true,
        },
        country: {
            type: String,
            required: [true, 'Country is required'],
            trim: true,
            default: 'United States',
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
        },
    },
    subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        min: [0, 'Subtotal cannot be negative'],
    },
    shippingFee: {
        type: Number,
        required: [true, 'Shipping fee is required'],
        min: [0, 'Shipping fee cannot be negative'],
        default: 0,
    },
    tax: {
        type: Number,
        required: [true, 'Tax is required'],
        min: [0, 'Tax cannot be negative'],
        default: 0,
    },
    total: {
        type: Number,
        required: [true, 'Total is required'],
        min: [0, 'Total cannot be negative'],
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'payment_verification', 'processing', 'shipped', 'delivered', 'cancelled'],
            message: '{VALUE} is not a valid order status',
        },
        default: 'pending',
        index: true,
    },
    paymentMethod: {
        type: String,
        enum: {
            values: ['bank_transfer', 'cash_on_delivery', 'card'],
            message: '{VALUE} is not a valid payment method',
        },
        required: [true, 'Payment method is required'],
    },
    paymentScreenshot: {
        publicId: {
            type: String,
            trim: true,
        },
        url: {
            type: String,
            trim: true,
        },
        uploadedAt: {
            type: Date,
        },
    },
    paymentVerified: {
        type: Boolean,
        default: false,
    },
    trackingNumber: {
        type: String,
        trim: true,
    },
    adminNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    estimatedDelivery: {
        type: Date,
    },
    deliveredAt: {
        type: Date,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Virtual for status history
OrderSchema.virtual('statusHistory').get(function () {
    return [
        { status: 'pending', date: this.createdAt, note: 'Order placed' },
        ...(this.status !== 'pending' ? [{ status: this.status, date: this.updatedAt }] : [])
    ];
});
// Compound indexes for optimized queries
OrderSchema.index({ 'user.clerkId': 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 'text', 'user.email': 'text', 'user.name': 'text' });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ total: -1 });
// Pre-save middleware for validation and calculations
OrderSchema.pre('save', function (next) {
    // Calculate subtotal from items
    if (this.items && this.isModified('items')) {
        this.subtotal = this.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
    }
    // Calculate total
    this.total = this.subtotal + this.shippingFee + this.tax;
    // Round monetary values to 2 decimal places
    this.subtotal = Math.round(this.subtotal * 100) / 100;
    this.shippingFee = Math.round(this.shippingFee * 100) / 100;
    this.tax = Math.round(this.tax * 100) / 100;
    this.total = Math.round(this.total * 100) / 100;
    // Set estimated delivery if shipped
    if (this.isModified('status') && this.status === 'shipped' && !this.estimatedDelivery) {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 7); // 7 days from shipping
        this.estimatedDelivery = deliveryDate;
    }
    // Set deliveredAt if status changed to delivered
    if (this.isModified('status') && this.status === 'delivered' && !this.deliveredAt) {
        this.deliveredAt = new Date();
    }
    next();
});
// Static method for finding orders by user
OrderSchema.statics.findByUser = function (clerkId) {
    return this.find({ 'user.clerkId': clerkId }).sort({ createdAt: -1 });
};
// Static method for finding orders by status
OrderSchema.statics.findByStatus = function (status) {
    return this.find({ status }).sort({ createdAt: -1 });
};
// Static method for finding recent orders
OrderSchema.statics.findRecent = function (days = 30) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return this.find({ createdAt: { $gte: date } }).sort({ createdAt: -1 });
};
// Instance method for updating status
OrderSchema.methods.updateStatus = async function (newStatus, note, trackingNumber) {
    const oldStatus = this.status;
    this.status = newStatus;
    if (trackingNumber) {
        this.trackingNumber = trackingNumber;
    }
    // Add to admin notes
    if (note) {
        const noteText = `[${new Date().toISOString()}] Status changed from ${oldStatus} to ${newStatus}: ${note}`;
        this.adminNotes = this.adminNotes ? `${this.adminNotes}\n${noteText}` : noteText;
    }
    return this.save();
};
export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
