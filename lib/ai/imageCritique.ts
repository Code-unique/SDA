// lib/ai/imageCritique.ts
export interface ImageAnalysis {
  silhouette: string
  proportion: string
  colorHarmony: string
  fabricBehavior: string
  styling: string
  overallAssessment: string
  suggestions: string[]
}

export class ImageCritiqueEngine {
  private colorTheory: Map<string, string[]> = new Map()
  
  constructor() {
    this.initializeColorTheory()
  }
  
  private initializeColorTheory() {
    this.colorTheory.set('analogous', [
      "Creates harmonious, serene looks",
      "Best for cohesive, subtle outfits",
      "Add contrast with texture variation"
    ])
    
    this.colorTheory.set('complementary', [
      "High contrast and dynamic",
      "Creates visual excitement",
      "Use 70-30 ratio for balance"
    ])
    
    this.colorTheory.set('monochromatic', [
      "Sophisticated and elongating",
      "Relies on texture and value variation",
      "Add metallic or shiny accents"
    ])
  }
  
  analyzeOutfit(description: string): ImageAnalysis {
    // Parse description for key elements
    const elements = this.parseDescription(description)
    
    return {
      silhouette: this.analyzeSilhouette(elements),
      proportion: this.analyzeProportion(elements),
      colorHarmony: this.analyzeColorHarmony(elements),
      fabricBehavior: this.analyzeFabricBehavior(elements),
      styling: this.analyzeStyling(elements),
      overallAssessment: this.generateOverallAssessment(elements),
      suggestions: this.generateSuggestions(elements)
    }
  }
  
  private parseDescription(description: string): Record<string, any> {
    const lowerDesc = description.toLowerCase()
    
    return {
      hasJacket: /jacket|blazer|coat/.test(lowerDesc),
      hasDress: /dress|gown/.test(lowerDesc),
      hasSkirt: /skirt/.test(lowerDesc),
      hasPants: /pants|trousers|jeans/.test(lowerDesc),
      colors: this.extractColors(lowerDesc),
      fabrics: this.extractFabrics(lowerDesc),
      fit: this.extractFit(lowerDesc),
      occasion: this.extractOccasion(lowerDesc)
    }
  }
  
  private extractColors(text: string): string[] {
    const colorWords = [
      'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
      'black', 'white', 'gray', 'brown', 'beige', 'navy', 'burgundy',
      'emerald', 'sapphire', 'ruby', 'amber', 'ivory', 'charcoal'
    ]
    
    return colorWords.filter(color => text.includes(color))
  }
  
  private extractFabrics(text: string): string[] {
    const fabricWords = [
      'silk', 'cotton', 'wool', 'linen', 'polyester', 'denim', 'leather',
      'velvet', 'chiffon', 'satin', 'jersey', 'tweed', 'corduroy'
    ]
    
    return fabricWords.filter(fabric => text.includes(fabric))
  }
  
  private extractFit(text: string): string {
    if (/tight|fitted|form-fitting/.test(text)) return 'fitted'
    if (/loose|oversized|baggy/.test(text)) return 'loose'
    if (/tailored|structured/.test(text)) return 'tailored'
    return 'standard'
  }
  
  private extractOccasion(text: string): string {
    if (/work|office|business/.test(text)) return 'professional'
    if (/party|evening|gala/.test(text)) return 'formal'
    if (/casual|everyday|street/.test(text)) return 'casual'
    if (/wedding|ceremony/.test(text)) return 'ceremonial'
    return 'general'
  }
  
  private analyzeSilhouette(elements: Record<string, any>): string {
    if (elements.hasDress) {
      return elements.fit === 'fitted' 
        ? "Defined hourglass silhouette creates elegant, feminine lines"
        : "Flowing silhouette offers comfort and movement"
    }
    
    if (elements.hasJacket && elements.hasPants) {
      return "Structured silhouette with clear vertical lines for professional appeal"
    }
    
    return "Consider defining your silhouette with waist emphasis or vertical lines"
  }
  
