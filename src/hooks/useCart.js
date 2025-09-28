// src/hooks/useCart.js
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useCart() {
  const [cartItems, setCartItems] = useState([]);
  const { currentUser } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    if (currentUser) {
      const savedCart = localStorage.getItem(`cart_${currentUser.uid}`);
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    }
  }, [currentUser]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`cart_${currentUser.uid}`, JSON.stringify(cartItems));
    }
  }, [cartItems, currentUser]);

  const addToCart = (product, quantity = 1) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevItems, { ...product, quantity }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.groupPrice * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
  };
}