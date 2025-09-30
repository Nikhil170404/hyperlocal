// src/pages/Cart.jsx - ENHANCED WITH REAL-TIME BULK PROGRESS
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { groupService, orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import { TrashIcon, MinusIcon, PlusIcon, UserGroupIcon, ShoppingBagIcon, ExclamationCircleIcon, ClockIcon, SparklesIcon, UsersIcon } from '@heroicons/react/24/outline';
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
  const [paymentDeadline, setPaymentDeadline] = useState(null);
  const [isEarlyBird, setIsEarlyBird] = useState(false);
  
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
      calculatePaymentDeadline();
    }
  }, [selectedGroup, cartItems]);

  useEffect(() => {
    validateCheckout();
  }, [cartItems, selectedGroup, userProfile]);

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
      } else {
        setGroupProgress({});
        setActiveGroupOrder(null);
      }
    } catch (error) {
      console.error('Error fetching group progress:', error);
    }
  };

  const calculatePaymentDeadline = () => {
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 48);
    setPaymentDeadline(deadline);

    const earlyBirdDeadline = new Date();
    earlyBirdDeadline.setHours(earlyBirdDeadline.getHours() + 24);
    setIsEarlyBird(new Date() < earlyBirdDeadline);
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

    setValidationErrors(errors);
    return errors.length === 0;
  }, [cartItems, selectedGroup, userProfile]);

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
          minQuantity: item.minQuantity || 1
        })),
        totalAmount: getTotal(),
        paymentStatus: 'pending',
        isEarlyBird: isEarlyBird
      };

      const orderId = await orderService.createIndividualOrder(
        selectedGroup.id,
        orderData
      );

      if (!orderId) {
        throw new Error('Failed to create order');
      }

      const groupOrderId = await orderService.getOrCreateActiveGroupOrder(selectedGroup.id);
      
      if (!groupOrderId) {
        throw new Error('Failed to create group order');
      }

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
    const earlyBirdDiscount = isEarlyBird ? subtotal * 0.02 : 0;
    return subtotal + DELIVERY_FEE - earlyBirdDiscount;
  };

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
          <div className="space-y-4 sm:space-y-6">
            {/* Group Selection */}
            <GroupSelector
              userGroups={userGroups}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              loadingGroups={loadingGroups}
            />

            {/* Active Group Order Info */}
            {selectedGroup && activeGroupOrder && (
              <ActiveGroupOrderInfo
                activeGroupOrder={activeGroupOrder}
                selectedGroup={selectedGroup}
              />
            )}

            {/* Order Summary */}
            <OrderSummary
              cartItems={cartItems}
              getCartTotal={getCartTotal}
              getRetailTotal={getRetailTotal}
              getTotalSavings={getTotalSavings}
              getTotal={getTotal}
              isEarlyBird={isEarlyBird}
              paymentDeadline={paymentDeadline}
              validationErrors={validationErrors}
              processingPayment={processingPayment}
              handleProceedToPayment={handleProceedToPayment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Cart Item with Progress Tracking
function CartItemWithProgress({ item, groupProgress, activeGroupOrder, onIncrement, onDecrement, onRemove }) {
  const currentQty = groupProgress?.quantity || 0;
  const minQty = item.minQuantity || 50;
  const progress = Math.min((currentQty / minQty) * 100, 100);
  const remaining = Math.max(minQty - currentQty, 0);
  const isMet = currentQty >= minQty;
  
  // Get participants for this product
  const participants = groupProgress?.participants || [];
  const participantCount = participants.length;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 lg:p-6 hover:shadow-xl transition-shadow">
      <div className="flex gap-3 sm:gap-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg sm:rounded-xl" />
          ) : (
            <ShoppingBagIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-sm sm:text-base lg:text-lg mb-1 truncate">{item.name}</h3>
              
              {/* Group Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between items-center mb-1 text-xs sm:text-sm">
                  <span className={`font-medium flex items-center gap-1 ${isMet ? 'text-green-600' : 'text-orange-600'}`}>
                    {isMet ? (
                      <>✓ Bulk Price Unlocked</>
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
                  >
                    <div className="h-full bg-white/30 animate-pulse"></div>
                  </div>
                </div>
                
                {/* Participants Info */}
                {participantCount > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                    <UsersIcon className="h-3 w-3" />
                    <span>{participantCount} {participantCount === 1 ? 'member' : 'members'} ordering this</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onRemove}
              className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg text-red-600 transition flex-shrink-0"
            >
              <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Pricing */}
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-500 line-through">₹{item.retailPrice}</span>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-green-600">₹{item.groupPrice}</span>
              <span className="text-xs text-green-600 font-semibold">
                {Math.round(((item.retailPrice - item.groupPrice) / item.retailPrice) * 100)}% OFF
              </span>
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 rounded-lg sm:rounded-xl p-1 sm:p-2">
                <button onClick={onDecrement} className="p-1 sm:p-1.5 hover:bg-white rounded-md transition">
                  <MinusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <span className="w-8 sm:w-10 text-center font-bold text-sm sm:text-base lg:text-lg">{item.quantity}</span>
                <button onClick={onIncrement} className="p-1 sm:p-1.5 hover:bg-white rounded-md transition">
                  <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>

              <div className="text-right">
                <p className="text-xs sm:text-sm text-gray-500">Item Total</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">₹{item.groupPrice * item.quantity}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Group Selector Component
function GroupSelector({ userGroups, selectedGroup, setSelectedGroup, loadingGroups }) {
  return (
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
            onClick={() => window.location.href = '/groups'}
            className="text-sm sm:text-base text-green-600 font-semibold hover:text-green-700 underline"
          >
            Join a Group →
          </button>
        </div>
      )}
    </div>
  );
}

