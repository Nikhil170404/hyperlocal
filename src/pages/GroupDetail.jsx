// src/pages/GroupDetail.jsx - REFACTORED: Completed orders management, Add to Cart functionality
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import { paymentService } from '../services/paymentService';
import CountdownTimer from '../components/CountdownTimer';
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
  XCircleIcon,
  FireIcon,
  PlusIcon,
  ExclamationCircleIcon,
  BellIcon,
  ShareIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { ProgressBar } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

// ============================================
// CONSTANTS
// ============================================
const PHASE_CONFIG = {
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

// ============================================
// UTILITY FUNCTIONS
// ============================================
const getPhaseInfo = (phase) => PHASE_CONFIG[phase] || PHASE_CONFIG.collecting;

const createShareMessage = (group, orderCycle, participation) => {
  return `📦 Group Order Update - ${group.name}\n\n${
    orderCycle.phase === 'collecting'
      ? '🛒 Collection phase is active! Add items now.\n'
      : orderCycle.phase === 'payment_window'
      ? '💳 Payment window is open! Complete payment.\n'
      : '✅ Order confirmed and being processed.\n'
  }${participation ? `\nYour order: ₹${participation.totalAmount?.toLocaleString()}\nItems: ${participation.items?.length}\n` : ''}\nCheck details: ${window.location.href}`;
};

// ============================================
// SUB-COMPONENTS
// ============================================
function GroupHeader({ group }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
      <div className="relative h-48 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 flex items-center justify-center">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32" />
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
  );
}

