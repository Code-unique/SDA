// app/api/users/saved/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { SavedItem } from "@/lib/models/UserInteractions";
import Post from "@/lib/models/Post";
import Course from "@/lib/models/Course";

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

    // Fetch only saved entries
    const saved = await SavedItem.find({ user: dbUser._id })
      .sort({ savedAt: -1 })
      .lean();

    const populated = await Promise.all(
      saved.map(async (item: any) => {
        let data: any = null;

        if (item.itemType === "post") {
          data = await Post.findById(item.itemId)
            .populate("author", "username avatar")
            .lean();
        }

        if (item.itemType === "course") {
          data = await Course.findById(item.itemId)
            .populate("instructor", "username avatar")
            .lean();
        }

        return {
          ...item,
          _id: (item._id as any).toString(),
          user: (item.user as any).toString(),
          itemId: (item.itemId as any).toString(),
          item: data ? {
            ...data,
            _id: (data._id as any).toString(),
            author: data.author ? {
              ...data.author,
              _id: (data.author as any)._id?.toString() || ''
            } : null,
            instructor: data.instructor ? {
              ...data.instructor,
              _id: (data.instructor as any)._id?.toString() || ''
            } : null
          } : null
        };
      })
    );

    return NextResponse.json({ savedItems: populated });
  } catch (error) {
    console.error("Error fetching saved items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}