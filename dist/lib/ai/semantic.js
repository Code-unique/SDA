export function semanticRecall(memory, input) {
    const keywords = input.toLowerCase().split(/\W+/);
    return memory.filter(m => keywords.some(k => m.toLowerCase().includes(k))).slice(-3);
}