function PhaseBanner({ phaseInfo, orderCycle, onStartShopping, userIsParticipating, onShare }) {
  const PhaseIcon = phaseInfo?.icon;

  return (
    <div className={`bg-gradient-to-r ${
      phaseInfo.color === 'blue' ? 'from-blue-500 to-cyan-600' :
      phaseInfo.color === 'yellow' ? 'from-yellow-500 to-orange-600' :
      phaseInfo.color === 'green' ? 'from-green-500 to-emerald-600' :
      phaseInfo.color === 'purple' ? 'from-purple-500 to-pink-600' :
      'from-red-500 to-pink-600'
    } text-white rounded-2xl shadow-lg p-6`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
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

        {orderCycle.phase === 'collecting' && (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={onStartShopping}
              className="px-6 py-3 bg-white text-green-600 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2"
            >
              {userIsParticipating ? (
                <>
                  <ShoppingCartIcon className="h-5 w-5" />
                  <span>Add to Cart</span>
                </>
              ) : (
                <>
                  <ShoppingBagIcon className="h-5 w-5" />
                  <span>Start Shopping</span>
                </>
              )}
            </button>
            {onShare && (
              <button
                onClick={onShare}
                className="px-4 py-3 bg-white/20 backdrop-blur-sm text-white border-2 border-white/40 rounded-xl font-medium hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <ShareIcon className="h-5 w-5" />
                <span>Share</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NewMemberInfo({ onStartShopping }) {
  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <ExclamationCircleIcon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-blue-900 mb-2">
            Welcome to the Group! 🎉
          </h3>
          <p className="text-blue-800 mb-4">
            An active order cycle is currently running. You can join this cycle by adding items to your cart and placing an order before the collection phase ends.
          </p>
          <button
            onClick={onStartShopping}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ShoppingBagIcon className="h-5 w-5" />
            <span>Browse Products & Join</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function UserOrderSummary({ participation, orderPhase, onPayment, onWhatsAppReminder }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Your Order</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="text-sm text-blue-700 mb-1">Items</div>
          <div className="text-2xl font-bold text-blue-900">
            {participation.items?.length || 0}
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-sm text-green-700 mb-1">Total Amount</div>
          <div className="text-2xl font-bold text-green-900">
            ₹{participation.totalAmount?.toLocaleString()}
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-4">
          <div className="text-sm text-purple-700 mb-1">Payment Status</div>
          <div className="text-lg font-bold text-purple-900 capitalize">
            {participation.paymentStatus}
          </div>
        </div>
      </div>

      {/* Payment Buttons */}
      {orderPhase === 'payment_window' && participation.paymentStatus === 'pending' && (
        <div className="space-y-3">
          <button
            onClick={onPayment}
            className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <CurrencyRupeeIcon className="h-6 w-6" />
            <span>Pay with UPI / Card - ₹{participation.totalAmount?.toLocaleString()}</span>
          </button>
          <button
            onClick={onWhatsAppReminder}
            className="w-full py-2.5 px-6 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-xl font-medium hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
          >
            <BellIcon className="h-5 w-5" />
            <span>Send Payment Reminder</span>
          </button>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              💡 Accepted: UPI, Credit/Debit Cards, Net Banking, Wallets
            </p>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
        <div className="space-y-2">
          {participation.items?.map((item, index) => (
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
  );
}

function ProductProgress({ productOrders }) {
  if (!productOrders || Object.keys(productOrders).length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Product Progress</h3>

      <div className="space-y-4">
        {Object.values(productOrders).map((product, index) => {
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
  );
}

function ParticipantsList({ participants, currentUserId }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Participants ({participants?.length || 0})
      </h3>

      <div className="space-y-3">
        {participants?.map((participant, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                {participant.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {participant.userName}
                  {participant.userId === currentUserId && (
                    <span className="ml-2 text-sm text-blue-600 font-semibold">(You)</span>
                  )}
                </div>
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
  );
}

function RecentOrderCard({ cycle, currentUserId, onStartNewOrder }) {
  const phaseInfo = getPhaseInfo(cycle.phase);
  const PhaseIcon = phaseInfo?.icon;
  const userParticipation = cycle.participants?.find(p => p.userId === currentUserId);
  const isCompleted = cycle.phase === 'completed';

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {PhaseIcon && (
            <div className={`w-12 h-12 bg-gradient-to-br ${
              isCompleted ? 'from-green-500 to-emerald-600' : 'from-purple-500 to-pink-600'
            } rounded-xl flex items-center justify-center`}>
              <PhaseIcon className="h-6 w-6 text-white" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-gray-900">Order #{cycle.id.slice(0, 8)}</h3>
            <p className="text-sm text-gray-600">
              {cycle.totalParticipants} participants • ₹{cycle.totalAmount?.toLocaleString()}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium ${
          isCompleted
            ? 'bg-green-100 text-green-800'
            : 'bg-purple-100 text-purple-800'
        }`}>
          {PhaseIcon && <PhaseIcon className="h-4 w-4" />}
          {phaseInfo?.title}
        </span>
      </div>

      {userParticipation && (
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-sm text-gray-600 mb-2">Your Order</p>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {userParticipation.items?.length} items
            </div>
            <div className="font-bold text-green-600">
              ₹{userParticipation.totalAmount?.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Add to Cart button for completed orders */}
      {isCompleted && onStartNewOrder && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={onStartNewOrder}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            <span>Order Again</span>
          </button>
        </div>
      )}
    </div>
  );
}

function NoActiveCycle({ onStartShopping }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
      <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Order Cycle</h3>
      <p className="text-gray-600 mb-6">
        There's no active order cycle for this group. Start shopping to create a new one!
      </p>
      <button
        onClick={onStartShopping}
        className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all"
      >
        <ShoppingBagIcon className="h-5 w-5" />
        <span>Start Shopping</span>
      </button>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function GroupDetail() {
  const { groupId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [orderCycle, setOrderCycle] = useState(null);
  const [recentCycles, setRecentCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const previousPhaseRef = useRef(null);
  const timerExpiredRef = useRef(false);
  const currentCycleIdRef = useRef(null);

  // Single useEffect - ONLY real-time listeners, NO initial fetch
  useEffect(() => {
    if (!groupId) return;

    console.log('🔄 Setting up real-time listeners for group:', groupId);

    let cycleUnsubscribe = null;

    // 1. Listen to group document
    const groupUnsubscribe = onSnapshot(
      doc(db, 'groups', groupId),
      (groupDoc) => {
        if (groupDoc.exists()) {
          const groupData = { id: groupDoc.id, ...groupDoc.data() };

          // Check membership
          const isMember = groupData.members?.includes(currentUser?.uid);
          if (!isMember) {
            toast.error('You are not a member of this group');
            navigate('/groups');
            return;
          }

          setGroup(groupData);
          setLoading(false);

          // Clean up previous cycle listener
          if (cycleUnsubscribe) {
            cycleUnsubscribe();
            cycleUnsubscribe = null;
          }

          // 2. Listen to current order cycle if it exists
          if (groupData.currentOrderCycle) {
            cycleUnsubscribe = onSnapshot(
              doc(db, 'orderCycles', groupData.currentOrderCycle),
              (cycleDoc) => {
                if (cycleDoc.exists()) {
                  const newCycleData = { id: cycleDoc.id, ...cycleDoc.data() };

                  // Check if phase is active AND not expired
                  const isActivePhase = ['collecting', 'payment_window'].includes(newCycleData.phase);

                  // Check if time has expired
                  const now = Date.now();
                  let isExpired = false;

                  if (newCycleData.phase === 'collecting' && newCycleData.collectingEndsAt) {
                    const endsAt = newCycleData.collectingEndsAt.toMillis();
                    isExpired = now > endsAt;
                  } else if (newCycleData.phase === 'payment_window' && newCycleData.paymentWindowEndsAt) {
                    const endsAt = newCycleData.paymentWindowEndsAt.toMillis();
                    isExpired = now > endsAt;
                  }

                  // Detect new cycle
                  if (currentCycleIdRef.current !== newCycleData.id) {
                    console.log('🆕 New cycle detected:', newCycleData.id);
                    timerExpiredRef.current = false;
                    currentCycleIdRef.current = newCycleData.id;
                    previousPhaseRef.current = null; // Reset for new cycle
                  }

                  // Detect phase change
                  if (previousPhaseRef.current && previousPhaseRef.current !== newCycleData.phase) {
                    console.log(`🔄 Phase change: ${previousPhaseRef.current} → ${newCycleData.phase}`);
                    handlePhaseChange(previousPhaseRef.current, newCycleData.phase);
                  }

                  previousPhaseRef.current = newCycleData.phase;

                  // Update state based on phase AND expiration
                  if (isActivePhase && !isExpired) {
                    setOrderCycle(newCycleData);
                    console.log(`✅ Active cycle: ${newCycleData.phase}`);
                  } else {
                    setOrderCycle(null);
                    if (isExpired) {
                      console.log(`⏰ Cycle ${newCycleData.id} in ${newCycleData.phase} - expired`);
                    } else {
                      console.log(`❌ Cycle ${newCycleData.id} in ${newCycleData.phase} - not active for users`);
                    }
                  }
                } else {
                  setOrderCycle(null);
                }
              },
              (error) => {
                console.error('❌ Error listening to order cycle:', error);
              }
            );
          } else {
            // No current order cycle
            setOrderCycle(null);
            previousPhaseRef.current = null;
            timerExpiredRef.current = false;
            currentCycleIdRef.current = null;
          }
        } else {
          toast.error('Group not found');
          navigate('/groups');
        }
      },
      (error) => {
        console.error('❌ Error listening to group:', error);
        toast.error('Failed to load group');
      }
    );

    // 3. Listen to recent completed cycles
    const cyclesQuery = query(
      collection(db, 'orderCycles'),
      where('groupId', '==', groupId),
      where('phase', 'in', ['processing', 'completed']),
      orderBy('createdAt', 'desc')
    );

    const cyclesUnsubscribe = onSnapshot(cyclesQuery, (snapshot) => {
      const cycles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentCycles(cycles.slice(0, 5));
    });

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up listeners');
      groupUnsubscribe();
      cyclesUnsubscribe();
      if (cycleUnsubscribe) cycleUnsubscribe();
    };
  }, [groupId, currentUser, navigate]);


  const handlePhaseChange = (oldPhase, newPhase) => {
    console.log(`📌 Phase changed: ${oldPhase} → ${newPhase}`);
    timerExpiredRef.current = false;

    if (oldPhase === 'collecting' && newPhase === 'payment_window') {
      toast.success('Payment window is now open! Complete your payment.', {
        duration: 6000,
        icon: '💳'
      });
    } else if (oldPhase === 'collecting' && newPhase === 'cancelled') {
      toast.error('Order cycle cancelled - minimum quantities not met', {
        duration: 5000
      });
    } else if (oldPhase === 'payment_window' && newPhase === 'confirmed') {
      toast.success('Order confirmed! Your items will be delivered soon.', {
        duration: 5000,
        icon: '✅'
      });
    } else if (oldPhase === 'payment_window' && newPhase === 'cancelled') {
      toast.error('Order cycle cancelled - payment window closed', {
        duration: 5000
      });
    } else if (newPhase === 'processing') {
      toast.success('Order is being processed!', {
        duration: 4000,
        icon: '📦'
      });
    } else if (newPhase === 'completed') {
      toast.success('Order delivered successfully!', {
        duration: 5000,
        icon: '🎉'
      });
    }
  };

  const handleStartShopping = () => {
    localStorage.setItem('selectedGroupId', groupId);
    navigate('/products', { state: { fromGroup: true } });
  };

  const handlePayment = async () => {
    const participation = getUserParticipation();
    if (!participation) {
      toast.error('You have not placed an order in this cycle');
      return;
    }

    if (participation.paymentStatus === 'paid') {
      toast.success('You have already paid for this order');
      return;
    }

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

  const getUserParticipation = () => {
    if (!orderCycle || !currentUser) return null;
    return orderCycle.participants?.find(p => p.userId === currentUser.uid);
  };

  const isUserParticipating = () => {
    return getUserParticipation() !== null;
  };

  const handleTimerExpire = () => {
    if (timerExpiredRef.current) return;

    timerExpiredRef.current = true;
    console.log('⏰ Timer expired - phase will update automatically via real-time listener');

    toast('Time expired. Waiting for phase update...', {
      duration: 3000,
      icon: '⏰'
    });
  };

  const handleShareGroupUpdate = () => {
    if (!orderCycle || !group) return;

    const participation = getUserParticipation();
    const message = createShareMessage(group, orderCycle, participation);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleWhatsAppReminder = () => {
    const userParticipation = getUserParticipation();
    if (!userParticipation) return;

    const message = `💳 Payment Reminder\n\nHi! This is a reminder to complete payment for your group order.\n\nOrder ID: #${orderCycle.id.slice(0, 8)}\nAmount: ₹${userParticipation.totalAmount?.toLocaleString()}\nGroup: ${group.name}\n\nComplete payment soon to confirm your order! 🙏`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) return null;

  const phaseInfo = orderCycle ? getPhaseInfo(orderCycle.phase) : null;
  const userParticipation = getUserParticipation();
  const userIsParticipating = isUserParticipating();

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

        <GroupHeader group={group} />

        {/* Order Cycle Section */}
        {orderCycle ? (
          <div className="space-y-6">
            {/* Countdown Timer - Collecting Phase */}
            {orderCycle.phase === 'collecting' && orderCycle.collectingEndsAt && (
              <CountdownTimer
                key={`collecting-${orderCycle.id}`}
                endTime={orderCycle.collectingEndsAt}
                phase="collecting"
                title="🛒 Order Collection Deadline"
                size="large"
                onExpire={handleTimerExpire}
              />
            )}

            {/* Countdown Timer - Payment Window */}
            {orderCycle.phase === 'payment_window' && orderCycle.paymentWindowEndsAt && (
              <CountdownTimer
                key={`payment-${orderCycle.id}`}
                endTime={orderCycle.paymentWindowEndsAt}
                phase="payment_window"
                title="💳 Payment Deadline"
                size="large"
                onExpire={handleTimerExpire}
              />
            )}

            <PhaseBanner
              phaseInfo={phaseInfo}
              orderCycle={orderCycle}
              onStartShopping={handleStartShopping}
              userIsParticipating={userIsParticipating}
              onShare={handleShareGroupUpdate}
            />

            {!userIsParticipating && orderCycle.phase === 'collecting' && (
              <NewMemberInfo onStartShopping={handleStartShopping} />
            )}

            {userParticipation && (
              <UserOrderSummary
                participation={userParticipation}
                orderPhase={orderCycle.phase}
                onPayment={handlePayment}
                onWhatsAppReminder={handleWhatsAppReminder}
              />
            )}

            <div id="cycle-details" className="space-y-6">
              <ProductProgress productOrders={orderCycle.productOrders} />
              <ParticipantsList
                participants={orderCycle.participants}
                currentUserId={currentUser.uid}
              />
            </div>
          </div>
        ) : (
          <NoActiveCycle onStartShopping={handleStartShopping} />
        )}

        {/* Recent Completed Orders */}
        {recentCycles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Orders</h2>
            <div className="space-y-4">
              {recentCycles.map((cycle) => (
                <RecentOrderCard
                  key={cycle.id}
                  cycle={cycle}
                  currentUserId={currentUser?.uid}
                  onStartNewOrder={handleStartShopping}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
