// src/pages/GroupOrderDetail.jsx - WITH DELIVERY TRACKING
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  CheckCircleIcon, ClockIcon, CurrencyRupeeIcon, ShoppingBagIcon, TruckIcon,
  ExclamationCircleIcon, ArrowLeftIcon, CreditCardIcon, ChartBarIcon,
  UsersIcon, SparklesIcon, PackageIcon, HomeIcon, XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GroupOrderDetail() {
  const { orderId } = useParams();
  const [groupOrder, setGroupOrder] = useState(null);
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
    
    const unsubscribe = orderService.subscribeToGroupOrder(orderId, (data) => {
      setGroupOrder(data);
    });

    return () => unsubscribe();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const data = await orderService.getGroupOrderDetails(orderId);
      
      if (!data) {
        toast.error('Order not found');
        navigate('/orders');
        return;
      }
      
      setGroupOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    const userParticipant = groupOrder?.participants?.find(p => p.userId === currentUser.uid);
    
    if (!userParticipant) {
      toast.error('Order not found');
      return;
    }

    setPaymentProcessing(true);

    try {
      const paymentData = {
        orderId: userParticipant.orderId,
        groupOrderId: orderId,
        groupId: groupOrder.groupId,
        userId: currentUser.uid,
        userName: userProfile.name,
        userEmail: userProfile.email,
        userPhone: userProfile.phone,
        amount: userParticipant.amount
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

  if (loading) {
    return <LoadingSpinner size="large" text="Loading order..." fullScreen />;
  }

  if (!groupOrder) {
    return (
      <div className="min-h-screen px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Order not found</h2>
        <button onClick={() => navigate('/orders')} className="btn-primary">
          Back to Orders
        </button>
      </div>
    );
  }

  const userParticipant = groupOrder.participants?.find(p => p.userId === currentUser.uid);
  const totalPaid = groupOrder.participants?.filter(p => p.paymentStatus === 'paid').length || 0;
  const totalParticipants = groupOrder.participants?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition">
          <ArrowLeftIcon className="h-5 w-5" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Order #{orderId.slice(-8).toUpperCase()}</h1>
          <OrderStatusBadge status={groupOrder.status} />
        </div>

        {/* Delivery Tracking Timeline */}
        {(groupOrder.status === 'processing' || groupOrder.status === 'completed') && (
          <DeliveryTimeline 
            status={groupOrder.deliveryStatus} 
            estimatedDelivery={groupOrder.estimatedDelivery}
            deliveredAt={groupOrder.deliveredAt}
          />
        )}

        {/* Payment Window Warning */}
        {groupOrder.status === 'payment_window' && groupOrder.paymentWindow?.isActive && (
          <PaymentWindowAlert expiresAt={groupOrder.paymentWindow.expiresAt} />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Amount" value={`₹${groupOrder.totalAmount?.toLocaleString() || 0}`} icon={CurrencyRupeeIcon} color="purple" />
          <StatCard title="Participants" value={totalParticipants} icon={UsersIcon} color="blue" />
          <StatCard title="Paid" value={`${totalPaid}/${totalParticipants}`} icon={CheckCircleIcon} color="green" />
          <StatCard title="Progress" value={`${groupOrder.paymentProgress || 0}%`} icon={ChartBarIcon} color="orange" />
        </div>

        {/* Product Quantities */}
        {groupOrder.productQuantities && Object.keys(groupOrder.productQuantities).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
              Bulk Buying Summary
            </h3>
            <div className="space-y-4">
              {Object.entries(groupOrder.productQuantities).map(([productId, data]) => (
                <ProductAggregationCard key={productId} productId={productId} data={data} />
              ))}
            </div>
          </div>
        )}

        {/* Your Order */}
        {userParticipant && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 mb-8 border-2 border-blue-200">
            <h3 className="text-xl font-bold mb-4">Your Order</h3>
            
            <div className="bg-white rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Payment Status:</span>
                <PaymentStatusBadge status={userParticipant.paymentStatus} />
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold mb-3">Your Items:</p>
                <div className="space-y-2">
                  {userParticipant.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.quantity} × ₹{item.price || item.groupPrice}</p>
                      </div>
                      <p className="font-bold">₹{item.quantity * (item.price || item.groupPrice)}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-green-600">₹{userParticipant.amount}</span>
                </div>
              </div>

              {userParticipant.paymentStatus !== 'paid' && groupOrder.paymentWindow?.isActive && (
                <button
                  onClick={handlePayNow}
                  disabled={paymentProcessing}
                  className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50"
                >
                  {paymentProcessing ? 'Processing...' : `Pay Now - ₹${userParticipant.amount}`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* All Participants */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-purple-600" />
            All Participants ({totalParticipants})
          </h3>
          
          <div className="space-y-3">
            {groupOrder.participants?.map((participant, index) => (
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

// Delivery Timeline Component
function DeliveryTimeline({ status, estimatedDelivery, deliveredAt }) {
  const steps = [
    { id: 'preparing', label: 'Preparing', icon: PackageIcon },
    { id: 'shipped', label: 'Shipped', icon: TruckIcon },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: TruckIcon },
    { id: 'delivered', label: 'Delivered', icon: HomeIcon }
  ];

  const currentIndex = steps.findIndex(s => s.id === status);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <h3 className="text-xl font-bold mb-6">🚚 Delivery Tracking</h3>
      
      <div className="relative">
        <div className="absolute top-5 left-0 w-full h-1 bg-gray-200">
          <div 
            className="h-full bg-green-600 transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="relative grid grid-cols-4 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.id} className="text-center">
                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 transition ${
                  isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'
                } ${isCurrent ? 'ring-4 ring-green-200 scale-110' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className={`text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {estimatedDelivery && !deliveredAt && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-blue-800">
            Estimated Delivery: <span className="font-bold">
              {new Date(estimatedDelivery.seconds * 1000).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </p>
        </div>
      )}

      {deliveredAt && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg text-center">
          <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-green-800 font-bold">
            Delivered on {new Date(deliveredAt.seconds * 1000).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}

// Payment Window Alert
function PaymentWindowAlert({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        setTimeLeft('Expired');
      } else {
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${minutes}m`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="mb-6 p-6 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-400 rounded-2xl">
      <div className="flex items-start gap-4">
        <ClockIcon className="h-8 w-8 text-orange-600 flex-shrink-0" />
        <div>
          <h3 className="text-xl font-bold text-orange-900 mb-2">⏰ Payment Window Active</h3>
          <p className="text-orange-800 mb-3">Complete your payment before time expires!</p>
          <div className="inline-block bg-white px-4 py-2 rounded-lg">
            <span className="font-bold text-orange-600 text-xl">{timeLeft}</span>
            <span className="text-sm text-gray-600 ml-2">remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Status Badges
function OrderStatusBadge({ status }) {
  const configs = {
    collecting: { color: 'bg-yellow-100 text-yellow-800', label: 'Collecting Orders' },
    payment_window: { color: 'bg-orange-100 text-orange-800', label: 'Payment Window Open' },
    active: { color: 'bg-blue-100 text-blue-800', label: 'Active' },
    confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
    processing: { color: 'bg-purple-100 text-purple-800', label: 'Processing' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
  };

  const config = configs[status] || configs.collecting;

  return (
    <span className={`inline-block px-4 py-2 rounded-full font-bold text-sm ${config.color}`}>
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
    <span className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 border ${config.color}`}>
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
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className={`inline-flex p-3 bg-gradient-to-br ${colors[color]} rounded-xl mb-3`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

// Product Aggregation Card
function ProductAggregationCard({ productId, data }) {
  const progress = (data.quantity / data.minQuantity) * 100;
  const isMet = data.quantity >= data.minQuantity;
  
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-lg">{data.name}</h4>
          <p className="text-sm text-gray-600">₹{data.price} per unit</p>
        </div>
        {isMet ? (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold">
            ✓ Minimum Met
          </span>
        ) : (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
            Need {data.minQuantity - data.quantity} more
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span className="font-bold">{data.quantity} / {data.minQuantity}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-full rounded-full ${isMet ? 'bg-green-600' : 'bg-orange-500'}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {data.participants && data.participants.length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs text-gray-600 mb-2">{data.participants.length} members ordering</p>
          <div className="flex flex-wrap gap-2">
            {data.participants.slice(0, 5).map((p, idx) => (
              <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                {p.userName} ({p.quantity})
              </span>
            ))}
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
    <div className={`p-4 rounded-xl border-2 ${isCurrentUser ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 text-white font-bold flex items-center justify-center">
            {index}
          </div>
          <div className="flex-1">
            <p className="font-semibold">
              {participant.userName}
              {isCurrentUser && <span className="text-blue-600 ml-2">(You)</span>}
            </p>
            <p className="text-sm text-gray-600">{participant.items?.length || 0} items • ₹{participant.amount}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <PaymentStatusBadge status={participant.paymentStatus} />
          <button onClick={() => setShowDetails(!showDetails)} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg className={`w-5 h-5 transition ${showDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-4 border-t">
          <p className="font-semibold mb-2">Items:</p>
          <div className="space-y-2">
            {participant.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-600">{item.quantity} × ₹{item.price || item.groupPrice}</p>
                </div>
                <p className="font-bold">₹{item.quantity * (item.price || item.groupPrice)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}