// src/contexts/CartContext.jsx - Firestore-based Cart (No localStorage)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartContext = createContext();

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Subscribe to cart changes in Firestore
  useEffect(() => {
    if (!currentUser) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const cartRef = doc(db, 'carts', currentUser.uid);
    
    const unsubscribe = onSnapshot(cartRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCartItems(data.items || []);
      } else {
        setCartItems([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading cart:', error);
      setCartItems([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Save cart to Firestore
  const saveCart = async (items) => {
    if (!currentUser) return;

    try {
      const cartRef = doc(db, 'carts', currentUser.uid);
      await setDoc(cartRef, {
        userId: currentUser.uid,
        items: items,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving cart:', error);
      toast.error('Failed to save cart');
    }
  };

  // Add item to cart
  const addToCart = async (product, quantity = 1) => {
    if (!currentUser) {
      toast.error('Please login to add items to cart');
      return;
    }

    const existingItem = cartItems.find(item => item.id === product.id);
    
    let newCartItems;
    if (existingItem) {
      newCartItems = cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      toast.success('Cart updated!', { icon: '🛒' });
    } else {
      newCartItems = [...cartItems, { ...product, quantity }];
      toast.success('Added to cart!', { icon: '✅' });
    }
    
    setCartItems(newCartItems);
    await saveCart(newCartItems);
  };

  // Remove item from cart
  const removeFromCart = async (productId) => {
    const newCartItems = cartItems.filter(item => item.id !== productId);
    setCartItems(newCartItems);
    await saveCart(newCartItems);
    toast.success('Item removed from cart');
  };

  // Update item quantity
  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const newCartItems = cartItems.map(item =>
      item.id === productId ? { ...item, quantity } : item
    );
    
    setCartItems(newCartItems);
    await saveCart(newCartItems);
  };

  // Increment quantity
  const incrementQuantity = async (productId) => {
    const item = cartItems.find(i => i.id === productId);
    if (item) {
      await updateQuantity(productId, item.quantity + 1);
    }
  };

  // Decrement quantity
  const decrementQuantity = async (productId) => {
    const item = cartItems.find(i => i.id === productId);
    if (item) {
      await updateQuantity(productId, item.quantity - 1);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    if (!currentUser) return;

    try {
      const cartRef = doc(db, 'carts', currentUser.uid);
      await deleteDoc(cartRef);
      setCartItems([]);
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  // Get cart total
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.groupPrice * item.quantity), 0);
  };

  // Get cart count
  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  // Get retail total (for savings calculation)
  const getRetailTotal = () => {
    return cartItems.reduce((total, item) => total + (item.retailPrice * item.quantity), 0);
  };

  // Get total savings
  const getTotalSavings = () => {
    return getRetailTotal() - getCartTotal();
  };

  // Check if item is in cart
  const isInCart = (productId) => {
    return cartItems.some(item => item.id === productId);
  };

  // Get item quantity
  const getItemQuantity = (productId) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.quantity : 0;
  };

  const value = {
    cartItems,
    loading,
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    getRetailTotal,
    getTotalSavings,
    isInCart,
    getItemQuantity
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}