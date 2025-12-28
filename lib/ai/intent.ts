// lib/ai/intent.ts
import { AnalysisResult, Entity } from './types'

export type Intent =
  | 'trend-analysis'
  | 'portfolio-review'
  | 'pricing-strategy'
  | 'fabric-selection'
  | 'color-theory'
  | 'sustainability'
  | 'career-advice'
  | 'design-critique'
  | 'image-analysis'
  | 'technical-skills'
  | 'brand-development'
  | 'market-research'
  | 'personal-style'
  | 'pattern-making'
  | 'garment-construction'
  | 'fashion-history'
  | 'textile-science'
  | 'business-planning'
  | 'general'

export interface IntentResult {
  intent: Intent
  confidence: number
  subIntents: string[]
  entities: Entity[]
  sentiment: 'positive' | 'negative' | 'neutral'
}

export function advancedDetectIntent(text: string): IntentResult {
  const t = text.toLowerCase().trim()
  
  // Check for multiple intents
  const detectedIntents: { intent: Intent, confidence: number }[] = []
  const entities: Entity[] = []
  const subIntents: string[] = []
  
  // Primary intent detection with confidence scoring
  const intentPatterns: { pattern: RegExp, intent: Intent, confidence: number }[] = [
    { pattern: /(trend|forecast|future|season|what's next|upcoming)/, intent: 'trend-analysis', confidence: 0.9 },
    { pattern: /(portfolio|collection|presentation|showcase|body of work)/, intent: 'portfolio-review', confidence: 0.85 },
    { pattern: /(price|cost|charge|profit|worth|value|pricing|budget)/, intent: 'pricing-strategy', confidence: 0.9 },
    { pattern: /(fabric|material|textile|cloth|drape|weave|knit)/, intent: 'fabric-selection', confidence: 0.95 },
    { pattern: /(color|palette|tone|shade|hue|chroma|scheme|harmony)/, intent: 'color-theory', confidence: 0.95 },
    { pattern: /(sustain|eco|ethical|green|organic|recycled|circular)/, intent: 'sustainability', confidence: 0.9 },
    { pattern: /(career|job|brand|business|startup|freelance|industry)/, intent: 'career-advice', confidence: 0.85 },
    { pattern: /(feedback|critique|review|improve|better|opinion)/, intent: 'design-critique', confidence: 0.9 },
    { pattern: /(image|photo|picture|look|outfit|ensemble|style)/, intent: 'image-analysis', confidence: 0.8 },
    { pattern: /(sewing|pattern|draft|construct|tailor|fit|measure)/, intent: 'technical-skills', confidence: 0.95 },
    { pattern: /(brand|identity|logo|message|voice|target audience)/, intent: 'brand-development', confidence: 0.85 },
    { pattern: /(market|research|competition|audience|demographics)/, intent: 'market-research', confidence: 0.8 },
    { pattern: /(style|personal|wardrobe|look|aesthetic|vibe)/, intent: 'personal-style', confidence: 0.9 },
    { pattern: /(history|vintage|era|period|influence|inspiration)/, intent: 'fashion-history', confidence: 0.9 },
    { pattern: /(textile|fiber|yarn|dye|print|finish)/, intent: 'textile-science', confidence: 0.95 }
  ]

  // Check all patterns
  intentPatterns.forEach(({ pattern, intent, confidence }) => {
    if (pattern.test(t)) {
      detectedIntents.push({ intent, confidence })
    }
  })

  // Entity extraction
  entities.push(...extractEntities(t))
  
  // Sub-intent detection
  if (t.includes('how to')) subIntents.push('tutorial')
  if (t.includes('compare')) subIntents.push('comparison')
  if (t.includes('best') || t.includes('worst')) subIntents.push('evaluation')
  if (t.includes('why') || t.includes('reason')) subIntents.push('explanation')
  if (t.includes('example') || t.includes('case study')) subIntents.push('example')
  
  // Sentiment analysis
  const sentiment = analyzeSentiment(t)
  
  // Determine primary intent (highest confidence or general)
  let primaryIntent: Intent = 'general'
  let primaryConfidence = 0.5
  
  if (detectedIntents.length > 0) {
    detectedIntents.sort((a, b) => b.confidence - a.confidence)
    primaryIntent = detectedIntents[0].intent
    primaryConfidence = detectedIntents[0].confidence
  }

  return {
    intent: primaryIntent,
    confidence: primaryConfidence,
    subIntents,
    entities,
    sentiment
  }
}

function extractEntities(text: string): Entity[] {
  const entities: Entity[] = []
  
  // Material entities
  const materials = [
    'silk', 'cotton', 'wool', 'linen', 'polyester', 'nylon', 'rayon',
    'velvet', 'denim', 'leather', 'suede', 'chiffon', 'organza', 'tulle',
    'jersey', 'tweed', 'corduroy', 'cashmere', 'modal', 'lyocell'
  ]
  
  materials.forEach(material => {
    if (text.includes(material)) {
      entities.push({
        type: 'material',
        value: material,
        confidence: 0.9
      })
    }
  })
  
  // Color entities
  const colors = [
    'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
    'black', 'white', 'gray', 'brown', 'beige', 'navy', 'burgundy',
    'emerald', 'sapphire', 'ruby', 'amber', 'ivory', 'charcoal'
  ]
  
  colors.forEach(color => {
    if (text.includes(color)) {
      entities.push({
        type: 'color',
        value: color,
        confidence: 0.9
      })
    }
  })
  
  // Style entities
  const styles = [
    'minimalist', 'bohemian', 'streetwear', 'classic', 'avant-garde',
    'romantic', 'edgy', 'tailored', 'oversized', 'fitted', 'layered'
  ]
  
  styles.forEach(style => {
    if (text.includes(style)) {
      entities.push({
        type: 'style',
        value: style,
        confidence: 0.85
      })
    }
  })
  
  return entities
}

function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['love', 'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'beautiful']
  const negativeWords = ['hate', 'bad', 'terrible', 'awful', 'ugly', 'poor', 'wrong']
  
  const words = text.toLowerCase().split(/\W+/)
  
  let positiveCount = 0
  let negativeCount = 0
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++
    if (negativeWords.includes(word)) negativeCount++
  })
  
  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}