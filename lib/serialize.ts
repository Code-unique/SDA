import { SerializedLiveClass } from '@/types/live-class';

export function serializeMongoData<T>(doc: T | T[] | null): any {
  if (!doc) return doc;
  
  // Handle arrays
  if (Array.isArray(doc)) {
    return doc.map(item => serializeMongoData(item));
  }
  
  // Handle objects
  if (doc && typeof doc === 'object') {
    const serialized: any = {};
    
    // Convert to plain object if it's a Mongoose document
    const plainDoc = JSON.parse(JSON.stringify(doc));
    
    for (const key in plainDoc) {
      const value = plainDoc[key];
      
      // Convert _id to string
      if (key === '_id') {
        serialized[key] = value?.toString() || value;
      }
      // Convert dates to ISO strings
      else if (value instanceof Date || (value && typeof value === 'object' && value.toISOString)) {
        serialized[key] = new Date(value).toISOString();
      }
      // Handle nested objects/arrays
      else if (value && typeof value === 'object') {
        serialized[key] = serializeMongoData(value);
      }
      else {
        serialized[key] = value;
      }
    }
    return serialized;
  }
  
  return doc;
}

// Type-safe wrapper for LiveClass serialization
export function serializeLiveClass(doc: any): SerializedLiveClass {
  return serializeMongoData(doc) as SerializedLiveClass;
}

export function serializeLiveClasses(docs: any[]): SerializedLiveClass[] {
  return docs.map(doc => serializeLiveClass(doc));
}