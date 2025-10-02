// src/pages/GroupDetail.jsx - Enhanced with Order Cycles
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import RazorpayButton from '../components/RazorpayButton';
import { 
  UserGroupIcon,
  MapPinIcon,
  UsersIcon,
  ShoppingBagIcon,
  ClockIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowLeftIcon,
  CurrencyRupeeIcon,
  TruckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { ProgressBar } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState(null);
  const [orderCycle, setOrderCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

  // Subscribe to order cycle updates
  useEffect(() => {
    if (!groupId || !group) return;

    const unsubscribe = onSnapshot(
      doc(db, 'groups', groupId),
      async (groupDoc) => {
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          setGroup({ id: groupDoc.id, ...groupData });
          
          if (groupData.currentOrderCycle) {
            const cycleDoc = await getDoc(doc(db, 'orderCycles', groupData.currentOrderCycle));
            if (cycleDoc.exists()) {
              setOrderCycle({ id: cycleDoc.id, ...cycleDoc.data() });
            }
          } else {
            setOrderCycle(null);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [groupId, group]);

  // Update countdown timer
  useEffect(() => {
    if (!orderCycle) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let targetTime;

      if (orderCycle.phase === 'collecting' && orderCycle.collectingEndsAt) {
        targetTime = orderCycle.collectingEndsAt.toMillis();
      } else if (orderCycle.phase === 'payment_window' && orderCycle.paymentWindowEndsAt) {
        targetTime = orderCycle.paymentWindowEndsAt.toMillis();
      }

      if (targetTime) {
        const diff = targetTime - now;
        if (diff > 0) {
          setTimeRemaining(diff);
        } else {
          setTimeRemaining(0);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderCycle]);

  const fetchGroupDetails = async () => {
    try {
      setLoading(true);
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      
      if (groupDoc.exists()) {
        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        setGroup(groupData);
        
        // Check if user is a member
        const isMember = groupData.members?.includes(currentUser.uid);
        
        if (!isMember) {
          toast.error('You are not a member of this group. Please join first.');
          navigate('/groups');
          return;
        }
        
        // Fetch active order cycle if exists
        if (groupData.currentOrderCycle) {
          const cycleDoc = await getDoc(doc(db, 'orderCycles', groupData.currentOrderCycle));
          if (cycleDoc.exists()) {
            setOrderCycle({ id: cycleDoc.id, ...cycleDoc.data() });
          }
        }
      } else {
        toast.error('Group not found');
        navigate('/groups');
      }
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleStartShopping = () => {
    // Store selected group in localStorage for cart
    localStorage.setItem('selectedGroupId', groupId);
    navigate('/products', { state: { fromGroup: true } });
  };

  const formatTimeRemaining = (ms) => {
    if (!ms) return 'Calculating...';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getPhaseInfo = (phase) => {
    const phases = {
      collecting: {
        title: 'Collecting Orders',
        color: 'blue',
        icon: ClockIcon,
        description: 'Add items to your cart and place your order'
      },
      payment_window: {
        title: 'Payment Window',
        color: 'yellow',
        icon: CurrencyRupeeIcon,
        description: 'Complete your payment to confirm your order'
      },
      confirmed: {
        title: 'Order Confirmed',
        color: 'green',
        icon: CheckCircleIcon,
        description: 'Your order is confirmed and being processed'
      },
      processing: {
        title: 'Processing',
        color: 'purple',
        icon: TruckIcon,
        description: 'Your order is being prepared for delivery'
      },
      completed: {
        title: 'Completed',
        color: 'green',
        icon: CheckCircleIcon,
        description: 'Order delivered successfully'
      },
      cancelled: {
        title: 'Cancelled',
        color: 'red',
        icon: XCircleIcon,
        description: 'This order cycle was cancelled'
      }
    };
    
    return phases[phase] || phases.collecting;
  };

  const getUserParticipation = () => {
    if (!orderCycle || !currentUser) return null;
    return orderCycle.participants?.find(p => p.userId === currentUser.uid);
  };

  const handlePayment = async () => {
    const participation = getUserParticipation();
    if (!participation) return;

    const paymentData = {
      orderId: orderCycle.id,
      groupId: groupId,
      userId: currentUser.uid,
      userName: userProfile.name,
      userEmail: userProfile.email,
      userPhone: userProfile.phone,
      amount: participation.totalAmount
    };

    try {
      await paymentService.initiatePayment(paymentData);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const phaseInfo = orderCycle ? getPhaseInfo(orderCycle.phase) : null;
  const PhaseIcon = phaseInfo?.icon;
  const userParticipation = getUserParticipation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/groups')}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-green-600 font-medium mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back to Groups</span>
        </button>

        {/* Group Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="relative h-48 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 flex items-center justify-center">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32"></div>
            </div>
            <UserGroupIcon className="h-24 w-24 text-white relative z-10" />
          </div>
          
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{group.name}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <MapPinIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Location</div>
                  <div className="font-semibold text-gray-900">
                    {group.area?.city}, {group.area?.pincode}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Members</div>
                  <div className="font-semibold text-gray-900">
                    {group.members?.length || 0} / {group.maxMembers || 100}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ShoppingBagIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                  <div className="font-semibold text-gray-900">
                    {group.stats?.totalOrders || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Cycle Status */}
        {orderCycle ? (
          <div className="space-y-6">
            {/* Phase Banner */}
            <div className={`bg-gradient-to-r ${
              phaseInfo.color === 'blue' ? 'from-blue-500 to-cyan-600' :
              phaseInfo.color === 'yellow' ? 'from-yellow-500 to-orange-600' :
              phaseInfo.color === 'green' ? 'from-green-500 to-emerald-600' :
              phaseInfo.color === 'purple' ? 'from-purple-500 to-pink-600' :
              'from-red-500 to-pink-600'
            } text-white rounded-2xl shadow-lg p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {PhaseIcon && (
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <PhaseIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{phaseInfo.title}</h2>
                    <p className="text-white/90">{phaseInfo.description}</p>
                  </div>
                </div>

                {timeRemaining !== null && (orderCycle.phase === 'collecting' || orderCycle.phase === 'payment_window') && (
                  <div className="text-right">
                    <div className="text-sm text-white/90 mb-1">Time Remaining</div>
                    <div className="text-3xl font-bold">{formatTimeRemaining(timeRemaining)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* User's Order Status */}
            {userParticipation && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Order</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <div className="text-sm text-blue-700 mb-1">Items</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {userParticipation.items?.length || 0}
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="text-sm text-green-700 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-green-900">
                      ₹{userParticipation.totalAmount?.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4">
                    <div className="text-sm text-purple-700 mb-1">Payment Status</div>
                    <div className="text-lg font-bold text-purple-900 capitalize">
                      {userParticipation.paymentStatus}
                    </div>
                  </div>
                </div>

                {/* Payment Button */}
                {orderCycle.phase === 'payment_window' && userParticipation.paymentStatus === 'pending' && (
                  <button
                    onClick={handlePayment}
                    className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <CurrencyRupeeIcon className="h-6 w-6" />
                    <span>Pay Now - ₹{userParticipation.totalAmount?.toLocaleString()}</span>
                  </button>
                )}

                {/* Items List */}
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {userParticipation.items?.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                        </div>
                        <div className="text-lg font-bold text-green-600">
                          ₹{(item.groupPrice * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Product Progress */}
            {orderCycle.productOrders && Object.keys(orderCycle.productOrders).length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Product Progress</h3>
                
                <div className="space-y-4">
                  {Object.values(orderCycle.productOrders).map((product, index) => {
                    const progress = Math.min((product.quantity / product.minQuantity) * 100, 100);
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">{product.name}</h4>
                            <div className="text-sm text-gray-600">
                              {product.quantity} / {product.minQuantity} units
                            </div>
                          </div>
                          {product.metMinimum ? (
                            <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                              <CheckCircleIcon className="h-4 w-4" />
                              <span>Goal Met!</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                              {product.minQuantity - product.quantity} more needed
                            </span>
                          )}
                        </div>
                        
                        <ProgressBar
                          progress={progress}
                          color={product.metMinimum ? 'green' : 'blue'}
                          showPercentage={false}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Participants */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Participants ({orderCycle.totalParticipants || 0})
              </h3>
              
              <div className="space-y-3">
                {orderCycle.participants?.map((participant, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                        {participant.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{participant.userName}</div>
                        <div className="text-sm text-gray-600">
                          {participant.items?.length} items • ₹{participant.totalAmount?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {participant.paymentStatus === 'paid' ? (
                        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <CheckCircleIcon className="h-4 w-4" />
                          <span>Paid</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Order Cycle</h3>
            <p className="text-gray-600 mb-6">
              There's no active order cycle for this group. Start shopping to create a new one!
            </p>
            <button
              onClick={handleStartShopping}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all"
            >
              <ShoppingBagIcon className="h-5 w-5" />
              <span>Start Shopping</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}