// Active Group Order Info
function ActiveGroupOrderInfo({ activeGroupOrder, selectedGroup }) {
  const totalParticipants = activeGroupOrder.totalParticipants || 0;
  const paidCount = activeGroupOrder.participants?.filter(p => p.paymentStatus === 'paid').length || 0;
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border-2 border-blue-200">
      <h3 className="text-lg sm:text-xl font-bold mb-3 flex items-center gap-2 text-blue-900">
        <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6" />
        Current Group Order
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Total Participants:</span>
          <span className="text-lg font-bold text-gray-900">{totalParticipants}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Payments Completed:</span>
          <span className="text-lg font-bold text-green-600">{paidCount}/{totalParticipants}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">Total Value:</span>
          <span className="text-lg font-bold text-purple-600">₹{activeGroupOrder.totalAmount?.toLocaleString() || 0}</span>
        </div>
        
        {activeGroupOrder.minQuantityMet ? (
          <div className="mt-3 p-3 bg-green-100 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              All minimums met! Bulk pricing active.
            </p>
          </div>
        ) : (
          <div className="mt-3 p-3 bg-orange-100 rounded-lg border border-orange-200">
            <p className="text-sm text-orange-800 font-semibold">
              ⏳ More orders needed to unlock all bulk prices
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Order Summary Component
function OrderSummary({ 
  cartItems, 
  getCartTotal, 
  getRetailTotal, 
  getTotalSavings, 
  getTotal, 
  isEarlyBird,
  paymentDeadline,
  validationErrors, 
  processingPayment, 
  handleProceedToPayment 
}) {
  const earlyBirdDiscount = isEarlyBird ? getCartTotal() * 0.02 : 0;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 sticky top-20">
      <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Order Summary</h3>
      
      {/* Early Bird Banner */}
      {isEarlyBird && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="h-5 w-5 text-yellow-600" />
            <span className="font-bold text-yellow-900">Early Bird Bonus!</span>
          </div>
          <p className="text-xs text-yellow-800">
            Order now and save an extra 2% (₹{earlyBirdDiscount.toFixed(0)})
          </p>
        </div>
      )}

      {/* Payment Deadline */}
      {paymentDeadline && (
        <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2">
          <ClockIcon className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Payment Window</p>
            <p className="text-xs text-blue-700">
              Closes in {Math.round((paymentDeadline - new Date()) / (1000 * 60 * 60))} hours
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-2 sm:space-y-3 mb-4">
        <div className="flex justify-between text-sm sm:text-base text-gray-600">
          <span>Subtotal ({cartItems.length} items):</span>
          <span className="font-medium">₹{getCartTotal()}</span>
        </div>
        {isEarlyBird && (
          <div className="flex justify-between text-green-600 font-semibold text-sm sm:text-base">
            <span>Early Bird Discount (2%):</span>
            <span>-₹{earlyBirdDiscount.toFixed(0)}</span>
          </div>
        )}
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
        <p className="text-2xl sm:text-3xl font-bold text-green-600">₹{getTotalSavings() + earlyBirdDiscount}</p>
        <p className="text-xs sm:text-sm text-green-700 mt-1">vs retail prices + early bird bonus</p>
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
  );
}