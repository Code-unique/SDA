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
const VideoLibrarySchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 1000
    },
    video: {
        key: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        type: { type: String, enum: ['video'], default: 'video' },
        duration: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        originalFileName: { type: String, required: true },
        mimeType: { type: String, required: true }
    },
    uploadedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    categories: [{
            type: String,
            maxlength: 50
        }],
    tags: [{
            type: String,
            maxlength: 30
        }],
    usageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    courses: [{
            courseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Course' },
            courseTitle: String,
            moduleId: { type: mongoose_1.Schema.Types.ObjectId },
            chapterId: { type: mongoose_1.Schema.Types.ObjectId },
            lessonId: { type: mongoose_1.Schema.Types.ObjectId },
            usedAt: { type: Date, default: Date.now }
        }],
    isPublic: {
        type: Boolean,
        default: true
    },
    metadata: {
        resolution: String,
        format: String,
        bitrate: Number,
        frameRate: Number
    }
}, {
    timestamps: true
});
// Indexes for efficient searching
VideoLibrarySchema.index({ title: 'text', description: 'text', tags: 'text' });
VideoLibrarySchema.index({ categories: 1 });
VideoLibrarySchema.index({ uploadedBy: 1 });
VideoLibrarySchema.index({ uploadDate: -1 });
VideoLibrarySchema.index({ usageCount: -1 });
VideoLibrarySchema.index({ 'video.size': 1 });
VideoLibrarySchema.index({ 'video.duration': 1 });
// Pre-save middleware
VideoLibrarySchema.pre('save', function (next) {
    if (this.isNew) {
        this.uploadDate = new Date();
    }
    next();
});
// Method to add usage record
VideoLibrarySchema.methods.addUsage = function (courseId, courseTitle, moduleId, chapterId, lessonId) {
    this.courses.push({
        courseId,
        courseTitle,
        moduleId,
        chapterId,
        lessonId,
        usedAt: new Date()
    });
    this.usageCount += 1;
    return this.save();
};
// Method to get usage statistics
VideoLibrarySchema.methods.getUsageStats = function () {
    return {
        totalUsage: this.usageCount,
        uniqueCourses: [...new Set(this.courses.map(c => c.courseId.toString()))].length,
        recentUsage: this.courses.slice(-5).map(c => ({
            course: c.courseTitle,
            usedAt: c.usedAt
        }))
    };
};
// Static method to search videos
VideoLibrarySchema.statics.searchVideos = function (query, filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const searchQuery = {};
    if (query) {
        searchQuery.$text = { $search: query };
    }
    if (filters.categories && filters.categories.length > 0) {
        searchQuery.categories = { $in: filters.categories };
    }
    if (filters.durationMin || filters.durationMax) {
        searchQuery['video.duration'] = {};
        if (filters.durationMin) {
            searchQuery['video.duration'].$gte = filters.durationMin;
        }
        if (filters.durationMax) {
            searchQuery['video.duration'].$lte = filters.durationMax;
        }
    }
    if (filters.sizeMin || filters.sizeMax) {
        searchQuery['video.size'] = {};
        if (filters.sizeMin) {
            searchQuery['video.size'].$gte = filters.sizeMin;
        }
        if (filters.sizeMax) {
            searchQuery['video.size'].$lte = filters.sizeMax;
        }
    }
    if (filters.uploadedBy) {
        searchQuery.uploadedBy = filters.uploadedBy;
    }
    if (filters.dateFrom || filters.dateTo) {
        searchQuery.uploadDate = {};
        if (filters.dateFrom) {
            searchQuery.uploadDate.$gte = filters.dateFrom;
        }
        if (filters.dateTo) {
            searchQuery.uploadDate.$lte = filters.dateTo;
        }
    }
    return this.find(searchQuery)
        .populate('uploadedBy', 'firstName lastName username avatar email')
        .sort({ uploadDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
};
exports.default = mongoose_1.default.models.VideoLibrary ||
    mongoose_1.default.model('VideoLibrary', VideoLibrarySchema);
