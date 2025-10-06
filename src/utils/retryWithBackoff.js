// src/utils/retryWithBackoff.js - EXPONENTIAL BACKOFF FOR FIREBASE
import toast from 'react-hot-toast';

/**
 * Retry a Firebase operation with exponential backoff
 * Handles quota exceeded and rate limit errors gracefully
 */
export async function retryWithBackoff(
  operation,
  maxRetries = 3,
  initialDelay = 1000,
  maxDelay = 10000,
  onRetry = null
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable =
        error.code === 'resource-exhausted' ||
        error.code === 'unavailable' ||
        error.code === 'deadline-exceeded' ||
        error.code === 'aborted' ||
        error.message?.includes('429') ||
        error.message?.includes('quota');

      if (!isRetryable || attempt === maxRetries) {
        // Not retryable or max retries reached
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      console.warn(
        `⚠️ Firebase operation failed (attempt ${attempt + 1}/${maxRetries + 1}). ` +
        `Retrying in ${Math.round(delay)}ms...`,
        error.code || error.message
      );

      // Call optional retry callback
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      // Show user-friendly message on first retry
      if (attempt === 0) {
        toast.loading('Server busy, retrying...', {
          duration: delay,
          id: 'firebase-retry'
        });
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  console.error('❌ Firebase operation failed after all retries:', lastError);

  // Show user-friendly error
  if (lastError.code === 'resource-exhausted' || lastError.message?.includes('quota')) {
    toast.error('Service temporarily unavailable. Please try again in a few minutes.', {
      duration: 5000,
      id: 'firebase-quota-error'
    });
  } else {
    toast.error('Operation failed. Please check your connection and try again.', {
      duration: 4000,
      id: 'firebase-error'
    });
  }

  throw lastError;
}

/**
 * Debounce function for Firebase operations
 * Prevents rapid successive calls
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for Firebase operations
 * Limits execution frequency
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Batch multiple Firebase reads into fewer operations
 */
export class BatchReader {
  constructor(batchSize = 10, delay = 100) {
    this.batchSize = batchSize;
    this.delay = delay;
    this.queue = [];
    this.processing = false;
  }

  async read(ref, resolver) {
    return new Promise((resolve, reject) => {
      this.queue.push({ ref, resolver, resolve, reject });
      this.processBatch();
    });
  }

  async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    // Wait a bit to collect more requests
    await new Promise(resolve => setTimeout(resolve, this.delay));

    // Process batch
    const batch = this.queue.splice(0, this.batchSize);

    try {
      const results = await Promise.all(
        batch.map(item => item.resolver(item.ref))
      );

      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => item.reject(error));
    }

    this.processing = false;

    // Process remaining queue
    if (this.queue.length > 0) {
      this.processBatch();
    }
  }
}
