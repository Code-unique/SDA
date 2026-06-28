//app/page.tsx
import { Suspense } from 'react'
import ExploreClient from '@/components/explore/ExploreClient'

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-slate-500">
          Loading explore…
        </div>
      }
    >
      <ExploreClient />
    </Suspense>
  )
}
