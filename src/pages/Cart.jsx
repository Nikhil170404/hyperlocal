// src/pages/Cart.jsx - COMPLETELY FIXED & OPTIMIZED
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { groupService, orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import { TrashIcon, MinusIcon, PlusIcon, UserGroupIcon, ShoppingBagIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Cart() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  
  const { currentUser, userProfile } = useAuth();
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getCartTotal, 
    getRetailTotal, 
    getTotalSavings, 
    clearCart, 
    incrementQuantity, 
    decrementQuantity 
  } = useCart();
  const navigate = useNavigate();

  // Fetch user groups on mount
  useEffect(() => {
    fetchUserGroups();
  }, [currentUser]);

  // Validate cart and profile on changes
  useEffect(() => {
    validateCheckout();
  }, [cartItems, selectedGroup, userProfile]);

  /**
   * Fetch user's groups
   */
  const fetchUserGroups = async () => {
    if (!currentUser) {
      setLoadingGroups(false);
      return;
    }

    try {
      setLoadingGroups(true);
      const groups = await groupService.getUserGroups(currentUser.uid);
      setUserGroups(groups);
      
      // Auto-select if only one group
      if (groups.length === 1) {
        setSelectedGroup(groups[0]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  /**
   * Validate checkout requirements
   */
  const validateCheckout = useCallback(() => {
    const errors = [];

    // Check cart items
    if (cartItems.length === 0) {
      errors.push('Your cart is empty');
    }

    // Check group selection
    if (!selectedGroup) {
      errors.push('Please select a group');
    }

    // Check profile completion
    if (!userProfile?.name) {
      errors.push('Please complete your name in profile');
    }
    if (!userProfile?.email) {
      errors.push('Please complete your email in profile');
    }
    if (!userProfile?.phone) {
      errors.push('Please complete your phone number in profile');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [cartItems, selectedGroup, userProfile]);

  /**
   * Handle proceed to payment with complete error handling
   */
  const handleProceedToPayment = async () => {
    console.log('🚀 Starting payment process...');
    
    // Validate before proceeding
    if (!validateCheckout()) {
      const firstError = validationErrors[0];
      toast.error(firstError);
      
      // Redirect to profile if needed
      if (firstError.includes('profile')) {
        setTimeout(() => navigate('/profile'), 2000);
      }
      return;
    }

    setProcessingPayment(true);

    try {
      console.log('📦 Creating order...');
      
      // Prepare order data
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
          minQuantity: item.minQuantity || 1
        })),
        totalAmount: getTotal(),
        paymentStatus: 'pending'
      };

      console.log('Order data:', {
        ...orderData,
        itemCount: orderData.items.length,
        totalAmount: orderData.totalAmount
      });

      // Create individual order
      const orderId = await orderService.createIndividualOrder(
        selectedGroup.id,
        orderData
      );

      if (!orderId) {
        throw new Error('Failed to create order');
      }

      console.log('✅ Order created:', orderId);

      // Get group order ID
      const groupOrderId = await orderService.getOrCreateActiveGroupOrder(selectedGroup.id);
      
      if (!groupOrderId) {
        throw new Error('Failed to create group order');
      }

      console.log('✅ Group order ID:', groupOrderId);

      // Prepare payment data
      const paymentData = {
        orderId: orderId,
        groupOrderId: groupOrderId,
        groupId: selectedGroup.id,
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        userPhone: userProfile.phone,
        amount: getTotal()
      };

      console.log('💳 Initiating payment...');

      // Initiate Razorpay payment
      const result = await paymentService.initiatePayment(paymentData);

      if (result.success) {
        console.log('✅ Payment initiated successfully');
        // Cart will be cleared after successful payment
        // The payment service handles redirect
      } else {
        throw new Error(result.error || 'Failed to initiate payment');
      }

    } catch (error) {
      console.error('❌ Error in payment process:', error);
      
      // Show user-friendly error
      const errorMessage = error.message || 'Failed to process order';
      toast.error(errorMessage, { duration: 5000 });
      
      // Log for debugging
      console.error('Payment error details:', {
        message: error.message,
        stack: error.stack,
        userProfile: {
          name: userProfile?.name,
          email: userProfile?.email,
          phone: userProfile?.phone
        },
        selectedGroup: selectedGroup?.id,
        cartItemsCount: cartItems.length
      });

    } finally {
      setProcessingPayment(false);
    }
  };

  /**
   * Calculate final total with delivery fee
   */
  const getTotal = () => {
    const DELIVERY_FEE = 30;
    return getCartTotal() + DELIVERY_FEE;
  };

  // Empty cart state
  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 sm:py-16 bg-white rounded-2xl shadow-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-6">
              <ShoppingBagIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">Start shopping with your group to get amazing deals!</p>
            <button
              onClick={() => navigate('/products')}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-sm sm:text-base"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-3 sm:px-4 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Shopping Cart
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onIncrement={() => incrementQuantity(item.id)}
                onDecrement={() => decrementQuantity(item.id)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Group Selection */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                <span>Select Your Group</span>
              </h3>
              
              {loadingGroups ? (
                <div className="py-4">
                  <LoadingSpinner size="small" />
                </div>
              ) : userGroups.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {userGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedGroup?.id === group.id
                          ? 'border-green-600 bg-green-50 shadow-lg scale-105'
                          : 'border-gray-200 hover:border-green-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 truncate text-sm sm:text-base">{group.name}</p>
                          <p className="text-xs sm:text-sm text-gray-600">{group.members?.length || 0} members</p>
                        </div>
                        {selectedGroup?.id === group.id && (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 ml-2">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm sm:text-base text-gray-600 mb-4">You're not in any groups yet</p>
                  <button
                    onClick={() => navigate('/groups')}
                    className="text-sm sm:text-base text-green-600 font-semibold hover:text-green-700 underline"
                  >
                    Join a Group →
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 sticky top-20">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Order Summary</h3>
              
              <div className="space-y-2 sm:space-y-3 mb-4">
                <div className="flex justify-between text-sm sm:text-base text-gray-600">
                  <span>Subtotal ({cartItems.length} items):</span>
                  <span className="font-medium">₹{getCartTotal()}</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold text-sm sm:text-base">
                  <span>You Save:</span>
                  <span>₹{getTotalSavings()}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base text-gray-600">
                  <span>Delivery Fee:</span>
                  <span className="font-medium">₹30</span>
                </div>
                <div className="border-t pt-2 sm:pt-3">
                  <div className="flex justify-between font-bold text-base sm:text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">₹{getTotal()}</span>
                  </div>
                </div>
              </div>

              {/* Savings Badge */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 mb-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl sm:text-2xl">🎉</span>
                  <span className="font-semibold text-green-800 text-sm sm:text-base">You're Saving</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">₹{getTotalSavings()}</p>
                <p className="text-xs sm:text-sm text-green-700 mt-1">vs retail prices</p>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded">
                  <div className="flex items-start">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
                      <p className="font-semibold mb-1">Cannot proceed:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Payment Button */}
              <button
                onClick={handleProceedToPayment}
                disabled={processingPayment || validationErrors.length > 0}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-base sm:text-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
              >
                {processingPayment ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span className="text-sm sm:text-base">Processing...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm sm:text-base">Proceed to Payment</span>
                    <span className="text-sm sm:text-base">₹{getTotal()}</span>
                  </>
                )}
              </button>

              {validationErrors.length > 0 && (
                <p className="text-center text-xs sm:text-sm text-red-600 mt-3">
                  Please fix the errors above to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cart Item Component
 */
function CartItem({ item, onIncrement, onDecrement, onRemove }) {
  const savings = (item.retailPrice - item.groupPrice) * item.quantity;
  const discount = Math.round(((item.retailPrice - item.groupPrice) / item.retailPrice) * 100);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-shadow">
      <div className="flex gap-3 sm:gap-4">
        {/* Image */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg sm:rounded-xl" />
          ) : (
            <ShoppingBagIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          )}
        </div>
        
        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-sm sm:text-base lg:text-lg mb-1 truncate">{item.name}</h3>
              {discount > 0 && (
                <span className="inline-block px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                  {discount}% OFF
                </span>
              )}
            </div>
            <button
              onClick={onRemove}
              className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg text-red-600 transition flex-shrink-0"
              aria-label="Remove item"
            >
              <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Pricing */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-500 line-through">₹{item.retailPrice}</span>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-green-600">₹{item.groupPrice}</span>
              <span className="text-xs sm:text-sm text-green-700 font-medium">Save ₹{item.retailPrice - item.groupPrice}</span>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 rounded-lg sm:rounded-xl p-1 sm:p-2">
                <button
                  onClick={onDecrement}
                  className="p-1 sm:p-1.5 hover:bg-white rounded-md transition"
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <span className="w-8 sm:w-10 text-center font-bold text-sm sm:text-base lg:text-lg">{item.quantity}</span>
                <button
                  onClick={onIncrement}
                  className="p-1 sm:p-1.5 hover:bg-white rounded-md transition"
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>

              <div className="text-right">
                <p className="text-xs sm:text-sm text-gray-500">Item Total</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">₹{item.groupPrice * item.quantity}</p>
                <p className="text-xs text-green-600 font-medium">Saving ₹{savings}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}