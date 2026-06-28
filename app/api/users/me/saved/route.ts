import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { SavedItem } from "@/lib/models/UserInteractions";
import Post from "@/lib/models/Post";
import Course from "@/lib/models/Course";
import "@/lib/loadmodels";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const dbUser = await User.findOne({ clerkId: user.id });
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch saved items
    const saved = await SavedItem.find({ user: dbUser._id })
      .sort({ savedAt: -1 })
      .lean();

    const populated = await Promise.all(
      saved.map(async (item: any) => {
        let data: any = null;
        let fallbackTitle = "";
        let fallbackDescription = "";
        let imageUrl = "";
        let authorName = "unknown";

        if (item.itemType === "post") {
          data = await Post.findById(item.itemId)
            .populate("author", "username avatar firstName lastName")
            .lean();
          
          if (data) {
            fallbackTitle = `Post by ${data.author?.username || data.author?.firstName || "User"}`;
            fallbackDescription = data.caption || "No caption";
            // Use the first media item if available
            imageUrl = data.media?.[0]?.url || data.media?.[0]?.thumbnail || "";
            authorName = data.author?.username || data.author?.firstName || "unknown";
          }
        } else if (item.itemType === "course") {
          data = await Course.findById(item.itemId)
            .populate("instructor", "username avatar firstName lastName")
            .lean();
          
          if (data) {
            fallbackTitle = data.title || "Untitled Course";
            fallbackDescription = data.description || "No description";
            imageUrl = data.thumbnail || data.image || "";
            authorName = data.instructor?.username || data.instructor?.firstName || "unknown";
          }
        }
        // Remove design case since you don't have the model

        return {
          ...item,
          _id: (item._id as any).toString(),
          user: (item.user as any).toString(),
          itemId: (item.itemId as any).toString(),
          item: data ? {
            ...data,
            _id: (data._id as any).toString(),
            title: data.title || fallbackTitle,
            description: data.description || data.caption || fallbackDescription,
            caption: data.caption,
            image: imageUrl,
            thumbnail: imageUrl,
            author: data.author ? {
              ...data.author,
              _id: (data.author as any)._id?.toString() || '',
              username: data.author.username || data.author.firstName || 'user'
            } : null,
            instructor: data.instructor ? {
              ...data.instructor,
              _id: (data.instructor as any)._id?.toString() || '',
              username: data.instructor.username || data.instructor.firstName || 'user'
            } : null,
            authorName: authorName
          } : null
        };
      })
    );

    return NextResponse.json({ 
      savedItems: populated,
      count: populated.length 
    });
  } catch (error: any) {
    console.error("Error fetching saved items:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}