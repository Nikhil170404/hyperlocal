// src/pages/GroupDetail.jsx - FIXED DUPLICATE DISPLAY ISSUE
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService, orderService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserGroupIcon, ShoppingBagIcon, ArrowLeftIcon, MapPinIcon, CalendarIcon,
  UsersIcon, SparklesIcon, CheckCircleIcon, ClockIcon, ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GroupDetail() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!groupId) {
      toast.error('Invalid group ID');
      navigate('/groups');
      return;
    }
    
    fetchGroupDetails();
    fetchActiveOrders();
    
    // Subscribe to real-time updates
    const unsubscribe = groupService.subscribeToGroup(groupId, (groupData) => {
      setGroup(groupData);
    });

    return () => unsubscribe();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const groupData = await groupService.getGroupById(groupId);
      
      if (!groupData) {
        toast.error('Group not found');
        navigate('/groups');
        return;
      }
      
      setGroup(groupData);
    } catch (error) {
      console.error('Error fetching group:', error);
      toast.error('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const orders = await orderService.getActiveGroupOrders(groupId);
      
      // Remove duplicates by creating a Map with orderId as key
      const uniqueOrders = Array.from(
        new Map(orders.map(order => [order.id, order])).values()
      );
      
      setActiveOrders(uniqueOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    
    try {
      await groupService.leaveGroup(groupId, currentUser.uid);
      toast.success('Left group successfully');
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error(error.message || 'Failed to leave group');
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" text="Loading group..." fullScreen />;
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <UserGroupIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Group not found</h2>
            <button onClick={() => navigate('/groups')} className="mt-6 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold">
              Back to Groups
            </button>
          </div>
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
        <button onClick={() => navigate('/groups')} className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition">
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Groups
        </button>

        {/* Header Card */}
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
                  <>
                    <span className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-semibold border border-green-200 flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5" />
                      Member
                    </span>
                    {!isCreator && (
                      <button onClick={handleLeaveGroup} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 border border-red-200">
                        Leave
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={handleJoinGroup} className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg">
                    Join Group
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <StatBox icon={UsersIcon} label="Members" value={memberCount} color="blue" />
              <StatBox icon={ShoppingBagIcon} label="Active Orders" value={activeOrders.length} color="green" />
              <StatBox icon={MapPinIcon} label="Area" value={group.area || 'Local'} color="purple" isText />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-2xl shadow-md">
          <nav className="flex space-x-8 px-8 border-b border-gray-200">
            <button onClick={() => setActiveTab('overview')} className={`py-4 border-b-2 font-medium ${activeTab === 'overview' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>
              Overview
            </button>
            <button onClick={() => setActiveTab('orders')} className={`py-4 border-b-2 font-medium ${activeTab === 'orders' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500'}`}>
              Active Orders ({activeOrders.length})
            </button>
          </nav>

          <div className="p-8 rounded-b-2xl bg-white">
            {activeTab === 'overview' ? (
              <OverviewTab group={group} />
            ) : (
              <OrdersTab 
                activeOrders={activeOrders} 
                isMember={isMember}
                navigate={navigate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Box Component
function StatBox({ icon: Icon, label, value, color, isText = false }) {
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

// Overview Tab
function OverviewTab({ group }) {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Group Information</h3>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="grid md:grid-cols-2 gap-6">
            <InfoItem label="Group Name" value={group.name} />
            <InfoItem label="Area" value={group.area || 'Local'} />
            <InfoItem label="Category" value={group.category || 'General'} capitalize />
            <InfoItem label="Members" value={group.members?.length || 0} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Members ({group.members?.length || 0})</h3>
        <div className="bg-white rounded-xl border border-gray-200">
          {group.members && group.members.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {group.members.map((memberId, index) => (
                <div key={memberId} className="p-4 hover:bg-gray-50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">
                      Member {index + 1}
                      {memberId === group.createdBy && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">
                          Creator
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">No members yet</div>
          )}
        </div>
      </section>
    </div>
  );
}

// Orders Tab
function OrdersTab({ activeOrders, isMember, navigate }) {
  if (!isMember) {
    return (
      <div className="text-center py-16">
        <UserGroupIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Join to View Orders</h3>
        <p className="text-gray-600">You need to be a member to see active orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold">Active Group Orders</h3>
        <button onClick={() => navigate('/products')} className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg">
          Start Shopping
        </button>
      </div>

      {activeOrders.length > 0 ? (
        <div className="space-y-4">
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} navigate={navigate} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <ShoppingBagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Orders</h3>
          <p className="text-gray-600 mb-6">Start shopping to create the first order!</p>
          <button onClick={() => navigate('/products')} className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold">
            Browse Products
          </button>
        </div>
      )}
    </div>
  );
}

// Order Card
function OrderCard({ order, navigate }) {
  const statusConfig = {
    collecting: { color: 'yellow', label: 'Collecting', icon: ClockIcon },
    payment_window: { color: 'orange', label: 'Payment Window', icon: SparklesIcon },
    active: { color: 'blue', label: 'Active', icon: SparklesIcon },
    confirmed: { color: 'green', label: 'Confirmed', icon: CheckCircleIcon },
    processing: { color: 'purple', label: 'Processing', icon: CheckCircleIcon },
    completed: { color: 'green', label: 'Completed', icon: CheckCircleIcon }
  };

  const status = statusConfig[order.status] || statusConfig.collecting;
  const StatusIcon = status.icon;
  
  const totalPaid = order.participants?.filter(p => p.paymentStatus === 'paid').length || 0;
  const totalParticipants = order.participants?.length || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-bold text-lg">Order #{order.id.slice(-8).toUpperCase()}</h4>
          <p className="text-sm text-gray-600">
            Created {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
          </p>
        </div>
        <span className={`px-3 py-1 bg-${status.color}-100 text-${status.color}-700 rounded-full text-sm font-semibold flex items-center gap-1`}>
          <StatusIcon className="h-4 w-4" />
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Participants</p>
          <p className="text-xl font-bold">{totalParticipants}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
          <p className="text-xl font-bold text-green-600">₹{order.totalAmount?.toLocaleString() || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Paid</p>
          <p className="text-xl font-bold text-blue-600">{totalPaid}/{totalParticipants}</p>
        </div>
      </div>

      <button onClick={() => navigate(`/orders/${order.id}`)} className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
        View Details →
      </button>
    </div>
  );
}

// Helper
function InfoItem({ label, value, capitalize = false }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <p className={`text-gray-900 font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}