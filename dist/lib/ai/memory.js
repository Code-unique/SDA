export class SimpleMemory {
    constructor(maxSize = 20) {
        this.memories = [];
        this.maxSize = maxSize;
    }
    addMemory(item) {
        const memory = Object.assign(Object.assign({}, item), { timestamp: new Date() });
        this.memories.push(memory);
        // Keep memory size manageable
        if (this.memories.length > this.maxSize) {
            this.memories = this.memories.slice(-this.maxSize);
        }
        return memory;
    }
    getRecentMemories(count = 5) {
        return this.memories.slice(-count);
    }
    getAllMemories() {
        return [...this.memories];
    }
    clearMemories() {
        this.memories = [];
    }
    summarize() {
        if (this.memories.length === 0)
            return '';
        const userMessages = this.memories
            .filter(m => m.role === 'user')
            .slice(-3)
            .map(m => m.content.substring(0, 100));
        return `Recent topics: ${userMessages.join('; ')}`;
    }
}
