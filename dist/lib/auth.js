// lib/auth.ts
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
export async function getAuth() {
    const user = await currentUser();
    if (!user) {
        redirect('/sign-in');
    }
    return user;
}
export async function getAuthUserId() {
    const user = await currentUser();
    return user === null || user === void 0 ? void 0 : user.id;
}
export async function requireAuth() {
    const user = await currentUser();
    if (!user) {
        redirect('/sign-in');
    }
    return user;
}
