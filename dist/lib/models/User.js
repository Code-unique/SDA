"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    clerkId: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        sparse: true,
        minlength: 3,
        maxlength: 30
    },
    firstName: {
        type: String,
        required: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        maxlength: 50
    },
    avatar: {
        type: String,
        default: ''
    },
    banner: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    location: {
        type: String,
        default: '',
        maxlength: 100
    },
    website: {
        type: String,
        default: '',
        maxlength: 200
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'designer'],
        default: 'user'
    },
    interests: [{
            type: String,
            maxlength: 50
        }],
    skills: [{
            type: String,
            maxlength: 50
        }],
    isVerified: {
        type: Boolean,
        default: false
    },
    onboardingCompleted: {
        type: Boolean,
        default: false
    },
    followers: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    following: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User'
        }],
    // ADD NOTIFICATION PREFERENCES
    notificationPreferences: {
        type: {
            likes: { type: Boolean, default: true },
            comments: { type: Boolean, default: true },
            follows: { type: Boolean, default: true },
            courses: { type: Boolean, default: true },
            achievements: { type: Boolean, default: true },
            messages: { type: Boolean, default: true },
            announcements: { type: Boolean, default: true },
            marketing: { type: Boolean, default: false }
        },
        default: {
            likes: true,
            comments: true,
            follows: true,
            courses: true,
            achievements: true,
            messages: true,
            announcements: true,
            marketing: false
        }
    },
    lastNotificationReadAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });
// Indexes
UserSchema.index({ followers: 1 });
UserSchema.index({ following: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'notificationPreferences.likes': 1 });
UserSchema.index({ 'notificationPreferences.comments': 1 });
exports.default = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
