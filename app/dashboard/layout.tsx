// app/dashboard/layout.tsx
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from '@/components/layout/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  
  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <DashboardNav />
      <div className="ml-0 lg:ml-64">
        {children}
      </div>
    </div>
  )
}