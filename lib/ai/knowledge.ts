// lib/ai/knowledge.ts
import { Intent } from './intent'

export interface KnowledgeEntry {
  content: string
  category: string
  subcategory: string
  confidence: number
  sources: string[]
  tags: string[]
  lastUpdated: Date
}

export class FashionKnowledgeBase {
  private knowledge: Map<Intent, KnowledgeEntry[]> = new Map()
  
  constructor() {
    this.initializeKnowledge()
  }
  
  private initializeKnowledge() {
    // Trend Analysis
    this.knowledge.set('trend-analysis', [
      {
        content: "2024 sees a rise in 'quiet luxury' – understated, high-quality pieces with subtle branding. Focus on fabric quality, perfect fit, and timeless silhouettes over logo-heavy items.",
        category: "Trend Analysis",
        subcategory: "Luxury Fashion",
        confidence: 0.95,
        sources: ["Vogue Trend Reports", "WGSN", "Business of Fashion"],
        tags: ["quiet luxury", "minimalism", "investment pieces"],
        lastUpdated: new Date('2024-01-15')
      },
      {
        content: "Sustainable innovation: Bio-fabricated leathers, algae-based dyes, and recycled ocean plastics are transforming material science. Brands are investing in circular economy models.",
        category: "Trend Analysis",
        subcategory: "Sustainability",
        confidence: 0.9,
        sources: ["Textile Exchange", "Ellen MacArthur Foundation"],
        tags: ["bio-materials", "circular fashion", "innovation"],
        lastUpdated: new Date('2024-02-01')
      }
    ])
    
    // Portfolio Review
    this.knowledge.set('portfolio-review', [
      {
        content: "Strong portfolios show progression: sketch → technical flat → drape study → final garment. Include 5-7 complete looks that tell a cohesive story about your design philosophy.",
        category: "Portfolio Development",
        subcategory: "Structure",
        confidence: 0.95,
        sources: ["Parsons Portfolio Guide", "Central Saint Martins"],
        tags: ["storytelling", "progression", "cohesion"],
        lastUpdated: new Date('2024-01-10')
      },
      {
        content: "Digital portfolios should include: Process videos, fabric swatches, mood boards, and technical specifications. Show your thinking, not just finished products.",
        category: "Portfolio Development",
        subcategory: "Digital Presentation",
        confidence: 0.9,
        sources: ["Adobe Creative Cloud", "Behance Fashion"],
        tags: ["digital", "process", "presentation"],
        lastUpdated: new Date('2024-01-20')
      }
    ])
    
    // Add more categories similarly...
  }
  
  getKnowledge(intent: Intent, query?: string): KnowledgeEntry[] {
    const entries = this.knowledge.get(intent) || []
    
    if (query) {
      return entries.filter(entry => 
        entry.content.toLowerCase().includes(query.toLowerCase()) ||
        entry.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      )
    }
    
    return entries
  }
  
  getRandomInsight(intent: Intent): string {
    const entries = this.getKnowledge(intent)
    if (entries.length === 0) return this.getFallbackResponse(intent)
    
    const entry = entries[Math.floor(Math.random() * entries.length)]
    return `${entry.content}\n\n[Source: ${entry.sources[0]}, Updated: ${entry.lastUpdated.toLocaleDateString()}]`
  }
  
  private getFallbackResponse(intent: Intent): string {
    const fallbacks: Record<string, string> = {
      'trend-analysis': "Current trends emphasize personal expression over mass consumption. Consider what makes your perspective unique in today's market.",
      'portfolio-review': "A compelling portfolio balances technical skill with creative vision. Ensure each piece demonstrates both craftsmanship and concept.",
      'general': "Fashion bridges art and function. The most successful designs solve problems while inspiring emotion."
    }
    
    return fallbacks[intent] || "I'd be happy to discuss fashion with you. What specific aspect are you interested in?"
  }
}