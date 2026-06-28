// lib/models/UserInteractions.ts
import mongoose, { Schema, Types } from 'mongoose';
// Saved Items Schema
const SavedItemSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    itemType: {
        type: String,
        enum: ['post', 'course', 'design', 'pattern'],
        required: true
    },
    itemId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'itemType'
    },
    savedAt: {
        type: Date,
        default: Date.now
    },
    category: {
        type: String,
        default: 'general',
        maxlength: 50
    },
    tags: [{
            type: String,
            maxlength: 30
        }]
}, {
    timestamps: true
});
// Compound index to ensure unique saved items per user
SavedItemSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });
// Likes Schema
const LikeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    itemType: {
        type: String,
        enum: ['post', 'course', 'design', 'comment'],
        required: true
    },
    itemId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'itemType'
    },
    likedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Compound index for likes
LikeSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });
LikeSchema.index({ itemType: 1, itemId: 1 });
// Views Schema
const ViewSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    itemType: {
        type: String,
        enum: ['post', 'course', 'design'],
        required: true
    },
    itemId: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'itemType'
    },
    viewedAt: {
        type: Date,
        default: Date.now
    },
    duration: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});
// Index for views
ViewSchema.index({ user: 1, itemType: 1, itemId: 1 });
ViewSchema.index({ itemType: 1, itemId: 1 });
ViewSchema.index({ viewedAt: -1 });
// Follows Schema
const FollowSchema = new Schema({
    follower: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    following: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    followedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
// Compound index for follows (a user can only follow another user once)
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
// Index for finding followers and following
FollowSchema.index({ follower: 1 });
FollowSchema.index({ following: 1 });
// Static methods for SavedItem
SavedItemSchema.statics = {
    async getSavedItems(userId, options = {}) {
        const { itemType, category, page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const query = { user: new Types.ObjectId(userId.toString()) };
        if (itemType)
            query.itemType = itemType;
        if (category)
            query.category = category;
        const savedItems = await this.find(query)
            .populate('itemId')
            .sort({ savedAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
        const total = await this.countDocuments(query);
        return {
            savedItems,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1
        };
    },
    async isItemSaved(userId, itemType, itemId) {
        const savedItem = await this.findOne({
            user: new Types.ObjectId(userId.toString()),
            itemType,
            itemId: new Types.ObjectId(itemId.toString())
        });
        return !!savedItem;
    }
};
// Static methods for Like
LikeSchema.statics = {
    async getLikeCount(itemType, itemId) {
        return await this.countDocuments({
            itemType,
            itemId: new Types.ObjectId(itemId.toString())
        });
    },
    async getUserLikes(userId, itemType) {
        const query = { user: new Types.ObjectId(userId.toString()) };
        if (itemType)
            query.itemType = itemType;
        return await this.find(query).populate('itemId').exec();
    }
};
// Static methods for Follow
FollowSchema.statics = {
    async getFollowersCount(userId) {
        return await this.countDocuments({ following: new Types.ObjectId(userId.toString()) });
    },
    async getFollowingCount(userId) {
        return await this.countDocuments({ follower: new Types.ObjectId(userId.toString()) });
    },
    async getFollowers(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const followers = await this.find({ following: new Types.ObjectId(userId.toString()) })
            .populate('follower', 'firstName lastName username avatar')
            .sort({ followedAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
        const total = await this.countDocuments({ following: new Types.ObjectId(userId.toString()) });
        return {
            followers,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    },
    async getFollowing(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const following = await this.find({ follower: new Types.ObjectId(userId.toString()) })
            .populate('following', 'firstName lastName username avatar')
            .sort({ followedAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
        const total = await this.countDocuments({ follower: new Types.ObjectId(userId.toString()) });
        return {
            following,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        };
    }
};
// Export models
export const SavedItem = mongoose.models.SavedItem || mongoose.model('SavedItem', SavedItemSchema);
export const Like = mongoose.models.Like || mongoose.model('Like', LikeSchema);
export const View = mongoose.models.View || mongoose.model('View', ViewSchema);
export const Follow = mongoose.models.Follow || mongoose.model('Follow', FollowSchema);
export default {
    SavedItem,
    Like,
    View,
    Follow
};
