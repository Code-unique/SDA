// app/unauthorized/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircle, Home } from 'lucide-react'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-6">
          You don't have permission to access this page. Admin privileges are required.
        </p>
        <div className="space-y-3">
          <Button onClick={() => router.push('/')} className="w-full">
            <Home className="w-4 h-4 mr-2" />
            Return to Home
          </Button>
          <Button variant="outline" onClick={() => router.back()} className="w-full">
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}