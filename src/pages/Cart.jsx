// src/pages/Cart.jsx - WITH TIMER & PAYMENT TRACKING
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { groupService, orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import { 
  TrashIcon, ClockIcon, UsersIcon, CheckCircleIcon, 
  ExclamationTriangleIcon, FireIcon, LockClosedIcon, SparklesIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Cart() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [activeOrderCycle, setActiveOrderCycle] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  
  const { currentUser, userProfile } = useAuth();
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    getCartTotal, 
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
      fetchActiveOrderCycle();
    }
  }, [selectedGroup]);

  // Timer
  useEffect(() => {
    if (!activeOrderCycle) return;

    const interval = setInterval(() => {
      updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOrderCycle]);

  const updateTimer = () => {
    if (!activeOrderCycle) return;

    const now = Date.now();
    let targetTime;

    if (activeOrderCycle.phase === 'collecting') {
      targetTime = activeOrderCycle.collectingEndsAt?.toMillis() || 0;
    } else if (activeOrderCycle.phase === 'payment_window') {
      targetTime = activeOrderCycle.paymentWindowEndsAt?.toMillis() || 0;
    } else {
      setTimeRemaining(null);
      return;
    }

    const remaining = targetTime - now;

    if (remaining <= 0) {
      setTimeRemaining(null);
      fetchActiveOrderCycle();
    } else {
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining({ hours, minutes, seconds });
    }
  };

  const fetchUserGroups = async () => {
    if (!currentUser) return;

    try {
      const groups = await groupService.getUserGroups(currentUser.uid);
      setUserGroups(groups);
      
      if (groups.length === 1) {
        setSelectedGroup(groups[0]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchActiveOrderCycle = async () => {
    if (!selectedGroup) return;

    try {
      const cycles = await orderService.getActiveOrderCycles(selectedGroup.id);
      
      if (cycles.length > 0) {
        setActiveOrderCycle(cycles[0]);
        
        // Subscribe to updates
        orderService.subscribeToOrderCycle(cycles[0].id, (data) => {
          setActiveOrderCycle(data);
        });
      } else {
        setActiveOrderCycle(null);
      }
    } catch (error) {
      console.error('Error fetching cycle:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    if (!selectedGroup) {
      toast.error('Please select a group');
      return;
    }

    // Validate profile
    if (!userProfile?.name || !userProfile?.email || !userProfile?.phone) {
      toast.error('Please complete your profile first');
      setTimeout(() => navigate('/profile'), 2000);
      return;
    }

    setProcessingOrder(true);

    try {
      // Get or create order cycle
      const cycleId = await orderService.getOrCreateOrderCycle(selectedGroup.id);

      // Add order to cycle
      await orderService.addOrderToCycle(cycleId, {
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
        totalAmount: getTotal()
      });

      toast.success('Order added to group cycle! 🎉');
      await clearCart();
      
      // Refresh cycle
      await fetchActiveOrderCycle();
      
      // Navigate to group detail to see progress
      navigate(`/groups/${selectedGroup.id}`);

    } catch (error) {
      console.error('Error placing order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setProcessingOrder(false);
    }
  };

  const handlePayNow = async () => {
    if (!activeOrderCycle) return;

    const userParticipant = activeOrderCycle.participants?.find(
      p => p.userId === currentUser.uid
    );

    if (!userParticipant) {
      toast.error('Your order not found in this cycle');
      return;
    }

    if (userParticipant.paymentStatus === 'paid') {
      toast.success('You have already paid!');
      return;
    }

    try {
      const paymentData = {
        orderId: activeOrderCycle.id,
        groupOrderId: activeOrderCycle.id,
        groupId: selectedGroup.id,
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        userPhone: userProfile.phone,
        amount: userParticipant.totalAmount
      };

      const result = await paymentService.initiatePayment(paymentData);

      if (result.success) {
        console.log('Payment initiated');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed');
    }
  };

  const getTotal = () => {
    const DELIVERY_FEE = 30;
    return getCartTotal() + DELIVERY_FEE;
  };

  const userParticipant = activeOrderCycle?.participants?.find(
    p => p.userId === currentUser.uid
  );

  const isInCollectingPhase = activeOrderCycle?.phase === 'collecting';
  const isInPaymentWindow = activeOrderCycle?.phase === 'payment_window';
  const canPlaceOrder = !activeOrderCycle || isInCollectingPhase;
  const canPayNow = isInPaymentWindow && userParticipant && userParticipant.paymentStatus !== 'paid';

  if (cartItems.length === 0 && !activeOrderCycle) {
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
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Shopping Cart</h1>
          <p className="text-gray-600">
            {canPlaceOrder ? 'Review your items' : 'Order cycle in progress'}
          </p>
        </div>

        {/* Phase Status */}
        {activeOrderCycle && (
          <PhaseStatusCard 
            cycle={activeOrderCycle}
            timeRemaining={timeRemaining}
            userParticipant={userParticipant}
          />
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Cart Items or Order Summary */}
          <div className="lg:col-span-2">
            {canPlaceOrder && cartItems.length > 0 ? (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onIncrement={() => incrementQuantity(item.id)}
                    onDecrement={() => decrementQuantity(item.id)}
                    onRemove={() => removeFromCart(item.id)}
                  />
                ))}
              </div>
            ) : userParticipant ? (
              <YourOrderCard participant={userParticipant} />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active orders</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Group Selector */}
            {userGroups.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-3">Select Group</h3>
                <select
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={selectedGroup?.id || ''}
                  onChange={(e) => {
                    const group = userGroups.find(g => g.id === e.target.value);
                    setSelectedGroup(group);
                  }}
                >
                  {userGroups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Order Summary */}
            {canPlaceOrder && cartItems.length > 0 && (
              <OrderSummaryCard
                cartTotal={getCartTotal()}
                total={getTotal()}
                onPlaceOrder={handlePlaceOrder}
                processing={processingOrder}
              />
            )}

            {/* Payment Button */}
            {canPayNow && (
              <PaymentCard
                amount={userParticipant.totalAmount}
                onPayNow={handlePayNow}
                timeRemaining={timeRemaining}
              />
            )}

            {/* Participants List */}
            {activeOrderCycle && activeOrderCycle.participants?.length > 0 && (
              <ParticipantsCard participants={activeOrderCycle.participants} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Phase Status Card
function PhaseStatusCard({ cycle, timeRemaining, userParticipant }) {
  const getPhaseInfo = () => {
    if (cycle.phase === 'collecting') {
      return {
        bg: 'from-blue-500 to-cyan-600',
        icon: <ClockIcon className="h-8 w-8" />,
        title: '⏱️ Collecting Orders',
        desc: 'Add items to your cart. Order cycle closes when timer ends.'
      };
    }
    if (cycle.phase === 'payment_window') {
      return {
        bg: 'from-orange-500 to-red-600',
        icon: <FireIcon className="h-8 w-8" />,
        title: '💳 Payment Window Open!',
        desc: 'Complete your payment before timer ends or your order will be cancelled.'
      };
    }
    if (cycle.phase === 'confirmed') {
      return {
        bg: 'from-green-500 to-emerald-600',
        icon: <CheckCircleIcon className="h-8 w-8" />,
        title: '✅ Order Confirmed',
        desc: 'Your order is being prepared for delivery tomorrow!'
      };
    }
    return {
      bg: 'from-gray-500 to-gray-600',
      icon: <SparklesIcon className="h-8 w-8" />,
      title: 'Order in Progress',
      desc: 'Your order is being processed'
    };
  };

  const info = getPhaseInfo();

  return (
    <div className={`bg-gradient-to-r ${info.bg} text-white rounded-2xl shadow-xl p-6 mb-6`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          {info.icon}
          <div>
            <h3 className="text-2xl font-bold mb-1">{info.title}</h3>
            <p className="text-white/90 text-sm">{info.desc}</p>
          </div>
        </div>
        
        {timeRemaining && (
          <div className="flex gap-2">
            <TimeUnit value={timeRemaining.hours} label="H" />
            <TimeUnit value={timeRemaining.minutes} label="M" />
            <TimeUnit value={timeRemaining.seconds} label="S" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
        <div>
          <p className="text-white/80 text-xs mb-1">Participants</p>
          <p className="text-2xl font-bold">{cycle.totalParticipants || 0}</p>
        </div>
        <div>
          <p className="text-white/80 text-xs mb-1">Total Value</p>
          <p className="text-2xl font-bold">₹{cycle.totalAmount?.toLocaleString() || 0}</p>
        </div>
        <div>
          <p className="text-white/80 text-xs mb-1">Your Status</p>
          <p className="text-lg font-bold">
            {userParticipant?.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className="text-center">
      <div className="bg-white/20 rounded-lg px-3 py-2 min-w-[50px]">
        <span className="text-2xl font-bold">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-xs opacity-75 mt-1 block">{label}</span>
    </div>
  );
}

// Cart Item Card
function CartItemCard({ item, onIncrement, onDecrement, onRemove }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex gap-4">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-lg flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              📦
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <button onClick={onRemove} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition">
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>

          <p className="text-green-600 font-bold text-xl mb-3">₹{item.groupPrice}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-2">
              <button onClick={onDecrement} className="p-1.5 hover:bg-white rounded-md transition">
                <span className="text-lg font-bold">−</span>
              </button>
              <span className="w-10 text-center font-bold text-lg">{item.quantity}</span>
              <button onClick={onIncrement} className="p-1.5 hover:bg-white rounded-md transition">
                <span className="text-lg font-bold">+</span>
              </button>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-xl font-bold">₹{item.groupPrice * item.quantity}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Your Order Card
function YourOrderCard({ participant }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4">Your Order</h3>
      
      <div className="space-y-3 mb-4">
        {participant.items.map((item, idx) => (
          <div key={idx} className="flex justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-600">{item.quantity} × ₹{item.groupPrice}</p>
            </div>
            <p className="font-bold">₹{item.quantity * item.groupPrice}</p>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 flex justify-between font-bold text-lg">
        <span>Total:</span>
        <span className="text-green-600">₹{participant.totalAmount}</span>
      </div>
    </div>
  );
}

// Order Summary Card
function OrderSummaryCard({ cartTotal, total, onPlaceOrder, processing }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-20">
      <h3 className="text-xl font-bold mb-4">Order Summary</h3>
      
      <div className="space-y-3 mb-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal:</span>
          <span className="font-medium">₹{cartTotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Delivery Fee:</span>
          <span className="font-medium">₹30</span>
        </div>
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span className="text-green-600">₹{total}</span>
        </div>
      </div>

      <button
        onClick={onPlaceOrder}
        disabled={processing}
        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
      >
        {processing ? 'Placing Order...' : 'Place Order'}
      </button>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Order will be added to group cycle
      </p>
    </div>
  );
}

// Payment Card
function PaymentCard({ amount, onPayNow, timeRemaining }) {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <FireIcon className="h-8 w-8 text-orange-600" />
        <div>
          <h3 className="font-bold text-lg">Complete Payment</h3>
          {timeRemaining && (
            <p className="text-sm text-orange-700">
              {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s left
            </p>
          )}
        </div>
      </div>

      <p className="text-3xl font-bold text-gray-900 mb-4">₹{amount}</p>

      <button
        onClick={onPayNow}
        className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold hover:shadow-lg transition"
      >
        Pay Now
      </button>

      <p className="text-xs text-orange-700 mt-3 text-center font-medium">
        ⚠️ Payment required or order will be cancelled
      </p>
    </div>
  );
}

// Participants Card
function ParticipantsCard({ participants }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <UsersIcon className="h-6 w-6 text-purple-600" />
        Participants ({participants.length})
      </h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {participants.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-sm">{p.userName}</p>
              <p className="text-xs text-gray-600">₹{p.totalAmount}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              p.paymentStatus === 'paid' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {p.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}