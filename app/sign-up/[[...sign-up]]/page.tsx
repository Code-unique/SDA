// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-rose-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-lg" />
            <span className="text-2xl font-serif font-bold text-white">SUTRA</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-white mb-2">Join SUTRA</h1>
          <p className="text-rose-100">Create your fashion design portfolio</p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl',
              headerTitle: 'text-white font-serif text-2xl',
              headerSubtitle: 'text-rose-100',
              socialButtonsBlockButton: 'border-white/20 text-white hover:bg-white/10 transition-colors',
              dividerLine: 'bg-white/20',
              dividerText: 'text-rose-100',
              formFieldLabel: 'text-white font-medium',
              formFieldInput: 'bg-white/10 border-white/20 text-white placeholder-rose-200 focus:border-rose-300',
              formButtonPrimary: 'bg-rose-500 hover:bg-rose-600 text-white',
              footerActionText: 'text-rose-100',
              footerActionLink: 'text-rose-300 hover:text-rose-200 font-medium',
            }
          }}
          routing="path"
          path="/sign-up"
        />
      </div>
    </div>
  )
}