// app/learn/[slug]/page.tsx
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function LearnRedirectPage({ params }: PageProps) {
  const { slug } = await params
  
  try {
    // Try to redirect to the course detail page
    redirect(`/courses/${slug}`)
  } catch (error) {
    // If redirect fails, show 404
    notFound()
  }
}