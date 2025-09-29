// src/pages/GroupOrderDetail.jsx - ENHANCED FOR BULK BUYING VIEW
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserGroupIcon, 
  CheckCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  TruckIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  CreditCardIcon,
  ChartBarIcon,
  UsersIcon
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
    
    const unsubscribe = orderService.subscribeToGroupOrder(
      orderId,
      (data) => {
        console.log('📡 Group order updated:', data);
        setGroupOrder(data);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      console.log('📥 Fetching order:', orderId);
      const data = await orderService.getGroupOrderDetails(orderId);
      
      if (!data) {
        toast.error('Order not found');
        navigate('/orders');
        return;
      }
      
      console.log('✅ Order loaded:', data);
      setGroupOrder(data);
    } catch (error) {
      console.error('❌ Error fetching order:', error);
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
      console.error('❌ Payment error:', error);
      toast.error('Payment failed');
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <LoadingSpinner size="large" text="Loading order details..." fullScreen />
      </div>
    );
  }

  if (!groupOrder) {
    return (
      <div className="min-h-screen px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Order not found</h2>
        <button
          onClick={() => navigate('/orders')}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  const userParticipant = groupOrder.participants?.find(p => p.userId === currentUser.uid);
  const totalPaid = groupOrder.participants?.filter(p => p.paymentStatus === 'paid').length || 0;
  const totalParticipants = groupOrder.participants?.length || 0;
  const paymentProgress = totalParticipants > 0 ? (totalPaid / totalParticipants) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back</span>
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Group Order Details</h1>
          <p className="text-gray-600">Order #{orderId.slice(-8).toUpperCase()}</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Amount"
            value={`₹${groupOrder.totalAmount?.toLocaleString() || 0}`}
            icon={CurrencyRupeeIcon}
            color="purple"
          />
          <StatCard
            title="Participants"
            value={totalParticipants}
            icon={UserGroupIcon}
            color="blue"
          />
          <StatCard
            title="Paid"
            value={`${totalPaid}/${totalParticipants}`}
            icon={CheckCircleIcon}
            color="green"
          />
          <StatCard
            title="Status"
            value={groupOrder.status}
            icon={getStatusIcon(groupOrder.status)}
            color="orange"
          />
        </div>

        {/* Payment Progress */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Payment Progress</h3>
            <span className="text-2xl font-bold text-green-600">{Math.round(paymentProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${paymentProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {totalPaid} out of {totalParticipants} members have paid
          </p>
        </div>

        {/* BULK BUYING - Product Quantities Aggregated */}
        {groupOrder.productQuantities && Object.keys(groupOrder.productQuantities).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
              Bulk Buying Progress (All Members Combined)
            </h3>
            <div className="space-y-4">
              {Object.entries(groupOrder.productQuantities).map(([productId, data]) => {
                const progress = (data.quantity / data.minQuantity) * 100;
                const isMet = data.quantity >= data.minQuantity;
                const remaining = Math.max(data.minQuantity - data.quantity, 0);
                
                return (
                  <div key={productId} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg">{data.name}</h4>
                        <p className="text-sm text-gray-600">
                          Group Price: ₹{data.price} per unit
                        </p>
                      </div>
                      {isMet ? (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-bold flex items-center gap-1">
                          <CheckCircleIcon className="h-4 w-4" />
                          Minimum Met!
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-bold">
                          Need {remaining} more
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Current / Minimum</span>
                        <span className="font-bold text-gray-800">
                          {data.quantity} / {data.minQuantity} units
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isMet 
                              ? 'bg-gradient-to-r from-green-600 to-emerald-600' 
                              : 'bg-gradient-to-r from-orange-500 to-yellow-500'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-600">Current</p>
                        <p className="text-lg font-bold text-gray-800">{data.quantity}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-600">Minimum</p>
                        <p className="text-lg font-bold text-gray-800">{data.minQuantity}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-600">Progress</p>
                        <p className="text-lg font-bold text-green-600">{Math.round(progress)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Status */}
            <div className={`mt-6 p-4 rounded-xl ${
              groupOrder.minQuantityMet 
                ? 'bg-green-50 border-2 border-green-200' 
                : 'bg-orange-50 border-2 border-orange-200'
            }`}>
              <div className="flex items-center gap-3">
                {groupOrder.minQuantityMet ? (
                  <>
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-bold text-green-800 text-lg">All Minimums Met! 🎉</p>
                      <p className="text-sm text-green-700">
                        This order qualifies for bulk pricing. Waiting for all payments.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <ExclamationCircleIcon className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="font-bold text-orange-800 text-lg">More Orders Needed</p>
                      <p className="text-sm text-orange-700">
                        Keep inviting members to reach minimum quantities!
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Your Order Section */}
        {userParticipant && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-6 mb-8 border-2 border-blue-200">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
              Your Order
            </h3>
            
            <div className="bg-white rounded-xl p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-gray-700">Payment Status:</span>
                <span className={`px-4 py-2 rounded-full font-bold ${
                  userParticipant.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {userParticipant.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
                </span>
              </div>

              <div className="border-t pt-4">
                <p className="font-semibold text-gray-700 mb-3">Your Items:</p>
                <div className="space-y-2">
                  {userParticipant.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <span className="font-medium">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-3 pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Your Total:</span>
                    <span className="text-green-600">₹{userParticipant.amount}</span>
                  </div>
                </div>
              </div>

              {userParticipant.paymentStatus !== 'paid' && (
                <div className="mt-4">
                  <button
                    onClick={handlePayNow}
                    disabled={paymentProcessing}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {paymentProcessing ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CreditCardIcon className="h-5 w-5" />
                        <span>Pay Now - ₹{userParticipant.amount}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Participants - Shows Everyone's Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-purple-600" />
            All Group Members ({totalParticipants} Participants)
          </h3>
          {groupOrder.participants && groupOrder.participants.length > 0 ? (
            <div className="space-y-3">
              {groupOrder.participants.map((participant, index) => (
                <ParticipantCard 
                  key={index} 
                  participant={participant}
                  isCurrentUser={participant.userId === currentUser.uid}
                  index={index + 1}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No participants yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 lg:p-6">
      <div className={`inline-flex p-2 lg:p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl mb-3`}>
        <Icon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
      </div>
      <p className="text-xs lg:text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-xl lg:text-2xl font-bold text-gray-800 capitalize truncate">{value}</p>
    </div>
  );
}

// Participant Card Component - Shows Individual Member's Order
function ParticipantCard({ participant, isCurrentUser, index }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      isCurrentUser 
        ? 'border-blue-300 bg-blue-50' 
        : 'border-gray-200 bg-white hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-white font-bold flex-shrink-0">
            {index}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 truncate">
              {participant.userName}
              {isCurrentUser && <span className="text-blue-600 ml-2">(You)</span>}
            </p>
            <p className="text-sm text-gray-600">
              {participant.items?.length || 0} items • ₹{participant.amount}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            participant.paymentStatus === 'paid'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {participant.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
          </span>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <svg 
              className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200 animate-fade-in">
          <p className="font-semibold text-gray-700 mb-2">Items Ordered:</p>
          <div className="space-y-2">
            {participant.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                  <p className="text-xs text-gray-600">Quantity: {item.quantity} × ₹{item.price}</p>
                </div>
                <p className="font-bold text-gray-800">₹{item.quantity * item.price}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex justify-between font-bold">
              <span>Member Total:</span>
              <span className="text-green-600">₹{participant.amount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function
function getStatusIcon(status) {
  const icons = {
    collecting: ClockIcon,
    active: ShoppingBagIcon,
    confirmed: CheckCircleIcon,
    shipped: TruckIcon,
    delivered: CheckCircleIcon
  };
  return icons[status] || ClockIcon;
}