// lib/services/user-service.ts
import User, { IUser } from '@/lib/models/User';

export class UserService {
  static async createOrUpdateUser(clerkId: string, userData: Partial<IUser>) {
    let user = await User.findOne({ clerkId });

    if (user) {
      // Update existing user
      user = await User.findOneAndUpdate(
        { clerkId },
        { $set: userData },
        { new: true, runValidators: true }
      );
    } else {
      // Create new user
      user = await User.create({
        clerkId,
        ...userData,
        onboardingCompleted: false,
        isVerified: false,
      });
    }

    return user;
  }

  static async getUserByClerkId(clerkId: string) {
    return await User.findOne({ clerkId })
      .populate('followers', 'username firstName lastName avatar')
      .populate('following', 'username firstName lastName avatar');
  }

  static async updateUserProfile(clerkId: string, updateData: Partial<IUser>) {
    const user = await User.findOneAndUpdate(
      { clerkId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  static async followUser(currentUserId: string, targetUserId: string) {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId)
    ]);

    if (!currentUser || !targetUser) {
      throw new Error('User not found');
    }

    // Add to following
    if (!currentUser.following.includes(targetUserId)) {
      currentUser.following.push(targetUserId);
    }

    // Add to followers
    if (!targetUser.followers.includes(currentUserId)) {
      targetUser.followers.push(currentUserId);
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    return { currentUser, targetUser };
  }

  static async unfollowUser(currentUserId: string, targetUserId: string) {
    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId)
    ]);

    if (!currentUser || !targetUser) {
      throw new Error('User not found');
    }

    // Remove from following
    currentUser.following = currentUser.following.filter(
      (id: any) => id.toString() !== targetUserId
    );

    // Remove from followers
    targetUser.followers = targetUser.followers.filter(
      (id: any) => id.toString() !== currentUserId
    );

    await Promise.all([currentUser.save(), targetUser.save()]);

    return { currentUser, targetUser };
  }

  static async searchUsers(query: string, page: number = 1, limit: number = 10) {
    const searchQuery = {
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { bio: { $regex: query, $options: 'i' } },
      ]
    };

    const [users, total] = await Promise.all([
      User.find(searchQuery)
        .select('username firstName lastName avatar bio followers following')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(searchQuery)
    ]);

    return {
      users: users.map(user => ({
        ...user,
        _id: (user._id as any).toString()
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
}