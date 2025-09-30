// src/pages/Cart.jsx - ENHANCED WITH PAYMENT GATING & TIMER SYSTEM
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { groupService, orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import { TrashIcon, MinusIcon, PlusIcon, ShoppingBagIcon, ExclamationCircleIcon, ClockIcon, SparklesIcon, UsersIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Cart() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [groupProgress, setGroupProgress] = useState({});
  const [activeGroupOrder, setActiveGroupOrder] = useState(null);
  const [paymentWindow, setPaymentWindow] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
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

  useEffect(() => {
    fetchUserGroups();
  }, [currentUser]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupProgress();
    }
  }, [selectedGroup, cartItems]);

  useEffect(() => {
    validateCheckout();
  }, [cartItems, selectedGroup, userProfile, groupProgress]);

  // Timer countdown effect
  useEffect(() => {
    if (!paymentWindow?.isActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = paymentWindow.expiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining(null);
        handlePaymentWindowExpired();
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeRemaining({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentWindow]);

  const fetchUserGroups = async () => {
    if (!currentUser) {
      setLoadingGroups(false);
      return;
    }

    try {
      setLoadingGroups(true);
      const groups = await groupService.getUserGroups(currentUser.uid);
      setUserGroups(groups);
      
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

  const fetchGroupProgress = async () => {
    if (!selectedGroup) return;

    try {
      const activeOrders = await orderService.getActiveGroupOrders(selectedGroup.id);
      
      if (activeOrders.length > 0) {
        const currentOrder = activeOrders[0];
        setActiveGroupOrder(currentOrder);
        setGroupProgress(currentOrder.productQuantities || {});
        
        // Check payment window
        if (currentOrder.paymentWindow) {
          setPaymentWindow(currentOrder.paymentWindow);
        }
      } else {
        setGroupProgress({});
        setActiveGroupOrder(null);
        setPaymentWindow(null);
      }
    } catch (error) {
      console.error('Error fetching group progress:', error);
    }
  };

  const handlePaymentWindowExpired = async () => {
    toast.error('Payment window expired. Your order has been cancelled.', { duration: 5000 });
    await clearCart();
    window.location.reload();
  };

  const validateCheckout = useCallback(() => {
    const errors = [];

    if (cartItems.length === 0) {
      errors.push('Your cart is empty');
    }

    if (!selectedGroup) {
      errors.push('Please select a group');
    }

    if (!userProfile?.name) errors.push('Please complete your name in profile');
    if (!userProfile?.email) errors.push('Please complete your email in profile');
    if (!userProfile?.phone) errors.push('Please complete your phone number in profile');

    // Check if minimum quantities are met
    const allMinimumsMet = cartItems.every(item => {
      const progress = groupProgress[item.id];
      return progress && progress.quantity >= (item.minQuantity || 50);
    });

    if (!allMinimumsMet && !paymentWindow?.isActive) {
      errors.push('Minimum quantities not yet met for all products');
    }

    // Check if payment window is active
    if (paymentWindow?.isActive && !timeRemaining) {
      errors.push('Payment window has expired');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [cartItems, selectedGroup, userProfile, groupProgress, paymentWindow, timeRemaining]);

  const handleProceedToPayment = async () => {
    if (!validateCheckout()) {
      const firstError = validationErrors[0];
      toast.error(firstError);
      
      if (firstError.includes('profile')) {
        setTimeout(() => navigate('/profile'), 2000);
      }
      return;
    }

    setProcessingPayment(true);

    try {
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
          minQuantity: item.minQuantity || 50
        })),
        totalAmount: getTotal(),
        paymentStatus: 'pending'
      };

      const orderId = await orderService.createIndividualOrder(
        selectedGroup.id,
        orderData
      );

      if (!orderId) {
        throw new Error('Failed to create order');
      }

      const groupOrderId = await orderService.getOrCreateActiveGroupOrder(selectedGroup.id);
      
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

      const result = await paymentService.initiatePayment(paymentData);

      if (result.success) {
        console.log('✅ Payment initiated successfully');
      } else {
        throw new Error(result.error || 'Failed to initiate payment');
      }

    } catch (error) {
      console.error('❌ Error in payment process:', error);
      toast.error(error.message || 'Failed to process order', { duration: 5000 });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getTotal = () => {
    const DELIVERY_FEE = 30;
    const subtotal = getCartTotal();
    return subtotal + DELIVERY_FEE;
  };

  // Check if all products meet minimum
  const allMinimumsMet = cartItems.every(item => {
    const progress = groupProgress[item.id];
    return progress && progress.quantity >= (item.minQuantity || 50);
  });

  const canProceedToPayment = allMinimumsMet && paymentWindow?.isActive && timeRemaining;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16 bg-white rounded-2xl shadow-xl">
            <ShoppingBagIcon className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Start shopping with your group!</p>
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Shopping Cart
          </h1>
          <p className="text-gray-600">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {/* Payment Status Banner */}
        {!allMinimumsMet && (
          <div className="mb-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-2xl">
            <div className="flex items-start gap-4">
              <LockClosedIcon className="h-8 w-8 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-yellow-900 mb-2">⏳ Waiting for Minimum Quantities</h3>
                <p className="text-yellow-800 mb-3">
                  Payment will unlock automatically when all products reach their minimum order quantities. 
                  Invite more members to speed up the process!
                </p>
                <div className="bg-white/50 rounded-lg p-3">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">Still needed:</p>
                  {cartItems.map(item => {
                    const progress = groupProgress[item.id] || { quantity: 0 };
                    const needed = (item.minQuantity || 50) - progress.quantity;
                    if (needed > 0) {
                      return (
                        <div key={item.id} className="flex justify-between text-sm text-yellow-800 mb-1">
                          <span>{item.name}:</span>
                          <span className="font-bold">{needed} more units</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Window Timer */}
        {allMinimumsMet && paymentWindow?.isActive && timeRemaining && (
          <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-2xl">
            <div className="flex items-start gap-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 mb-2">✅ Payment Window Open!</h3>
                <p className="text-green-800 mb-3">
                  All minimums met! Complete your payment within the time limit.
                </p>
                <div className="bg-white rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-6 w-6 text-green-600" />
                    <span className="font-semibold text-gray-700">Time Remaining:</span>
                  </div>
                  <div className="flex gap-4">
                    <TimerUnit value={timeRemaining.hours} label="Hours" />
                    <TimerUnit value={timeRemaining.minutes} label="Minutes" />
                    <TimerUnit value={timeRemaining.seconds} label="Seconds" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <CartItemWithProgress
                key={item.id}
                item={item}
                groupProgress={groupProgress[item.id]}
                activeGroupOrder={activeGroupOrder}
                onIncrement={() => incrementQuantity(item.id)}
                onDecrement={() => decrementQuantity(item.id)}
                onRemove={() => removeFromCart(item.id)}
              />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Group Selection */}
            <GroupSelector
              userGroups={userGroups}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              loadingGroups={loadingGroups}
            />

            {/* Order Summary */}
            <OrderSummary
              cartItems={cartItems}
              getCartTotal={getCartTotal}
              getRetailTotal={getRetailTotal}
              getTotalSavings={getTotalSavings}
              getTotal={getTotal}
              validationErrors={validationErrors}
              processingPayment={processingPayment}
              handleProceedToPayment={handleProceedToPayment}
              canProceedToPayment={canProceedToPayment}
              allMinimumsMet={allMinimumsMet}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Timer Unit Component
function TimerUnit({ value, label }) {
  return (
    <div className="text-center">
      <div className="bg-green-600 text-white rounded-lg px-4 py-2 min-w-[60px]">
        <span className="text-2xl font-bold">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-xs text-gray-600 mt-1 block">{label}</span>
    </div>
  );
}

// Cart Item with Progress
function CartItemWithProgress({ item, groupProgress, activeGroupOrder, onIncrement, onDecrement, onRemove }) {
  const currentQty = groupProgress?.quantity || 0;
  const minQty = item.minQuantity || 50;
  const progress = Math.min((currentQty / minQty) * 100, 100);
  const remaining = Math.max(minQty - currentQty, 0);
  const isMet = currentQty >= minQty;
  
  const participants = groupProgress?.participants || [];
  const participantCount = participants.length;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex gap-4">
        <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            <ShoppingBagIcon className="h-12 w-12 text-gray-400" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-800 mb-1">{item.name}</h3>
              
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className={`font-medium flex items-center gap-1 ${isMet ? 'text-green-600' : 'text-orange-600'}`}>
                    {isMet ? (
                      <>✓ Minimum Met</>
                    ) : (
                      <>🔒 {remaining} more needed</>
                    )}
                  </span>
                  <span className="text-gray-600 font-bold">{currentQty}/{minQty}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isMet 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                        : 'bg-gradient-to-r from-orange-500 to-yellow-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                
                {participantCount > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <UsersIcon className="h-3 w-3" />
                    <span>{participantCount} {participantCount === 1 ? 'member' : 'members'} ordering</span>
                  </div>
                )}
              </div>
            </div>
            <button onClick={onRemove} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition">
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Pricing & Quantity */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 line-through">₹{item.retailPrice}</span>
              <span className="text-xl font-bold text-green-600">₹{item.groupPrice}</span>
              <span className="text-xs text-green-600 font-semibold">
                {Math.round(((item.retailPrice - item.groupPrice) / item.retailPrice) * 100)}% OFF
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-2">
                <button onClick={onDecrement} className="p-1.5 hover:bg-white rounded-md transition">
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
                <button onClick={onIncrement} className="p-1.5 hover:bg-white rounded-md transition">
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">Item Total</p>
                <p className="text-xl font-bold text-gray-800">₹{item.groupPrice * item.quantity}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Group Selector
function GroupSelector({ userGroups, selectedGroup, setSelectedGroup, loadingGroups }) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <h3 className="text-xl font-bold mb-4">Select Your Group</h3>
      
      {loadingGroups ? (
        <LoadingSpinner size="small" />
      ) : userGroups.length > 0 ? (
        <div className="space-y-3">
          {userGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group)}
              className={`w-full p-4 rounded-xl border-2 text-left transition ${
                selectedGroup?.id === group.id
                  ? 'border-green-600 bg-green-50 shadow-lg'
                  : 'border-gray-200 hover:border-green-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{group.name}</p>
                  <p className="text-sm text-gray-600">{group.members?.length || 0} members</p>
                </div>
                {selectedGroup?.id === group.id && (
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <ExclamationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 mb-4">No groups found</p>
          <button
            onClick={() => window.location.href = '/groups'}
            className="text-green-600 font-semibold hover:text-green-700"
          >
            Join a Group →
          </button>
        </div>
      )}
    </div>
  );
}

// Order Summary
function OrderSummary({ 
  cartItems, 
  getCartTotal, 
  getRetailTotal, 
  getTotalSavings, 
  getTotal, 
  validationErrors, 
  processingPayment, 
  handleProceedToPayment,
  canProceedToPayment,
  allMinimumsMet
}) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-20">
      <h3 className="text-xl font-bold mb-4">Order Summary</h3>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({cartItems.length} items):</span>
          <span className="font-medium">₹{getCartTotal()}</span>
        </div>
        <div className="flex justify-between text-green-600 font-semibold">
          <span>You Save:</span>
          <span>₹{getTotalSavings()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Delivery Fee:</span>
          <span className="font-medium">₹30</span>
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span className="text-green-600">₹{getTotal()}</span>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded">
          <p className="font-semibold text-red-700 text-sm mb-1">Cannot proceed:</p>
          <ul className="list-disc list-inside text-xs text-red-600 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Payment Button */}
      <button
        onClick={handleProceedToPayment}
        disabled={!canProceedToPayment || processingPayment}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2 ${
          canProceedToPayment && !processingPayment
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-xl transform hover:-translate-y-0.5'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {processingPayment ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            <span>Processing...</span>
          </>
        ) : !allMinimumsMet ? (
          <>
            <LockClosedIcon className="h-5 w-5" />
            <span>Waiting for Minimum</span>
          </>
        ) : (
          <>
            <span>Pay Now</span>
            <span>₹{getTotal()}</span>
          </>
        )}
      </button>

      {!canProceedToPayment && allMinimumsMet && (
        <p className="text-center text-sm text-orange-600 mt-3 font-medium">
          ⏳ Payment window will open soon
        </p>
      )}
    </div>
  );
}