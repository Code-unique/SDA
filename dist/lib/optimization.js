// lib/optimization.ts
// Debounce utility
export function debounce(func, wait) {
    let timeout = null;
    return (...args) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
// Throttle utility
export function throttle(func, limit) {
    let inThrottle = false;
    let lastFunc;
    let lastRan;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            lastRan = Date.now();
            inThrottle = true;
        }
        else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if (Date.now() - lastRan >= limit) {
                    func(...args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}
// Local storage with error handling
export const safeLocalStorage = {
    get: (key) => {
        if (typeof window === 'undefined')
            return null;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        }
        catch (error) {
            console.error('LocalStorage get error:', error);
            return null;
        }
    },
    set: (key, value) => {
        if (typeof window === 'undefined')
            return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch (error) {
            console.error('LocalStorage set error:', error);
        }
    },
    remove: (key) => {
        if (typeof window === 'undefined')
            return;
        try {
            localStorage.removeItem(key);
        }
        catch (error) {
            console.error('LocalStorage remove error:', error);
        }
    }
};
// Performance measurement
export const perf = {
    start: (label) => {
        if (process.env.NODE_ENV === 'development') {
            console.time(label);
        }
    },
    end: (label) => {
        if (process.env.NODE_ENV === 'development') {
            console.timeEnd(label);
        }
    },
    measure: (label, func) => {
        return (...args) => {
            perf.start(label);
            const result = func(...args);
            perf.end(label);
            return result;
        };
    }
};
// Virtual scrolling helper
export class VirtualScrollHelper {
    constructor() {
        this.observer = null;
        this.visibleItems = new Set();
    }
    observe(element, id) {
        if (!this.observer) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.visibleItems.add(id);
                    }
                    else {
                        this.visibleItems.delete(id);
                    }
                });
            }, { threshold: 0.1 });
        }
        this.observer.observe(element);
    }
    unobserve(element) {
        var _a;
        (_a = this.observer) === null || _a === void 0 ? void 0 : _a.unobserve(element);
    }
    isVisible(id) {
        return this.visibleItems.has(id);
    }
    destroy() {
        var _a;
        (_a = this.observer) === null || _a === void 0 ? void 0 : _a.disconnect();
        this.observer = null;
        this.visibleItems.clear();
    }
}
