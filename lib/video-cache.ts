// lib/video-cache.ts
export class VideoCacheManager {
  private static DB_NAME = 'VideoCacheDB'
  private static STORE_NAME = 'videos'
  private static db: IDBDatabase | null = null

  static async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve()
        return
      }

      const request = indexedDB.open(this.DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'url' })
          store.createIndex('timestamp', 'timestamp', { unique: false })
          store.createIndex('size', 'size', { unique: false })
        }
      }
    })
  }

  static async cacheVideo(url: string, blob: Blob): Promise<void> {
    await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      
      const videoData = {
        url,
        blob,
        timestamp: Date.now(),
        size: blob.size
      }

      const request = store.put(videoData)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  static async getCachedVideo(url: string): Promise<Blob | null> {
    await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.get(url)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.blob)
        } else {
          resolve(null)
        }
      }
    })
  }

  static async isCached(url: string): Promise<boolean> {
    const blob = await this.getCachedVideo(url)
    return blob !== null
  }

  static async clearOldCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite')
      const store = transaction.objectStore(this.STORE_NAME)
      const index = store.index('timestamp')
      const cutoff = Date.now() - maxAge

      const request = index.openCursor(IDBKeyRange.upperBound(cutoff))

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          store.delete(cursor.primaryKey)
          cursor.continue()
        } else {
          resolve()
        }
      }
    })
  }

  static async getCacheSize(): Promise<number> {
    await this.initialize()
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly')
      const store = transaction.objectStore(this.STORE_NAME)
      const request = store.openCursor()
      let totalSize = 0

      request.onerror = () => reject(request.error)
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          totalSize += cursor.value.size
          cursor.continue()
        } else {
          resolve(totalSize)
        }
      }
    })
  }
}