// src/pages/GroupOrderDetail.jsx - Updated with Razorpay Payment
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import { RazorpayButtonMobile } from '../components/RazorpayButton';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserGroupIcon, 
  CheckCircleIcon,
  ClockIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  TruckIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GroupOrderDetail() {
  const { orderId } = useParams();
  const [groupOrder, setGroupOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrderDetails();
    
    const unsubscribe = orderService.subscribeToGroupOrder(
      orderId,
      (data) => setGroupOrder(data)
    );

    return () => unsubscribe();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const data = await orderService.getGroupOrderDetails(orderId);
      setGroupOrder(data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Payment successful!', { 
      icon: '💰',
      duration: 5000 
    });
    fetchOrderDetails(); // Refresh order details
  };

  const handlePaymentFailure = (error) => {
    toast.error('Payment failed. Please try again.');
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
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Order not found</h2>
      </div>
    );
  }

  const userParticipant = groupOrder.participants?.find(p => p.userId === currentUser.uid);
  const totalPaid = groupOrder.participants?.filter(p => p.paymentStatus === 'paid').length || 0;
  const totalParticipants = groupOrder.participants?.length || 0;
  const paymentProgress = totalParticipants > 0 ? (totalPaid / totalParticipants) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Back</span>
        </button>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">Group Order Details</h1>
          <p className="text-sm sm:text-base text-gray-600">Order #{orderId.slice(-8).toUpperCase()}</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-xl font-bold">Payment Progress</h3>
            <span className="text-xl sm:text-2xl font-bold text-green-600">{Math.round(paymentProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-emerald-600 rounded-full transition-all duration-500 relative"
              style={{ width: `${paymentProgress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            {totalPaid} out of {totalParticipants} members have paid
          </p>
        </div>

        {/* Minimum Quantity Progress */}
        {groupOrder.productQuantities && Object.keys(groupOrder.productQuantities).length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Product Quantities</h3>
            <div className="space-y-3 sm:space-y-4">
              {Object.entries(groupOrder.productQuantities).map(([productId, data]) => {
                const progress = (data.quantity / data.minQuantity) * 100;
                const isMet = data.quantity >= data.minQuantity;
                
                return (
                  <div key={productId} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-2 sm:mb-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{data.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Current: {data.quantity} | Min: {data.minQuantity}
                        </p>
                      </div>
                      {isMet ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center gap-1 flex-shrink-0">
                          <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Met</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold flex-shrink-0">
                          +{data.minQuantity - data.quantity}
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
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
                );
              })}
            </div>
          </div>
        )}

        {/* User's Order Section with Razorpay Payment */}
        {userParticipant && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-blue-200">
            <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
              <ShoppingBagIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              <span>Your Order</span>
            </h3>
            
            <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <span className="font-semibold text-gray-700 text-sm sm:text-base">Payment Status:</span>
                <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold text-xs sm:text-sm ${
                  userParticipant.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {userParticipant.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
                </span>
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <p className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Your Items:</p>
                <div className="space-y-1.5 sm:space-y-2">
                  {userParticipant.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs sm:text-sm">
                      <span className="truncate mr-2">{item.name} x{item.quantity}</span>
                      <span className="font-medium flex-shrink-0">₹{item.groupPrice * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-2 sm:mt-3 pt-2 sm:pt-3">
                  <div className="flex justify-between font-bold text-base sm:text-lg">
                    <span>Your Total:</span>
                    <span className="text-green-600">₹{userParticipant.amount}</span>
                  </div>
                </div>
              </div>

              {/* Razorpay Payment Button */}
              {userParticipant.paymentStatus !== 'paid' && (
                <div className="mt-3 sm:mt-4">
                  <RazorpayButtonMobile
                    orderData={{
                      orderId: userParticipant.orderId,
                      groupOrderId: orderId,
                      groupId: groupOrder.groupId,
                      userId: currentUser.uid,
                      userName: userProfile.name,
                      userEmail: userProfile.email,
                      userPhone: userProfile.phone
                    }}
                    amount={userParticipant.amount}
                    onSuccess={handlePaymentSuccess}
                    onFailure={handlePaymentFailure}
                    buttonText="Pay Now"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Participants */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">All Participants</h3>
          <div className="space-y-2 sm:space-y-3">
            {groupOrder.participants?.map((participant, index) => (
              <ParticipantCard 
                key={index} 
                participant={participant}
                isCurrentUser={participant.userId === currentUser.uid}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 lg:p-6">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`p-2 sm:p-3 bg-gradient-to-br ${colorClasses[color]} rounded-lg sm:rounded-xl`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
        </div>
      </div>
      <p className="text-xs sm:text-sm text-gray-600 font-medium mb-0.5 sm:mb-1">{title}</p>
      <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 capitalize truncate">{value}</p>
    </div>
  );
}

function ParticipantCard({ participant, isCurrentUser }) {
  return (
    <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all ${
      isCurrentUser 
        ? 'border-blue-300 bg-blue-50' 
        : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
            {participant.userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">
              {participant.userName}
              {isCurrentUser && <span className="text-blue-600 text-xs sm:text-sm ml-1 sm:ml-2">(You)</span>}
            </p>
            <p className="text-xs sm:text-sm text-gray-600">{participant.items.length} items</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-gray-800 text-sm sm:text-base">₹{participant.amount}</p>
          <span className={`inline-block px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold mt-1 ${
            participant.paymentStatus === 'paid'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {participant.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
          </span>
        </div>
      </div>
    </div>
  );
}

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