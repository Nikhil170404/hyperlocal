// src/utils/firebaseCache.js - REQUEST CACHING & DEBOUNCING
import { getDoc, getDocs } from 'firebase/firestore';

/**
 * Simple in-memory cache for Firebase documents
 * Reduces read operations and quota usage
 */
class FirebaseCache {
  constructor(ttl = 30000) { // 30 seconds default TTL
    this.cache = new Map();
    this.ttl = ttl;
    this.pendingRequests = new Map(); // Deduplication
  }

  /**
   * Generate cache key from Firestore reference
   */
  getCacheKey(ref) {
    return ref.path;
  }

  /**
   * Get cached value or fetch from Firebase
   */
  async getDoc(ref, forceFresh = false) {
    const key = this.getCacheKey(ref);

    // Return cached value if valid
    if (!forceFresh && this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.ttl) {
        console.log(`📦 Cache HIT: ${key}`);
        return cached.data;
      }
    }

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Waiting for pending request: ${key}`);
      return await this.pendingRequests.get(key);
    }

    // Fetch from Firebase
    console.log(`🔄 Cache MISS: ${key} - Fetching from Firebase`);
    const promise = getDoc(ref).then(doc => {
      const data = doc.exists() ? { id: doc.id, ...doc.data() } : null;

      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });

      // Remove from pending
      this.pendingRequests.delete(key);

      return data;
    }).catch(error => {
      // Remove from pending on error
      this.pendingRequests.delete(key);
      throw error;
    });

    // Store pending request
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * Get cached collection or fetch from Firebase
   */
  async getDocs(query, forceFresh = false) {
    // For queries, we use a simple string representation as key
    // This is a basic implementation - you might want to improve this
    const key = `query_${JSON.stringify(query._query)}`;

    if (!forceFresh && this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (Date.now() - cached.timestamp < this.ttl) {
        console.log(`📦 Cache HIT: ${key}`);
        return cached.data;
      }
    }

    // Deduplicate concurrent requests
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ Waiting for pending query: ${key}`);
      return await this.pendingRequests.get(key);
    }

    console.log(`🔄 Cache MISS: ${key} - Fetching from Firebase`);
    const promise = getDocs(query).then(snapshot => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.cache.set(key, {
        data,
        timestamp: Date.now()
      });

      this.pendingRequests.delete(key);

      return data;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * Invalidate cache for a specific document
   */
  invalidate(ref) {
    const key = this.getCacheKey(ref);
    this.cache.delete(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        console.log(`🗑️ Cache invalidated: ${key}`);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log('🗑️ Cache cleared completely');
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      pending: this.pendingRequests.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
export const firebaseCache = new FirebaseCache(30000); // 30 seconds TTL

// Export class for custom instances
export default FirebaseCache;