  private analyzeColorHarmony(elements: Record<string, any>): string {
    const colors = elements.colors
    
    if (colors.length === 0) return "Monochromatic or neutral palette offers versatility"
    if (colors.length === 1) return "Single color focus creates strong visual impact"
    
    // Simple color harmony analysis
    const isComplementary = colors.includes('blue') && colors.includes('orange') ||
                           colors.includes('red') && colors.includes('green')
    
    return isComplementary
      ? "Complementary colors create dynamic contrast and visual interest"
      : "Color combination shows thoughtful coordination"
  }
  
  private analyzeFabricBehavior(elements: Record<string, any>): string {
    const fabrics = elements.fabrics
    
    if (fabrics.length === 0) return "Consider how fabric choice affects drape and movement"
    
    const hasHeavy = fabrics.some((f: string) => ['wool', 'denim', 'tweed'].includes(f))
    const hasLight = fabrics.some((f: string) => ['silk', 'chiffon', 'linen'].includes(f))
    
    if (hasHeavy && hasLight) {
      return "Excellent fabric contrast balancing structure with fluidity"
    } else if (hasHeavy) {
      return "Structured fabrics provide shape retention and durability"
    } else {
      return "Lightweight fabrics offer beautiful drape and movement"
    }
  }
  
  private analyzeProportion(elements: Record<string, any>): string {
    const rules = [
      "High-waisted bottoms elongate legs",
      "Cropped tops balance volume below",
      "V-necks create vertical elongation",
      "Waist definition improves silhouette"
    ]
    
    return `Proportion principles: ${rules.join('; ')}. Apply based on your body goals.`
  }
  
  private analyzeStyling(elements: Record<string, any>): string {
    const occasion = elements.occasion
    
    const stylingTips: Record<string, string> = {
      'professional': "Focus on clean lines, minimal accessories, and cohesive color story",
      'formal': "Elevate with statement pieces, luxurious fabrics, and refined details",
      'casual': "Emphasize comfort, personal expression, and versatile layering",
      'ceremonial': "Prioritize elegance, appropriate coverage, and special occasion fabrics"
    }
    
    return stylingTips[occasion] || "Styling should support your intention for the outfit"
  }
  
  private generateOverallAssessment(elements: Record<string, any>): string {
    const strengths = []
    const improvements = []
    
    if (elements.colors.length > 0) {
      strengths.push("thoughtful color selection")
    } else {
      improvements.push("consider adding intentional color")
    }
    
    if (elements.fabrics.length > 1) {
      strengths.push("good fabric mixing")
    }
    
    if (elements.hasJacket) {
      strengths.push("layering for dimension")
    }
    
    const strengthText = strengths.length > 0 
      ? `Strengths: ${strengths.join(', ')}. `
      : ''
    
    const improvementText = improvements.length > 0
      ? `Consider: ${improvements.join(', ')}.`
      : 'Overall cohesive look.'
    
    return `${strengthText}${improvementText}`
  }
  
  private generateSuggestions(elements: Record<string, any>): string[] {
    const suggestions = []
    
    if (elements.colors.length === 1) {
      suggestions.push("Add a contrasting accessory for visual interest")
    }
    
    if (!elements.hasJacket && elements.occasion === 'professional') {
      suggestions.push("Consider adding a tailored blazer for polish")
    }
    
    if (elements.fit === 'loose') {
      suggestions.push("Define waist with a belt or tuck for silhouette")
    }
    
    if (suggestions.length === 0) {
      suggestions.push("Experiment with texture contrast for added dimension")
      suggestions.push("Consider how accessories complete the story")
    }
    
    return suggestions.slice(0, 3)
  }
  
  generateCritique(description: string): string {
    const analysis = this.analyzeOutfit(description)
    
    return `
**FASHION CRITIQUE**

**Silhouette:** ${analysis.silhouette}

**Proportion:** ${analysis.proportion}

**Color Harmony:** ${analysis.colorHarmony}

**Fabric Behavior:** ${analysis.fabricBehavior}

**Styling:** ${analysis.styling}

**Overall:** ${analysis.overallAssessment}

**Suggestions for Enhancement:**
${analysis.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Next Steps:**
• Try one suggestion and observe the effect
• Consider how the outfit makes you feel
• Photograph from multiple angles to assess

Would you like me to elaborate on any of these points or critique another aspect?
    `.trim()
  }
}

export const imageCritiqueEngine = new ImageCritiqueEngine()