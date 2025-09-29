// src/pages/GroupDetail.jsx - COMPLETELY FIXED
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService, orderService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  ShoppingBagIcon,
  ArrowLeftIcon,
  MapPinIcon,
  CalendarIcon,
  UsersIcon,
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  TruckIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function GroupDetail() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { currentUser, userProfile } = useAuth();
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
      console.log('📡 Group updated:', groupData);
      setGroup(groupData);
    });

    return () => unsubscribe();
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      console.log('📥 Fetching group:', groupId);
      const groupData = await groupService.getGroupById(groupId);
      
      if (!groupData) {
        toast.error('Group not found');
        navigate('/groups');
        return;
      }
      
      console.log('✅ Group loaded:', groupData);
      setGroup(groupData);
    } catch (error) {
      console.error('❌ Error fetching group:', error);
      toast.error('Failed to load group details');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const orders = await orderService.getActiveGroupOrders(groupId);
      console.log('📦 Active orders:', orders);
      setActiveOrders(orders);
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await groupService.joinGroup(groupId, currentUser.uid);
      toast.success('Successfully joined group!', { icon: '🎉' });
      await fetchGroupDetails();
    } catch (error) {
      console.error('❌ Error joining group:', error);
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
      console.error('❌ Error leaving group:', error);
      toast.error(error.message || 'Failed to leave group');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
        <LoadingSpinner size="large" text="Loading group details..." fullScreen />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <UserGroupIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Group not found</h2>
            <p className="text-gray-600 mb-6">This group may have been deleted or you don't have access.</p>
            <button
              onClick={() => navigate('/groups')}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
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
  const activeOrdersCount = activeOrders.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span className="font-medium">Back to Groups</span>
        </button>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-green-600 to-emerald-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-white rounded-full"></div>
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white rounded-full"></div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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
                      <button
                        onClick={handleLeaveGroup}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 border border-red-200 transition"
                      >
                        Leave Group
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleJoinGroup}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    Join Group
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBox
                icon={UsersIcon}
                label="Members"
                value={memberCount}
                color="blue"
              />
              <StatBox
                icon={ShoppingBagIcon}
                label="Active Orders"
                value={activeOrdersCount}
                color="green"
              />
              <StatBox
                icon={MapPinIcon}
                label="Area"
                value={group.area || 'Local'}
                color="purple"
                isText
              />
              <StatBox
                icon={CalendarIcon}
                label="Created"
                value={group.createdAt ? new Date(group.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                color="orange"
                isText
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-t-2xl shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-8 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: UserGroupIcon },
                { id: 'orders', label: 'Active Orders', icon: ShoppingBagIcon, count: activeOrdersCount }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-600 rounded-full text-xs font-bold">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-8 rounded-b-2xl bg-white">
            {activeTab === 'overview' && (
              <OverviewTab group={group} isCreator={isCreator} />
            )}
            
            {activeTab === 'orders' && (
              <OrdersTab 
                activeOrders={activeOrders} 
                isMember={isMember}
                groupId={groupId}
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
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    purple: 'from-purple-500 to-pink-600',
    orange: 'from-orange-500 to-red-600'
  };

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className={`inline-flex p-2 bg-gradient-to-br ${colorClasses[color]} rounded-lg mb-2`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs text-gray-600 font-medium mb-1">{label}</p>
      <p className={`font-bold text-gray-800 ${isText ? 'text-sm truncate' : 'text-2xl'}`}>
        {value}
      </p>
    </div>
  );
}

// Overview Tab
function OverviewTab({ group, isCreator }) {
  return (
    <div className="space-y-8">
      {/* Group Information */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-6 w-6 text-green-600" />
          Group Information
        </h3>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="grid md:grid-cols-2 gap-6">
            <InfoItem label="Group Name" value={group.name} />
            <InfoItem label="Area" value={group.area || 'Local Area'} />
            <InfoItem label="Category" value={group.category || 'General'} capitalize />
            <InfoItem label="Created By" value={group.creatorName || 'Admin'} />
            <InfoItem 
              label="Created On" 
              value={group.createdAt ? new Date(group.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              }) : 'Recently'}
            />
            <InfoItem label="Max Members" value={group.maxMembers || 'Unlimited'} />
          </div>
          
          {group.description && (
            <div className="mt-6 pt-6 border-t border-green-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
              <p className="text-gray-600 leading-relaxed">{group.description}</p>
            </div>
          )}
        </div>
      </section>

      {/* Members List */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-blue-600" />
          Members ({group.members?.length || 0})
        </h3>
        <div className="bg-white rounded-xl border border-gray-200">
          {group.members && group.members.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {group.members.map((memberId, index) => (
                <div key={memberId} className="p-4 hover:bg-gray-50 transition flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      Member {index + 1}
                      {memberId === group.createdBy && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">
                          Creator
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">User ID: {memberId.slice(0, 8)}...</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No members yet. Be the first to join!
            </div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
          Quick Actions
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <ActionCard
            title="Browse Products"
            description="View available products and start shopping"
            icon={ShoppingBagIcon}
            link="/products"
            color="green"
          />
          <ActionCard
            title="View Orders"
            description="Check your order history and active purchases"
            icon={ClockIcon}
            link="/orders"
            color="blue"
          />
        </div>
      </section>
    </div>
  );
}

// Orders Tab
function OrdersTab({ activeOrders, isMember, groupId, navigate }) {
  if (!isMember) {
    return (
      <div className="text-center py-16">
        <UserGroupIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-800 mb-2">Join to View Orders</h3>
        <p className="text-gray-600 mb-6">You need to be a member to see active orders</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">Active Group Orders</h3>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
        >
          <ShoppingBagIcon className="h-5 w-5" />
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
          <p className="text-gray-600 mb-6">Start shopping to create the first group order!</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition"
          >
            Browse Products
          </button>
        </div>
      )}
    </div>
  );
}

// Helper Components
function InfoItem({ label, value, capitalize = false }) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{label}</p>
      <p className={`text-gray-900 font-medium ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function ActionCard({ title, description, icon: Icon, link, color }) {
  const navigate = useNavigate();
  const colorClasses = {
    green: 'from-green-50 to-emerald-50 border-green-200 hover:shadow-green-200',
    blue: 'from-blue-50 to-cyan-50 border-blue-200 hover:shadow-blue-200'
  };

  return (
    <button
      onClick={() => navigate(link)}
      className={`text-left p-6 bg-gradient-to-br ${colorClasses[color]} rounded-xl border-2 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1`}
    >
      <Icon className="h-8 w-8 text-green-600 mb-3" />
      <h4 className="font-bold text-gray-800 mb-2">{title}</h4>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}

function OrderCard({ order, navigate }) {
  const statusConfig = {
    collecting: { color: 'yellow', label: 'Collecting Orders', icon: ClockIcon },
    active: { color: 'blue', label: 'Active', icon: SparklesIcon },
    confirmed: { color: 'green', label: 'Confirmed', icon: CheckCircleIcon },
    completed: { color: 'green', label: 'Completed', icon: CheckCircleIcon }
  };

  const status = statusConfig[order.status] || statusConfig.collecting;
  const StatusIcon = status.icon;
  
  const totalPaid = order.participants?.filter(p => p.paymentStatus === 'paid').length || 0;
  const totalParticipants = order.participants?.length || 0;
  const paymentProgress = totalParticipants > 0 ? (totalPaid / totalParticipants) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-bold text-lg text-gray-800 mb-1">
            Order #{order.id.slice(-8).toUpperCase()}
          </h4>
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
          <p className="text-xl font-bold text-gray-800">{totalParticipants}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Amount</p>
          <p className="text-xl font-bold text-green-600">₹{order.totalAmount?.toLocaleString() || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Payment</p>
          <p className="text-xl font-bold text-blue-600">{totalPaid}/{totalParticipants}</p>
        </div>
      </div>

      {/* Payment Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Payment Progress</span>
          <span className="font-bold text-gray-800">{Math.round(paymentProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full transition-all duration-500"
            style={{ width: `${paymentProgress}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => navigate(`/orders/${order.id}`)}
        className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center justify-center gap-2"
      >
        View Details
        <ArrowLeftIcon className="h-4 w-4 rotate-180" />
      </button>
    </div>
  );
}