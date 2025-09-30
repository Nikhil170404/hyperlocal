// src/pages/GroupDetail.jsx - WITH ORDER CYCLE TRACKING
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService, orderService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserGroupIcon, ShoppingBagIcon, ArrowLeftIcon, MapPinIcon,
  UsersIcon, SparklesIcon, CheckCircleIcon, ClockIcon,
  FireIcon, TruckIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GroupDetail() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [activeOrderCycle, setActiveOrderCycle] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!groupId) {
      toast.error('Invalid group ID');
      navigate('/groups');
      return;
    }
    
    fetchGroupDetails();
    fetchActiveOrderCycle();
  }, [groupId]);

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

  const fetchGroupDetails = async () => {
    try {
      const groupData = await groupService.getGroupById(groupId);
      
      if (!groupData) {
        toast.error('Group not found');
        navigate('/groups');
        return;
      }
      
      setGroup(groupData);
      
      // Subscribe to real-time updates
      const unsubscribe = groupService.subscribeToGroup(groupId, (data) => {
        setGroup(data);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrderCycle = async () => {
    try {
      const cycles = await orderService.getActiveOrderCycles(groupId);
      
      if (cycles.length > 0) {
        setActiveOrderCycle(cycles[0]);
        
        // Subscribe to updates
        const unsubscribe = orderService.subscribeToOrderCycle(cycles[0].id, (data) => {
          setActiveOrderCycle(data);
        });
        
        return () => unsubscribe();
      } else {
        setActiveOrderCycle(null);
      }
    } catch (error) {
      console.error('Error fetching cycle:', error);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await groupService.joinGroup(groupId, currentUser.uid);
      toast.success('Successfully joined group!', { icon: '🎉' });
      await fetchGroupDetails();
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" text="Loading group..." fullScreen />;
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Group not found</h2>
          <button onClick={() => navigate('/groups')} className="btn-primary">
            Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const isMember = group.members?.includes(currentUser.uid);
  const isCreator = group.createdBy === currentUser.uid;
  const memberCount = group.members?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/groups')} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Groups
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="h-32 bg-gradient-to-r from-green-600 to-emerald-600 relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-white rounded-full"></div>
            </div>
          </div>

          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">{group.name}</h1>
                <p className="text-gray-600 text-lg">{group.description}</p>
              </div>
              
              <div className="flex items-center gap-3">
                {isMember ? (
                  <span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold border border-green-200 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5" />
                    Member
                  </span>
                ) : (
                  <button 
                    onClick={handleJoinGroup} 
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg"
                  >
                    Join Group
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <QuickStat icon={UsersIcon} label="Members" value={memberCount} color="blue" />
              <QuickStat icon={MapPinIcon} label="Area" value={group.area || 'Local'} color="purple" isText />
              <QuickStat 
                icon={ShoppingBagIcon} 
                label="Active Cycle" 
                value={activeOrderCycle ? 'Yes' : 'No'} 
                color="green" 
                isText 
              />
            </div>
          </div>
        </div>

        {/* Active Order Cycle */}
        {isMember && activeOrderCycle && (
          <ActiveOrderCycleCard 
            cycle={activeOrderCycle}
            timeRemaining={timeRemaining}
            currentUserId={currentUser.uid}
            groupId={groupId}
          />
        )}

        {/* Start Shopping CTA */}
        {isMember && !activeOrderCycle && (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-8 text-center mb-8">
            <SparklesIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Active Order Cycle</h3>
            <p className="text-gray-600 mb-6">Start shopping to begin a new group order!</p>
            <button
              onClick={() => navigate('/products')}
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl transition"
            >
              Start Shopping
            </button>
          </div>
        )}

        {/* Members Section */}
        {isMember && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-2xl font-bold mb-6">Members ({memberCount})</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.members?.map((memberId, index) => (
                <div key={memberId} className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">Member {index + 1}</p>
                    {memberId === group.createdBy && (
                      <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2 py-0.5 font-semibold">
                        Creator
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Stat Component
function QuickStat({ icon: Icon, label, value, color, isText = false }) {
  const colors = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className={`inline-flex p-2 bg-gradient-to-br ${colors[color]} rounded-lg mb-2`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs text-gray-600 font-medium mb-1">{label}</p>
      <p className={`font-bold text-gray-800 ${isText ? 'text-sm truncate' : 'text-2xl'}`}>{value}</p>
    </div>
  );
}

// Active Order Cycle Card
function ActiveOrderCycleCard({ cycle, timeRemaining, currentUserId, groupId }) {
  const navigate = useNavigate();

  const getPhaseInfo = () => {
    if (cycle.phase === 'collecting') {
      return {
        bg: 'from-blue-500 to-cyan-600',
        icon: <ClockIcon className="h-8 w-8" />,
        title: '⏱️ Collecting Orders',
        desc: 'Members are adding items. Timer shows when collecting phase ends.'
      };
    }
    if (cycle.phase === 'payment_window') {
      return {
        bg: 'from-orange-500 to-red-600',
        icon: <FireIcon className="h-8 w-8" />,
        title: '💳 Payment Window Open!',
        desc: 'Complete payment before timer ends or order will be cancelled.'
      };
    }
    if (cycle.phase === 'confirmed') {
      return {
        bg: 'from-green-500 to-emerald-600',
        icon: <CheckCircleIcon className="h-8 w-8" />,
        title: '✅ Order Confirmed',
        desc: 'All payments received. Order is being prepared!'
      };
    }
    if (cycle.phase === 'processing') {
      return {
        bg: 'from-purple-500 to-pink-600',
        icon: <TruckIcon className="h-8 w-8" />,
        title: '📦 Processing',
        desc: 'Your order is being prepared for delivery.'
      };
    }
    return {
      bg: 'from-gray-500 to-gray-600',
      icon: <SparklesIcon className="h-8 w-8" />,
      title: 'Order Cycle',
      desc: 'Group order in progress'
    };
  };

  const info = getPhaseInfo();
  const userParticipant = cycle.participants?.find(p => p.userId === currentUserId);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
      {/* Phase Header */}
      <div className={`bg-gradient-to-r ${info.bg} text-white p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {info.icon}
            <div>
              <h3 className="text-2xl font-bold mb-1">{info.title}</h3>
              <p className="text-white/90">{info.desc}</p>
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
              {userParticipant?.paymentStatus === 'paid' ? '✓ Paid' : 
               userParticipant ? '⏳ Pending' : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Product Orders */}
      {cycle.productOrders && Object.keys(cycle.productOrders).length > 0 && (
        <div className="p-6 border-b">
          <h4 className="font-bold text-lg mb-4">Products in this Cycle</h4>
          <div className="space-y-3">
            {Object.entries(cycle.productOrders).map(([productId, data]) => (
              <ProductOrderRow key={productId} data={data} />
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      {cycle.participants && cycle.participants.length > 0 && (
        <div className="p-6">
          <h4 className="font-bold text-lg mb-4">All Participants ({cycle.participants.length})</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {cycle.participants.map((participant, idx) => (
              <ParticipantCard 
                key={idx} 
                participant={participant}
                isCurrentUser={participant.userId === currentUserId}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-6 bg-gray-50 border-t flex gap-3">
        {cycle.phase === 'collecting' && (
          <button
            onClick={() => navigate('/products')}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-lg transition"
          >
            Continue Shopping
          </button>
        )}
        
        {cycle.phase === 'payment_window' && userParticipant?.paymentStatus !== 'paid' && (
          <button
            onClick={() => navigate('/cart')}
            className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold hover:shadow-lg transition"
          >
            Complete Payment
          </button>
        )}

        <button
          onClick={() => navigate('/cart')}
          className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
        >
          View Cart
        </button>
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

function ProductOrderRow({ data }) {
  const progress = (data.quantity / data.minQuantity) * 100;
  const isMet = data.quantity >= data.minQuantity;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.participants?.length || 0} members ordering
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          isMet ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
        }`}>
          {isMet ? '✓ Min Met' : `Need ${data.minQuantity - data.quantity}`}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-medium">{data.quantity} / {data.minQuantity}</span>
        <span className="text-gray-600">₹{data.price} each</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-full rounded-full ${isMet ? 'bg-green-600' : 'bg-orange-500'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function ParticipantCard({ participant, isCurrentUser }) {
  return (
    <div className={`p-4 rounded-lg border-2 ${
      isCurrentUser ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-semibold">
            {participant.userName}
            {isCurrentUser && <span className="text-blue-600 ml-2">(You)</span>}
          </p>
          <p className="text-sm text-gray-600">
            {participant.items?.length || 0} items • ₹{participant.totalAmount}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          participant.paymentStatus === 'paid' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
        }`}>
          {participant.paymentStatus === 'paid' ? '✓ Paid' : '⏳ Pending'}
        </span>
      </div>
    </div>
  );
}