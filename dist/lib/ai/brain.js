// lib/ai/brain.ts
export function generateResponse(message, context = []) {
    const lowerMessage = message.toLowerCase();
    // Extract key information from message
    const hasColors = ['red', 'blue', 'green', 'yellow', 'purple', 'black', 'white', 'pink', 'orange', 'brown']
        .some(color => lowerMessage.includes(color));
    const hasFabrics = ['silk', 'cotton', 'wool', 'linen', 'denim', 'leather', 'polyester', 'rayon', 'velvet']
        .some(fabric => lowerMessage.includes(fabric));
    const hasTrends = lowerMessage.includes('trend') || lowerMessage.includes('latest') || lowerMessage.includes('2024');
    const hasPortfolio = lowerMessage.includes('portfolio') || lowerMessage.includes('collection');
    const hasBusiness = lowerMessage.includes('business') || lowerMessage.includes('price') || lowerMessage.includes('cost');
    // Context from previous messages
    const recentContext = context.slice(-3).map(c => c.content).join(' ');
    const hasPreviousDiscussion = context.length > 0;
    // Generate appropriate response
    if (hasTrends) {
        return `Based on your interest in fashion trends, here's what's relevant for 2024:

**Key Trends to Watch:**
1. **Quiet Luxury:** Understated elegance with focus on impeccable tailoring and luxury fabrics
2. **Sustainable Innovation:** Bio-fabricated materials and circular design principles
3. **Gender-Fluid Fashion:** Breaking traditional boundaries with versatile silhouettes
4. **Tech-Integrated Wear:** Smart fabrics and functional design elements

${hasPreviousDiscussion ? `\n**Connecting to our previous discussion:** This aligns with what we discussed about ${recentContext.substring(0, 100)}...` : ''}

**Actionable Steps:**
• Research sustainable fabric options for your designs
• Experiment with modular garment concepts
• Study successful gender-fluid collections

What specific trend aspect would you like to explore further?`;
    }
    if (hasPortfolio) {
        return `For your fashion portfolio, focus on these key elements:

**Essential Portfolio Components:**
1. **Concept Development:** Show your creative process from inspiration to final design
2. **Technical Skills:** Include technical flats, spec sheets, and construction details
3. **Finished Work:** Professional photography of completed garments
4. **Storytelling:** Each collection should have a clear narrative

${hasPreviousDiscussion ? `\n**Building on our conversation:** Remember to incorporate ${recentContext.substring(0, 80)}...` : ''}

**Portfolio Tips:**
• Quality over quantity (5-7 strong pieces)
• Cohesive visual presentation
• Include process work to show thinking
• Tailor content to your target audience

Would you like specific feedback on your portfolio structure or content?`;
    }
    if (hasBusiness) {
        return `Fashion business considerations:

**Pricing Strategy:**
• Materials cost × 2 (wholesale) × 2 (retail) = retail price
• Consider: Labor, overhead, marketing, and profit margin
• Factor in perceived value and brand positioning

**Business Development:**
1. **Brand Identity:** Clear message and visual language
2. **Target Market:** Specific audience focus
3. **Distribution:** Direct-to-consumer vs wholesale
4. **Marketing:** Social media, collaborations, PR

${hasPreviousDiscussion ? `\n**Regarding your previous question:** This relates to ${recentContext.substring(0, 80)}...` : ''}

**Next Steps:**
• Define your unique value proposition
• Create a simple business plan
• Start small and validate with customers

What specific business aspect would you like to discuss?`;
    }
    if (hasColors && hasFabrics) {
        return `**Design Analysis:**

Your combination of ${hasColors ? 'color' : ''}${hasColors && hasFabrics ? ' and ' : ''}${hasFabrics ? 'fabric' : ''} shows good design thinking.

**Color-Fabric Harmony:**
• Consider how colors interact with fabric textures
• Light colors on heavy fabrics create different effects than dark colors on light fabrics
• Fabric drape affects color perception

**Design Considerations:**
1. **Silhouette:** How does fabric choice affect the garment shape?
2. **Movement:** Consider fabric behavior during wear
3. **Seasonality:** Appropriate colors and fabrics for the intended season
4. **Care:** Practical considerations for garment maintenance

${hasPreviousDiscussion ? `\n**Continuing our design discussion:** This builds on ${recentContext.substring(0, 80)}...` : ''}

**Would you like me to:**
1. Suggest complementary colors/fabrics?
2. Critique a specific design concept?
3. Provide technical construction advice?`;
    }
    // Default response
    return `Thank you for your question about fashion design. As your AI Fashion Coach, I can provide expert guidance on:

**Core Areas:**
• **Trend Analysis:** Current and emerging fashion movements
• **Design Critique:** Professional feedback on your designs
• **Portfolio Development:** Building compelling presentations
• **Business Strategy:** Pricing, marketing, and brand development
• **Technical Skills:** Construction, pattern-making, and fabric selection
• **Sustainability:** Ethical and eco-friendly practices

${hasPreviousDiscussion ? `\n**Previous Context:** We've discussed ${recentContext.substring(0, 100)}...` : ''}

**How can I specifically assist you today? You can:**
1. Describe a design for feedback
2. Ask about current fashion trends
3. Request portfolio advice
4. Discuss business challenges
5. Get technical guidance
6. Explore sustainable options

I'm here to help you grow as a fashion professional!`;
}
