// lib/auth.ts
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export async function getAuth() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  return user
}

export async function getAuthUserId() {
  const user = await currentUser()
  return user?.id
}

export async function requireAuth() {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }
  
  return user
}