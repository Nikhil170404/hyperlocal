// src/contexts/CartContext.jsx - WITH FIRESTORE PERSISTENCE
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CartStateContext = createContext();
const CartActionsContext = createContext();

export function useCartState() {
  const context = useContext(CartStateContext);
  if (!context) {
    throw new Error('useCartState must be used within CartProvider');
  }
  return context;
}

export function useCartActions() {
  const context = useContext(CartActionsContext);
  if (!context) {
    throw new Error('useCartActions must be used within CartProvider');
  }
  return context;
}

export function useCart() {
  return {
    ...useCartState(),
    ...useCartActions()
  };
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { currentUser } = useAuth();
  
  const saveTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Real-time cart sync with Firestore
  useEffect(() => {
    if (!currentUser) {
      setCartItems([]);
      setLoading(false);
      return;
    }

    const cartRef = doc(db, 'carts', currentUser.uid);
    
    // Subscribe to real-time updates
    unsubscribeRef.current = onSnapshot(
      cartRef,
      (snapshot) => {
        if (isMountedRef.current) {
          if (snapshot.exists()) {
            const data = snapshot.data();
            setCartItems(data.items || []);
            console.log('📥 Cart loaded from Firestore:', data.items?.length || 0, 'items');
          } else {
            setCartItems([]);
          }
          setLoading(false);
        }
      },
      (error) => {
        console.error('❌ Cart subscription error:', error);
        if (isMountedRef.current) {
          setCartItems([]);
          setLoading(false);
        }
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [currentUser]);

  // Save cart to Firestore (immediate, no debounce for better UX)
  const saveCart = useCallback(async (items) => {
    if (!currentUser) return;

    try {
      setSyncing(true);
      const cartRef = doc(db, 'carts', currentUser.uid);
      
      await setDoc(cartRef, {
        userId: currentUser.uid,
        items: items,
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        totalAmount: items.reduce((sum, item) => sum + (item.groupPrice * item.quantity), 0),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Cart saved to Firestore');
    } catch (error) {
      console.error('❌ Failed to save cart:', error);
      toast.error('Failed to save cart');
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  }, [currentUser]);

  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!currentUser) {
      toast.error('Please login to add items to cart');
      return;
    }

    const existingItem = cartItems.find(item => item.id === product.id);
    
    let newItems;
    if (existingItem) {
      newItems = cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      toast.success('Cart updated!', { icon: '🛒', duration: 2000 });
    } else {
      newItems = [...cartItems, { ...product, quantity }];
      toast.success('Added to cart!', { icon: '✅', duration: 2000 });
    }
    
    setCartItems(newItems);
    await saveCart(newItems);
  }, [currentUser, cartItems, saveCart]);

  const removeFromCart = useCallback(async (productId) => {
    const newItems = cartItems.filter(item => item.id !== productId);
    setCartItems(newItems);
    await saveCart(newItems);
    toast.success('Item removed', { duration: 2000 });
  }, [cartItems, saveCart]);

  const updateQuantity = useCallback(async (productId, quantity) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const newItems = cartItems.map(item =>
      item.id === productId ? { ...item, quantity } : item
    );
    setCartItems(newItems);
    await saveCart(newItems);
  }, [cartItems, saveCart, removeFromCart]);

  const incrementQuantity = useCallback(async (productId) => {
    const newItems = cartItems.map(item =>
      item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    );
    setCartItems(newItems);
    await saveCart(newItems);
  }, [cartItems, saveCart]);

  const decrementQuantity = useCallback(async (productId) => {
    const item = cartItems.find(i => i.id === productId);
    if (!item) return;
    
    if (item.quantity <= 1) {
      await removeFromCart(productId);
      return;
    }
    
    const newItems = cartItems.map(i =>
      i.id === productId ? { ...i, quantity: i.quantity - 1 } : i
    );
    setCartItems(newItems);
    await saveCart(newItems);
  }, [cartItems, saveCart, removeFromCart]);

  const clearCart = useCallback(async () => {
    if (!currentUser) return;

    try {
      const cartRef = doc(db, 'carts', currentUser.uid);
      await deleteDoc(cartRef);
      setCartItems([]);
      toast.success('Cart cleared', { duration: 2000 });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  }, [currentUser]);

  const calculations = useMemo(() => {
    const total = cartItems.reduce(
      (sum, item) => sum + (item.groupPrice * item.quantity), 
      0
    );
    
    const count = cartItems.reduce(
      (sum, item) => sum + item.quantity, 
      0
    );
    
    const retailTotal = cartItems.reduce(
      (sum, item) => sum + (item.retailPrice * item.quantity), 
      0
    );
    
    const savings = retailTotal - total;
    
    return { total, count, retailTotal, savings };
  }, [cartItems]);

  const isInCart = useCallback((productId) => {
    return cartItems.some(item => item.id === productId);
  }, [cartItems]);

  const getItemQuantity = useCallback((productId) => {
    const item = cartItems.find(i => i.id === productId);
    return item ? item.quantity : 0;
  }, [cartItems]);

  const stateValue = useMemo(() => ({
    cartItems,
    loading,
    syncing,
    cartTotal: calculations.total,
    cartCount: calculations.count,
    retailTotal: calculations.retailTotal,
    totalSavings: calculations.savings
  }), [cartItems, loading, syncing, calculations]);

  const actionsValue = useMemo(() => ({
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    getCartTotal: () => calculations.total,
    getCartCount: () => calculations.count,
    getRetailTotal: () => calculations.retailTotal,
    getTotalSavings: () => calculations.savings
  }), [
    addToCart,
    removeFromCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    isInCart,
    getItemQuantity,
    calculations
  ]);

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartActionsContext.Provider value={actionsValue}>
        {children}
      </CartActionsContext.Provider>
    </CartStateContext.Provider>
  );
}

export default CartProvider;