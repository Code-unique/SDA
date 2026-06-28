// lib/api-handler.ts
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
export function withAuth(handler) {
    return async (request) => {
        try {
            // Connect to database
            await connectToDatabase();
            // Verify authentication
            const user = await currentUser();
            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            return await handler(request, user.id);
        }
        catch (error) {
            console.error('API Error:', error);
            if (error.name === 'ValidationError') {
                return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
            }
            if (error.code === 11000) {
                return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    };
}
export function withOptionalAuth(handler) {
    return async (request) => {
        try {
            await connectToDatabase();
            const user = await currentUser();
            const userId = user === null || user === void 0 ? void 0 : user.id;
            return await handler(request, userId);
        }
        catch (error) {
            console.error('API Error:', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    };
}
