// src/contexts/CartContext.jsx - FIXED INITIALIZATION
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
  const [initialized, setInitialized] = useState(false);
  const { currentUser } = useAuth();
  
  const saveTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const unsubscribeRef = useRef(null);
  const initTimeoutRef = useRef(null);
  const localStorageKey = 'groupbuy_cart';

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  // MAIN INITIALIZATION EFFECT
  useEffect(() => {
    let mounted = true;
    
    const initializeCart = async () => {
      try {
        console.log('🔄 Initializing cart...');
        setLoading(true);

        // Load from localStorage immediately
        const localKey = currentUser 
          ? `${localStorageKey}_${currentUser.uid}` 
          : localStorageKey;
        
        const localCart = localStorage.getItem(localKey);
        if (localCart) {
          try {
            const parsed = JSON.parse(localCart);
            if (mounted) {
              setCartItems(parsed);
              console.log('📦 Cart loaded from localStorage:', parsed.length, 'items');
            }
          } catch (error) {
            console.error('Error parsing localStorage cart:', error);
          }
        }

        // Set initialization timeout (3 seconds max)
        initTimeoutRef.current = setTimeout(() => {
          if (mounted && !initialized) {
            console.log('⏰ Cart initialization timeout - forcing completion');
            setLoading(false);
            setInitialized(true);
          }
        }, 3000);

        // For logged-in users, sync with Firestore
        if (currentUser) {
          const cartRef = doc(db, 'carts', currentUser.uid);
          
          // Try to get cart once
          try {
            const cartDoc = await getDoc(cartRef);
            if (cartDoc.exists() && mounted) {
              const data = cartDoc.data();
              const items = data.items || [];
              setCartItems(items);
              saveToLocalStorage(items);
              console.log('📥 Cart synced from Firestore:', items.length, 'items');
            }
          } catch (error) {
            console.error('Error loading from Firestore:', error);
          }

          // Subscribe to real-time updates
          unsubscribeRef.current = onSnapshot(
            cartRef,
            (snapshot) => {
              if (mounted) {
                if (snapshot.exists()) {
                  const data = snapshot.data();
                  const items = data.items || [];
                  
                  // Only update if different
                  setCartItems(prevItems => {
                    if (JSON.stringify(items) !== JSON.stringify(prevItems)) {
                      saveToLocalStorage(items);
                      console.log('🔄 Cart updated from Firestore');
                      return items;
                    }
                    return prevItems;
                  });
                }
              }
            },
            (error) => {
              console.error('❌ Cart subscription error:', error);
            }
          );
        }

        // Mark as initialized
        if (mounted) {
          setLoading(false);
          setInitialized(true);
          console.log('✅ Cart initialized successfully');
        }
      } catch (error) {
        console.error('Error initializing cart:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeCart();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Save to localStorage immediately (synchronous)
  const saveToLocalStorage = useCallback((items) => {
    try {
      const key = currentUser 
        ? `${localStorageKey}_${currentUser.uid}` 
        : localStorageKey;
      localStorage.setItem(key, JSON.stringify(items));
      console.log('💾 Cart saved to localStorage');
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [currentUser]);

  // Save to Firestore (async, with debounce)
  const saveToFirestore = useCallback(async (items) => {
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
      console.error('❌ Failed to save cart to Firestore:', error);
      toast.error('Failed to sync cart. Changes saved locally.');
    } finally {
      if (isMountedRef.current) {
        setSyncing(false);
      }
    }
  }, [currentUser]);

  // Combined save function
  const saveCart = useCallback((items) => {
    // Save to localStorage immediately (no lag)
    saveToLocalStorage(items);
    
    // Save to Firestore with debounce (optional for logged-in users)
    if (currentUser) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveToFirestore(items);
      }, 1000); // Debounce 1 second
    }
  }, [currentUser, saveToLocalStorage, saveToFirestore]);

  const addToCart = useCallback(async (product, quantity = 1) => {
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
    saveCart(newItems);
  }, [cartItems, saveCart]);

  const removeFromCart = useCallback(async (productId) => {
    const newItems = cartItems.filter(item => item.id !== productId);
    setCartItems(newItems);
    saveCart(newItems);
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
    saveCart(newItems);
  }, [cartItems, saveCart, removeFromCart]);

  const incrementQuantity = useCallback(async (productId) => {
    const newItems = cartItems.map(item =>
      item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    );
    setCartItems(newItems);
    saveCart(newItems);
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
    saveCart(newItems);
  }, [cartItems, saveCart, removeFromCart]);

  const clearCart = useCallback(async () => {
    try {
      // Clear from state
      setCartItems([]);
      
      // Clear from localStorage
      const key = currentUser 
        ? `${localStorageKey}_${currentUser.uid}` 
        : localStorageKey;
      localStorage.removeItem(key);

      // Clear from Firestore
      if (currentUser) {
        const cartRef = doc(db, 'carts', currentUser.uid);
        await deleteDoc(cartRef);
      }
      
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
    initialized,
    cartTotal: calculations.total,
    cartCount: calculations.count,
    retailTotal: calculations.retailTotal,
    totalSavings: calculations.savings
  }), [cartItems, loading, syncing, initialized, calculations]);

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

  // Show loading screen ONLY initially
  if (loading && !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cart...</p>
        </div>
      </div>
    );
  }

  return (
    <CartStateContext.Provider value={stateValue}>
      <CartActionsContext.Provider value={actionsValue}>
        {children}
      </CartActionsContext.Provider>
    </CartStateContext.Provider>
  );
}

export default CartProvider;