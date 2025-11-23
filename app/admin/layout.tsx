// app/admin/layout.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  try {
    await connectToDatabase()
    const dbUser = await User.findOne({ clerkId: user.id })
    
    if (!dbUser || dbUser.role !== 'admin') {
      redirect('/dashboard')
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 ml-0 lg:ml-64">
            {children}
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in admin layout:', error)
    redirect('/dashboard')
  }
}