// src/utils/helpers.js - Enhanced with better error handling and utilities

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '';

  try {
    // Handle Firebase Timestamp
    if (date.seconds) {
      date = new Date(date.seconds * 1000);
    } else if (date.toMillis && typeof date.toMillis === 'function') {
      date = new Date(date.toMillis());
    } else if (date.toDate && typeof date.toDate === 'function') {
      date = date.toDate();
    } else if (typeof date === 'number') {
      date = new Date(date);
    }

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatDateTime = (date) => {
  if (!date) return '';

  try {
    // Handle Firebase Timestamp
    if (date.seconds) {
      date = new Date(date.seconds * 1000);
    } else if (date.toMillis && typeof date.toMillis === 'function') {
      date = new Date(date.toMillis());
    } else if (date.toDate && typeof date.toDate === 'function') {
      date = date.toDate();
    } else if (typeof date === 'number') {
      date = new Date(date);
    }

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

export const calculateSavings = (retailPrice, groupPrice) => {
  const savings = retailPrice - groupPrice;
  const percentage = Math.round((savings / retailPrice) * 100);
  return { savings, percentage };
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        // Fallback to Mumbai coordinates
        resolve({
          latitude: 19.0760,
          longitude: 72.8777,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

export const validatePincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

// Timestamp conversion helper
export const convertToTimestamp = (date) => {
  if (!date) return null;

  try {
    // Already a Firebase Timestamp
    if (date.toMillis && typeof date.toMillis === 'function') {
      return date;
    }

    // JavaScript Date
    if (date instanceof Date) {
      return date.getTime();
    }

    // Number (milliseconds)
    if (typeof date === 'number') {
      return date;
    }

    // Firestore Timestamp with seconds
    if (date.seconds) {
      return date.seconds * 1000;
    }

    return null;
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
};

// Format time remaining
export const formatTimeRemaining = (endTime) => {
  if (!endTime) return '';

  try {
    const end = convertToTimestamp(endTime);
    if (!end) return '';

    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return "${hours}h ${minutes}m";
    } else if (minutes > 0) {
      return "${minutes}m ${seconds}s";
    } else {
      return "${seconds}s";
    }
  } catch (error) {
    console.error('Error formatting time remaining:', error);
    return '';
  }
};

// Sanitize user input
export const sanitizeInput = (input, maxLength = 1000) => {
  if (!input || typeof input !== 'string') return '';

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
};

// Validate product data
export const validateProductData = (product) => {
  const errors = [];

  if (!product.name || product.name.trim().length < 3) {
    errors.push('Product name must be at least 3 characters');
  }

  if (!product.groupPrice || product.groupPrice <= 0) {
    errors.push('Group price must be greater than 0');
  }

  if (!product.retailPrice || product.retailPrice <= 0) {
    errors.push('Retail price must be greater than 0');
  }

  if (product.groupPrice >= product.retailPrice) {
    errors.push('Group price must be less than retail price');
  }

  if (!product.minQuantity || product.minQuantity < 1) {
    errors.push('Minimum quantity must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Truncate text
export const truncate = (text, length = 100) => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};
