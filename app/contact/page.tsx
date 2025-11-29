import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Contact Us</h1>
      <div className="space-y-4">
        <Input placeholder="Your Name" />
        <Input placeholder="Your Email" type="email" />
        <Textarea placeholder="Your Message" rows={5} />
        <Button className="w-full">Send Message</Button>
      </div>
    </div>
  )
}