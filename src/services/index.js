// src/services/index.js - Centralized Service Exports
import { enhancedGroupService } from './groupService';
import { enhancedOrderService } from './orderService';

// Re-export services
export { enhancedGroupService as groupService };
export { enhancedOrderService as orderService };

// Product Service
import { 
  collection, 
  getDocs, 
  addDoc,
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const productService = {
  // Get all products
  async getProducts(category = null) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('isActive', '==', true));
      
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get product categories
  async getCategories() {
    try {
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Add product (admin only)
  async addProduct(productData) {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        views: 0,
        favorites: 0,
        sales: 0
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  },

  // Search products
  async searchProducts(searchTerm) {
    try {
      const productsRef = collection(db, 'products');
      const snapshot = await getDocs(productsRef);
      
      const allProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side filtering for search
      const searchLower = searchTerm.toLowerCase();
      return allProducts.filter(product => 
        product.name.toLowerCase().includes(searchLower) ||
        product.description?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }
};

// Default export
export default {
  groupService: enhancedGroupService,
  orderService: enhancedOrderService,
  productService
};