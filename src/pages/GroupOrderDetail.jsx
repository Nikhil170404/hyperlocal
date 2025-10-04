// src/pages/GroupOrderDetail.jsx - COMPLETE WITH COUNTDOWN TIMER
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/LoadingSpinner';
import CountdownTimer from '../components/CountdownTimer';
import { 
  CheckCircleIcon, ClockIcon, CurrencyRupeeIcon, ShoppingBagIcon, TruckIcon,
  ExclamationCircleIcon, ArrowLeftIcon, CreditCardIcon, ChartBarIcon,
  UsersIcon, SparklesIcon, HomeIcon, XCircleIcon, CubeIcon, FireIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GroupOrderDetail() {
  const { orderId } = useParams();
  const [orderCycle, setOrderCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!orderId) {
      toast.error('Invalid order ID');
      navigate('/orders');
      return;
    }

    fetchOrderDetails();
    
    const unsubscribe = orderService.subscribeToOrderCycle(orderId, (data) => {
      setOrderCycle(data);
    });

    return () => unsubscribe();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const data = await orderService.getOrderCycleDetails(orderId);
      
      if (!data) {
        toast.error('Order not found');
        navigate('/orders');
        return;
      }
      
      setOrderCycle(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    const userParticipant = orderCycle?.participants?.find(p => p.userId === currentUser.uid);
    
    if (!userParticipant) {
      toast.error('Order not found');
      return;
    }

    setPaymentProcessing(true);

    try {
      const paymentData = {
        orderId: orderId,
        groupId: orderCycle.groupId,
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        userPhone: userProfile.phone,
        amount: userParticipant.totalAmount
      };

      const result = await paymentService.initiatePayment(paymentData);

      if (!result.success) {
        toast.error('Failed to initiate payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleTimerExpire = () => {
    toast.error('Time has expired! Refreshing order status...', { duration: 5000 });
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (loading) {
    return <LoadingSpinner size="large" text="Loading order..." fullScreen />;
  }

  if (!orderCycle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50 px-4">
        <div className="text-center">
          <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h2>
          <p className="text-gray-600 mb-6">This order doesn't exist or has been removed</p>
          <button 
            onClick={() => navigate('/orders')} 
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition-all"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const userParticipant = orderCycle.participants?.find(p => p.userId === currentUser.uid);
  const totalPaid = orderCycle.participants?.filter(p => p.paymentStatus === 'paid').length || 0;
  const totalParticipants = orderCycle.participants?.length || 0;
  const paymentProgress = totalParticipants > 0 ? Math.round((totalPaid / totalParticipants) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors group"
        >
          <ArrowLeftIcon className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-3">
            Order #{orderId.slice(-8).toUpperCase()}
          </h1>
          <OrderStatusBadge status={orderCycle.phase} />
        </div>

        {/* COUNTDOWN TIMER - Collecting Phase */}
        {orderCycle.phase === 'collecting' && orderCycle.collectingEndsAt && (
          <div className="mb-8">
            <CountdownTimer
              endTime={orderCycle.collectingEndsAt}
              phase="collecting"
              title="🛒 Collection Phase Ending"
              size="large"
              onExpire={handleTimerExpire}
            />
          </div>
        )}

        {/* COUNTDOWN TIMER - Payment Window */}
        {orderCycle.phase === 'payment_window' && orderCycle.paymentWindowEndsAt && (
          <div className="mb-8">
            <CountdownTimer
              endTime={orderCycle.paymentWindowEndsAt}
              phase="payment_window"
              title="💳 Payment Deadline"
              size="large"
              onExpire={handleTimerExpire}
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard 
            title="Total Amount" 
            value={`₹${orderCycle.totalAmount?.toLocaleString() || 0}`} 
            icon={CurrencyRupeeIcon} 
            color="purple" 
          />
          <StatCard 
            title="Participants" 
            value={totalParticipants} 
            icon={UsersIcon} 
            color="blue" 
          />
          <StatCard 
            title="Paid" 
            value={`${totalPaid}/${totalParticipants}`} 
            icon={CheckCircleIcon} 
            color="green" 
          />
          <StatCard 
            title="Progress" 
            value={`${paymentProgress}%`} 
            icon={ChartBarIcon} 
            color="orange" 
          />
        </div>

        {/* Product Quantities */}
        {orderCycle.productOrders && Object.keys(orderCycle.productOrders).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CubeIcon className="h-6 w-6 text-green-600" />
              Product Summary
            </h3>
            <div className="space-y-4">
              {Object.entries(orderCycle.productOrders).map(([productId, data]) => (
                <ProductAggregationCard key={productId} productId={productId} data={data} />
              ))}
            </div>
          </div>
        )}

        {/* Your Order */}
        {userParticipant && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 mb-8 border-2 border-blue-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
              Your Order
            </h3>
            
            <div className="bg-white rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b">
                <span className="font-semibold text-gray-700">Payment Status:</span>
                <PaymentStatusBadge status={userParticipant.paymentStatus} />
              </div>

              <div>
                <p className="font-semibold text-gray-900 mb-3">Your Items:</p>
                <div className="space-y-2">
                  {userParticipant.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.quantity} × ₹{item.groupPrice}</p>
                      </div>
                      <p className="font-bold text-lg text-gray-900">₹{(item.quantity * item.groupPrice).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-4 pt-4 flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-green-600">₹{userParticipant.totalAmount?.toLocaleString()}</span>
                </div>
              </div>

              {userParticipant.paymentStatus !== 'paid' && orderCycle.phase === 'payment_window' && (
                <button
                  onClick={handlePayNow}
                  disabled={paymentProcessing}
                  className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 sm:py-4 rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCardIcon className="h-5 w-5" />
                      <span>Pay Now - ₹{userParticipant.totalAmount?.toLocaleString()}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* All Participants */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-purple-600" />
            All Participants ({totalParticipants})
          </h3>
          
          <div className="space-y-3">
            {orderCycle.participants?.map((participant, index) => (
              <ParticipantCard 
                key={index} 
                participant={participant}
                isCurrentUser={participant.userId === currentUser.uid}
                index={index + 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Status Badges
function OrderStatusBadge({ status }) {
  const configs = {
    collecting: { color: 'bg-blue-100 text-blue-800', label: 'Collecting Orders', icon: ClockIcon },
    payment_window: { color: 'bg-orange-100 text-orange-800', label: 'Payment Window', icon: CurrencyRupeeIcon },
    confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed', icon: CheckCircleIcon },
    processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing', icon: TruckIcon },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircleIcon },
    cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: XCircleIcon }
  };

  const config = configs[status] || configs.collecting;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${config.color}`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const configs = {
    paid: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircleIcon, label: 'Paid' },
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: ClockIcon, label: 'Pending' },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircleIcon, label: 'Failed' }
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full font-bold text-xs sm:text-sm border ${config.color}`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
}

// Stat Card
function StatCard({ title, value, icon: Icon, color }) {
  const colors = {
    purple: 'from-purple-500 to-pink-600',
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-xl transition-shadow">
      <div className={`inline-flex p-2 sm:p-3 bg-gradient-to-br ${colors[color]} rounded-xl mb-3`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
      <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-xl sm:text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

// Product Aggregation Card
function ProductAggregationCard({ productId, data }) {
  const progress = (data.quantity / data.minQuantity) * 100;
  const isMet = data.quantity >= data.minQuantity;
  
  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-base sm:text-lg text-gray-900">{data.name}</h4>
          <p className="text-sm text-gray-600">₹{data.price} per unit</p>
        </div>
        {isMet ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap">
            <CheckCircleIcon className="h-4 w-4" />
            Minimum Met
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap">
            <ClockIcon className="h-4 w-4" />
            Need {data.minQuantity - data.quantity} more
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="font-bold text-gray-900">{data.quantity} / {data.minQuantity}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isMet ? 'bg-green-600' : 'bg-orange-500'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {data.participants && data.participants.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-600 mb-2 font-medium">{data.participants.length} members ordering</p>
          <div className="flex flex-wrap gap-2">
            {data.participants.slice(0, 5).map((p, idx) => (
              <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                {p.userName} ({p.quantity})
              </span>
            ))}
            {data.participants.length > 5 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                +{data.participants.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Participant Card
function ParticipantCard({ participant, isCurrentUser, index }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      isCurrentUser ? 'border-blue-300 bg-blue-50 shadow-md' : 'border-gray-200 bg-white hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 text-white font-bold flex items-center justify-center flex-shrink-0">
            {index}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {participant.userName}
              {isCurrentUser && <span className="text-blue-600 ml-2">(You)</span>}
            </p>
            <p className="text-sm text-gray-600">{participant.items?.length || 0} items • ₹{participant.totalAmount?.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="hidden sm:block">
            <PaymentStatusBadge status={participant.paymentStatus} />
          </div>
          <button 
            onClick={() => setShowDetails(!showDetails)} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle details"
          >
            <svg className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Payment Status */}
      <div className="sm:hidden mt-3">
        <PaymentStatusBadge status={participant.paymentStatus} />
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in">
          <p className="font-semibold text-gray-900 mb-3">Items:</p>
          <div className="space-y-2">
            {participant.items?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-600">{item.quantity} × ₹{item.groupPrice}</p>
                </div>
                <p className="font-bold text-gray-900 ml-3">₹{(item.quantity * item.groupPrice).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}