// src/pages/Cart.jsx - FIXED: Proper timer handling
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import CountdownTimer from '../components/CountdownTimer';
import { 
  ShoppingCartIcon, 
  TrashIcon, 
  MinusIcon, 
  PlusIcon,
  SparklesIcon,
  ArrowRightIcon,
  TagIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Cart() {
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clearCart,
    cartTotal,
    retailTotal,
    totalSavings
  } = useCart();
  
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeOrderCycle, setActiveOrderCycle] = useState(null);
  const timerExpiredRef = useRef(false);

  useEffect(() => {
    if (currentUser && userProfile) {
      fetchUserGroups();
    }
  }, [currentUser, userProfile]);

  useEffect(() => {
    if (selectedGroup) {
      fetchActiveOrderCycle();
    }
  }, [selectedGroup]);

  const fetchUserGroups = async () => {
    try {
      setLoadingGroups(true);
      
      const groupsQuery = query(
        collection(db, 'groups'),
        where('members', 'array-contains', currentUser.uid),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(groupsQuery);
      const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUserGroups(groups);
      
      const savedGroupId = localStorage.getItem('selectedGroupId');
      if (savedGroupId && groups.find(g => g.id === savedGroupId)) {
        setSelectedGroup(savedGroupId);
      } else if (groups.length > 0) {
        setSelectedGroup(groups[0].id);
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
      toast.error('Failed to load your groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchActiveOrderCycle = async () => {
    try {
      timerExpiredRef.current = false; // Reset on new fetch
      
      const cyclesQuery = query(
        collection(db, 'orderCycles'),
        where('groupId', '==', selectedGroup),
        where('phase', 'in', ['collecting', 'payment_window'])
      );
      
      const snapshot = await getDocs(cyclesQuery);
      if (!snapshot.empty) {
        const cycle = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setActiveOrderCycle(cycle);
      } else {
        setActiveOrderCycle(null);
      }
    } catch (error) {
      console.error('Error fetching order cycle:', error);
    }
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity > 0) {
      updateQuantity(productId, newQuantity);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedGroup) {
      toast.error('Please select a group first');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Check if collection phase has ended
    if (activeOrderCycle?.phase === 'collecting' && activeOrderCycle?.collectingEndsAt) {
      const now = Date.now();
      const endsAt = activeOrderCycle.collectingEndsAt.toMillis();
      
      if (now > endsAt) {
        toast.error('Collection phase has ended. Cannot place order.', {
          duration: 5000
        });
        fetchActiveOrderCycle(); // Refresh to update UI
        return;
      }
    }

    setPlacingOrder(true);

    try {
      localStorage.setItem('selectedGroupId', selectedGroup);
      
      const cycleId = await orderService.getOrCreateOrderCycle(selectedGroup);

      const orderData = {
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        userPhone: userProfile.phone,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          groupPrice: item.groupPrice,
          retailPrice: item.retailPrice,
          minQuantity: item.minQuantity
        })),
        totalAmount: cartTotal
      };

      await orderService.addOrderToCycle(cycleId, orderData);

      toast.success('Order placed successfully! 🎉', {
        duration: 5000,
        icon: '✅'
      });

      await clearCart();
      navigate(`/groups/${selectedGroup}`);

    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleGroupChange = (groupId) => {
    setSelectedGroup(groupId);
    localStorage.setItem('selectedGroupId', groupId);
    setActiveOrderCycle(null);
    timerExpiredRef.current = false;
  };

  const handleTimerExpire = () => {
    // Only show message once using ref
    if (!timerExpiredRef.current) {
      timerExpiredRef.current = true;
      console.log('⏰ Collection phase timer expired');
      // Don't show toast here - let the phase change handle it
      fetchActiveOrderCycle();
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <ShoppingCartIcon className="h-20 sm:h-24 w-20 sm:w-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-8">
              Start adding products to save money with group buying!
            </p>
          </div>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200 text-sm sm:text-base"
          >
            <span>Browse Products</span>
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Shopping Cart
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {/* TIMER - Show if there's an active collecting phase */}
        {activeOrderCycle && activeOrderCycle.phase === 'collecting' && activeOrderCycle.collectingEndsAt && (
          <div className="mb-6 sm:mb-8">
            <CountdownTimer
              endTime={activeOrderCycle.collectingEndsAt}
              phase="collecting"
              title="⏰ Collection Phase Ending"
              size="medium"
              onExpire={handleTimerExpire}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-4 sm:p-6">
                  <div className="flex gap-3 sm:gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <ShoppingCartIcon className="h-8 w-8 sm:h-12 sm:w-12 text-green-600" />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate">
                        {item.name}
                      </h3>
                      
                      {/* Pricing */}
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 flex-wrap">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          ₹{item.groupPrice}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 line-through">
                          ₹{item.retailPrice}
                        </div>
                        <div className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">
                          {Math.round(((item.retailPrice - item.groupPrice) / item.retailPrice) * 100)}% OFF
                        </div>
                      </div>

                      {/* Min Quantity Badge */}
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium mb-2 sm:mb-3">
                        <SparklesIcon className="h-3 w-3" />
                        <span>Min: {item.minQuantity} units</span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrementQuantity(item.id)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          >
                            <MinusIcon className="h-4 w-4 text-gray-700" />
                          </button>
                          
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                            className="w-12 sm:w-16 px-2 sm:px-3 py-1 sm:py-2 text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                          />
                          
                          <button
                            onClick={() => incrementQuantity(item.id)}
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                          >
                            <PlusIcon className="h-4 w-4 text-gray-700" />
                          </button>
                        </div>

                        <div className="text-xs sm:text-sm text-gray-600">
                          Subtotal: <span className="font-bold text-gray-900">₹{(item.groupPrice * item.quantity).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                      title="Remove from cart"
                    >
                      <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Clear Cart Button */}
            <button
              onClick={clearCart}
              className="w-full py-2.5 sm:py-3 px-4 bg-red-100 text-red-700 rounded-xl font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Clear Cart</span>
            </button>
          </div>

          {/* Order Summary - Sticky on mobile */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sticky top-4">
              {/* Group Selection */}
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5 text-green-600" />
                  <span>Select Group</span>
                </h3>
                
                {loadingGroups ? (
                  <div className="animate-pulse">
                    <div className="h-10 sm:h-12 bg-gray-200 rounded-lg"></div>
                  </div>
                ) : userGroups.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs sm:text-sm text-gray-600 mb-3">
                      You haven't joined any groups yet
                    </p>
                    <button
                      onClick={() => navigate('/groups')}
                      className="text-xs sm:text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Join a Group
                    </button>
                  </div>
                ) : (
                  <>
                    <select
                      value={selectedGroup || ''}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 font-medium text-sm sm:text-base"
                    >
                      <option value="" disabled>Choose a group...</option>
                      {userGroups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.area?.city})
                        </option>
                      ))}
                    </select>
                    
                    {selectedGroup && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-green-900">
                              {userGroups.find(g => g.id === selectedGroup)?.name}
                            </p>
                            <p className="text-xs text-green-700 mt-0.5">
                              {userGroups.find(g => g.id === selectedGroup)?.members?.length || 0} members
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Order Summary */}
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
                
                {/* Pricing Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm sm:text-base text-gray-600">
                    <span>Retail Price</span>
                    <span>₹{retailTotal.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm sm:text-base text-green-600 font-medium">
                    <span className="flex items-center gap-1">
                      <TagIcon className="h-4 w-4" />
                      Group Discount
                    </span>
                    <span>-₹{totalSavings.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-lg sm:text-xl font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-green-600">₹{cartTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Savings Highlight */}
                <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 font-semibold mb-1 text-sm sm:text-base">
                    <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>You're Saving</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    ₹{totalSavings.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-green-600 mt-1">
                    That's {Math.round((totalSavings / retailTotal) * 100)}% off retail price!
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 sm:p-6 space-y-3">
                <button
                  onClick={handlePlaceOrder}
                  disabled={placingOrder || !selectedGroup || userGroups.length === 0}
                  className="w-full py-3 sm:py-4 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {placingOrder ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Placing Order...</span>
                    </>
                  ) : !selectedGroup && userGroups.length > 0 ? (
                    <>
                      <UserGroupIcon className="h-5 w-5" />
                      <span>Select a Group First</span>
                    </>
                  ) : userGroups.length === 0 ? (
                    <>
                      <UserGroupIcon className="h-5 w-5" />
                      <span>Join a Group First</span>
                    </>
                  ) : (
                    <>
                      <span>Place Order</span>
                      <ArrowRightIcon className="h-5 w-5" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => navigate('/products')}
                  className="w-full py-2.5 sm:py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  Continue Shopping
                </button>
              </div>

              {/* Info */}
              <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="text-xs sm:text-sm text-blue-800">
                    <strong>Note:</strong> Your order will be confirmed once the group reaches minimum quantity. You'll be notified when it's time to pay!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}