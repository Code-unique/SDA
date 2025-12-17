import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/mongodb'
import User from '@/lib/models/User'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { MobileAdminHeader } from '@/components/admin/mobile-admin-header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const clerkUser = await currentUser()
  
  if (!clerkUser) {
    redirect('/sign-in')
  }

  try {
    await connectToDatabase()
    const dbUser = await User.findOne({ clerkId: clerkUser.id })
    
    if (!dbUser || dbUser.role !== 'admin') {
      redirect('/dashboard')
    }

    // Prepare safe user data for components
    const safeUserData = {
      id: dbUser._id.toString(),
      username: dbUser.username || '',
      email: dbUser.email || '',
      role: dbUser.role
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        {/* Mobile Header - Only visible on mobile */}
        <div className="lg:hidden sticky top-0 z-50">
          <MobileAdminHeader user={safeUserData} />
        </div>

        <div className="flex">
          {/* Sidebar - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
            <AdminSidebar user={safeUserData} />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 lg:ml-64 w-full">
            <div className="p-4 lg:p-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error in admin layout:', error)
    redirect('/dashboard')
  }
}