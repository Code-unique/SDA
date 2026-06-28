export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>
      <div className="space-y-6 text-gray-600">
        <section>
          <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
          <p>We collect basic information to provide and improve our services.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3">How We Use Information</h2>
          <p>Your information is used to deliver educational content and improve user experience.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-3">Data Protection</h2>
          <p>We implement security measures to protect your personal information.</p>
        </section>
      </div>
    </div>
  )
}