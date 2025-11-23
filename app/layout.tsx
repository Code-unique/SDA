// app/layout.tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { ToastProvider } from '@/components/ui/use-toast'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair'
})

export const metadata: Metadata = {
  title: 'SUTRA - Fashion Design Social & Learning Platform',
  description: 'Connect, learn, and showcase your fashion designs with SUTRA',
  metadataBase: new URL('http://localhost:3000'),
  keywords: ['fashion', 'design', 'social', 'learning', 'portfolio'],
  authors: [{ name: 'SUTRA Team' }],
  openGraph: {
    title: 'SUTRA - Fashion Design Platform',
    description: 'Connect, learn, and showcase your fashion designs',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#f43f5e',
          colorTextOnPrimaryBackground: '#ffffff',
        },
        elements: {
          formButtonPrimary: 'bg-rose-500 hover:bg-rose-600 text-white',
          socialButtonsBlockButton: 'border-slate-200 hover:bg-slate-50',
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} ${playfair.variable} antialiased`}>
          <ToastProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}