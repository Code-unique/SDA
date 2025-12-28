// api/ai/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory session storage (in production, use Redis or database)
const sessions = new Map<string, { messages: any[], createdAt: Date, lastActive: Date }>()

// Clean up old sessions periodically
function cleanupSessions() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  
  for (const [id, session] of sessions.entries()) {
    if (session.lastActive < twentyFourHoursAgo) {
      sessions.delete(id)
    }
  }
}

// Run cleanup every hour
setInterval(cleanupSessions, 60 * 60 * 1000)

// Fashion knowledge base
const fashionKnowledge = {
  'trend-analysis': [
    "2024 fashion emphasizes 'quiet luxury' - understated elegance with focus on fabric quality and perfect fit. Key trends include modular garments, sustainable materials, and longevity-focused design.",
    "Current trends show a shift towards versatile core pieces over fast fashion. Look for tailored silhouettes, innovative sustainable fabrics, and gender-fluid designs gaining popularity."
  ],
  'design-critique': [
    "When critiquing a design, consider: silhouette clarity, proportion balance, fabric behavior, color harmony, and styling consistency. A strong design communicates intention instantly.",
    "Effective design critique balances artistic vision with practical wearability. Focus on how the design serves its intended purpose and audience."
  ],
  'portfolio-review': [
    "A compelling portfolio shows your design journey: concept → research → sketches → technical flats → final garment. Include 5-7 cohesive looks that tell your unique story.",
    "Digital portfolios should highlight process and problem-solving. Show fabric swatches, mood boards, and technical specifications alongside finished work."
  ],
  'color-theory': [
    "Strong color palettes use one anchor tone (60%), one neutral (30%), and one accent (10%). Consider color psychology and seasonal harmony in your selections.",
    "For fashion, color harmony creates mood. Analogous colors are harmonious, complementary create contrast. Consider skin tone, occasion, and fabric texture when choosing colors."
  ],
  'business-advice': [
    "Price your work based on: materials cost + labor (hourly rate) + overhead + profit margin (30-50%). Consider perceived value and market positioning.",
    "Build your fashion brand with clear identity, target audience focus, and consistent visual language. Start small, validate with customers, then scale thoughtfully."
  ],
  'sustainability': [
    "Sustainable fashion means: durable construction, repairable designs, ethical sourcing, and circular lifecycle. Transparency builds more trust than perfection.",
    "Focus on natural fibers, local production, and timeless designs that won't date quickly. Consider rental or resale models for your business."
  ],
  'fabric-selection': [
    "Choose fabrics based on: drape, weight, breathability, durability, and care requirements. Natural fibers like linen, TENCEL™, and organic cotton are excellent choices.",
    "Consider fabric behavior with movement. Lightweight fabrics drape beautifully, structured fabrics hold shape. Mix textures for visual interest."
  ],
  'image-analysis': [
    "When analyzing an outfit: assess silhouette clarity, proportion balance, fabric harmony, color coordination, and styling cohesion. Each element should support the overall intention.",
    "Strong looks communicate instantly. Consider: Does the silhouette flatter? Do colors harmonize? Do fabrics work together? Is the styling appropriate for the occasion?"
  ],
  'general': [
    "Fashion thrives where creativity meets craftsmanship. Focus on developing both technical skills and unique artistic vision.",
    "Successful fashion design balances artistic expression with practical considerations like wearability, production feasibility, and market appeal."
  ]
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, action } = await req.json()
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    const id = sessionId || 'default-session'
    
    // Initialize or get session
    if (!sessions.has(id)) {
      sessions.set(id, {
        messages: [],
        createdAt: new Date(),
        lastActive: new Date()
      })
    }
    
    const session = sessions.get(id)!
    session.lastActive = new Date()
    
    // Update session messages
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    })
    
    // Keep only last 50 messages
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50)
    }
    
    // Generate response based on intent
    let response = ''
    const lowerMessage = message.toLowerCase()
    
    if (action === 'analyze-image' || lowerMessage.includes('image') || lowerMessage.includes('outfit') || lowerMessage.includes('photo')) {
      // Image analysis response
      const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'black', 'white', 'pink'].filter(c => lowerMessage.includes(c))
      const fabrics = ['silk', 'cotton', 'wool', 'linen', 'denim', 'leather'].filter(f => lowerMessage.includes(f))
      
      response = `**FASHION IMAGE ANALYSIS**

Based on your description, here's my professional critique:

**Silhouette:** ${lowerMessage.includes('dress') ? 'Dress silhouette shows good proportion. Consider waist emphasis for definition.' : 'Consider defining the silhouette with structured pieces or layering.'}

**Color Harmony:** ${colors.length > 0 ? `Your ${colors.join(', ')} color combination ${colors.length === 1 ? 'creates strong focus' : 'shows thoughtful coordination'}.` : 'Color selection could benefit from intentional harmony.'}

**Fabric Selection:** ${fabrics.length > 0 ? `${fabrics.join(' and ')} ${fabrics.length === 1 ? 'is' : 'are'} excellent choice${fabrics.length === 1 ? '' : 's'} for ${lowerMessage.includes('summer') ? 'summer' : lowerMessage.includes('winter') ? 'winter' : 'this'} wear.` : 'Consider how fabric choice affects drape and movement.'}

**Styling:** ${lowerMessage.includes('casual') ? 'Casual styling works well with relaxed fits and natural fabrics.' : lowerMessage.includes('formal') ? 'Formal wear benefits from clean lines and luxurious details.' : 'Styling should align with the intended occasion.'}

**Suggestions for Enhancement:**
1. Consider adding texture contrast for visual interest
2. Define waistline for better proportion
3. ${colors.length > 1 ? 'Balance your color ratio (60-30-10 rule)' : 'Add a complementary color accent'}
4. Ensure fabric weights work harmoniously together

**Next Steps:**
• Try one suggestion and observe the effect
• Consider how the outfit makes you feel
• Photograph from multiple angles to assess fit

Would you like me to elaborate on any specific aspect?`
      
    } else if (lowerMessage.includes('trend') || lowerMessage.includes('latest') || lowerMessage.includes('2024')) {
      response = fashionKnowledge['trend-analysis'][Math.floor(Math.random() * fashionKnowledge['trend-analysis'].length)]
    } else if (lowerMessage.includes('portfolio') || lowerMessage.includes('collection')) {
      response = fashionKnowledge['portfolio-review'][Math.floor(Math.random() * fashionKnowledge['portfolio-review'].length)]
    } else if (lowerMessage.includes('color') || lowerMessage.includes('palette')) {
      response = fashionKnowledge['color-theory'][Math.floor(Math.random() * fashionKnowledge['color-theory'].length)]
    } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('business')) {
      response = fashionKnowledge['business-advice'][Math.floor(Math.random() * fashionKnowledge['business-advice'].length)]
    } else if (lowerMessage.includes('sustain') || lowerMessage.includes('eco') || lowerMessage.includes('ethical')) {
      response = fashionKnowledge['sustainability'][Math.floor(Math.random() * fashionKnowledge['sustainability'].length)]
    } else if (lowerMessage.includes('fabric') || lowerMessage.includes('material') || lowerMessage.includes('textile')) {
      response = fashionKnowledge['fabric-selection'][Math.floor(Math.random() * fashionKnowledge['fabric-selection'].length)]
    } else if (lowerMessage.includes('critique') || lowerMessage.includes('feedback') || lowerMessage.includes('review')) {
      response = fashionKnowledge['design-critique'][Math.floor(Math.random() * fashionKnowledge['design-critique'].length)]
    } else {
      response = fashionKnowledge['general'][Math.floor(Math.random() * fashionKnowledge['general'].length)]
    }
    
    // Add session context
    const previousTopics = session.messages
      .slice(-5)
      .filter((m: any) => m.role === 'user')
      .map((m: any) => m.content.substring(0, 50))
      .join('; ')
    
    if (session.messages.length > 3) {
      response += `\n\n**Based on our conversation about:** ${previousTopics || 'various fashion topics'}\n\n**How would you like to proceed?** You can:\n1. Ask for more detail\n2. Request specific examples\n3. Explore related topics\n4. Get practical steps`
    } else {
      response += `\n\n**What would you like to explore next?** I can help with:\n• Trend analysis and forecasting\n• Design critique and feedback\n• Portfolio development\n• Business and pricing strategy\n• Sustainable practices\n• Fabric and color selection`
    }
    
    // Add assistant response to session
    session.messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    })
    
    return NextResponse.json({
      response,
      sessionId: id,
      timestamp: new Date().toISOString(),
      messageCount: session.messages.length
    })
    
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}