// src/pages/Groups.jsx - ENHANCED with Mid-Cycle Join, Admin Controls
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/groupService';
import { 
  UserGroupIcon, 
  MapPinIcon,
  UsersIcon,
  ShoppingBagIcon,
  SparklesIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ClockIcon,
  FireIcon,
  CurrencyRupeeIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { SkeletonLoader } from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // all, active, nearby
  const [loading, setLoading] = useState(true);
  const [joiningGroup, setJoiningGroup] = useState(null);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser, filterBy]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      // Fetch all active groups
      let groupsQuery = query(
        collection(db, 'groups'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(groupsQuery);
      const allGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Separate user's groups from available groups
      const joined = allGroups.filter(g => 
        g.members?.includes(currentUser.uid)
      );
      
      const available = allGroups.filter(g => 
        !g.members?.includes(currentUser.uid)
      );

      // Apply filters
      let filteredAvailable = available;
      
      if (filterBy === 'active') {
        filteredAvailable = available.filter(g => g.currentOrderCycle);
      } else if (filterBy === 'nearby') {
        // Filter by user's city/pincode
        filteredAvailable = available.filter(g => 
          g.area?.city?.toLowerCase() === userProfile?.city?.toLowerCase() ||
          g.area?.pincode === userProfile?.pincode
        );
      }

      setMyGroups(joined);
      setGroups(filteredAvailable);
      
      console.log('✅ Groups loaded:', {
        myGroups: joined.length,
        availableGroups: filteredAvailable.length
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId, groupData) => {
    setJoiningGroup(groupId);
    
    try {
      // Check if user is suspended
      const isSuspended = await groupService.checkUserSuspension(currentUser.uid);
      if (isSuspended) {
        toast.error('Your account is temporarily suspended. Please contact support.', {
          duration: 7000,
          icon: '⚠️'
        });
        return;
      }

      // Check if group has active order cycle
      const hasActiveCycle = groupData.currentOrderCycle;
      
      await groupService.joinGroup(groupId, currentUser.uid);
      
      if (hasActiveCycle) {
        toast.success(
          <div>
            <p className="font-bold mb-1">Joined group successfully! 🎉</p>
            <p className="text-sm">This group has an active order cycle. You can join open products.</p>
          </div>,
          { duration: 6000 }
        );
      } else {
        toast.success('Successfully joined group! 🎉', { duration: 4000 });
      }
      
      // Refresh groups
      await fetchGroups();
      
      // Navigate to group
      setTimeout(() => {
        navigate(`/groups/${groupId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
    } finally {
      setJoiningGroup(null);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.area?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.area?.pincode?.includes(searchTerm)
  );

  const filteredMyGroups = myGroups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-10 w-64 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-6 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <SkeletonLoader type="card" count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Community Groups
          </h1>
          <p className="text-gray-600">
            Join local groups to start saving on everyday purchases
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by group name, city, or pincode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterBy('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterBy === 'all'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
                }`}
              >
                All Groups
              </button>
              <button
                onClick={() => setFilterBy('active')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterBy === 'active'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
                }`}
              >
                Active Orders
              </button>
              <button
                onClick={() => setFilterBy('nearby')}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  filterBy === 'nearby'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300'
                }`}
              >
                Nearby
              </button>
            </div>
          </div>
        </div>

        {/* My Groups Section */}
        {filteredMyGroups.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <CheckBadgeIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                My Groups ({filteredMyGroups.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMyGroups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isMember={true}
                  userProfile={userProfile}
                  onNavigate={() => navigate(`/groups/${group.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Available Groups Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Available Groups ({filteredGroups.length})
              </h2>
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md p-12 text-center">
              <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchTerm || filterBy !== 'all' 
                  ? 'No groups found' 
                  : myGroups.length > 0 
                    ? 'All caught up!' 
                    : 'No groups available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterBy !== 'all'
                  ? 'Try adjusting your search or filters' 
                  : myGroups.length > 0 
                    ? "You've joined all available groups in your area"
                    : 'New groups will appear here as they are created'
                }
              </p>
              {(searchTerm || filterBy !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterBy('all');
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  isMember={false}
                  isJoining={joiningGroup === group.id}
                  onJoin={() => handleJoinGroup(group.id, group)}
                  userProfile={userProfile}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced Group Card Component
function GroupCard({ group, isMember, isJoining, onJoin, onNavigate, userProfile }) {
  const stats = group.stats || {};
  const area = group.area || {};
  const memberCount = group.members?.length || stats.totalMembers || 0;
  const maxMembers = group.maxMembers || 100;
  const memberPercentage = Math.round((memberCount / maxMembers) * 100);
  const hasActiveCycle = !!group.currentOrderCycle;
  const isAdmin = group.createdBy === userProfile?.id;
  const isSameArea = 
    area.city?.toLowerCase() === userProfile?.city?.toLowerCase() ||
    area.pincode === userProfile?.pincode;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 group">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full -ml-16 -mb-16"></div>
        </div>
        <UserGroupIcon className="h-16 w-16 text-white relative z-10" />
        
        {/* Badges */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
          {isMember && (
            <div className="flex items-center gap-1 px-3 py-1 bg-white/90 backdrop-blur-sm text-green-600 rounded-full text-xs font-bold shadow-lg">
              <CheckBadgeIcon className="h-4 w-4" />
              <span>Joined</span>
            </div>
          )}
          {isAdmin && (
            <div className="flex items-center gap-1 px-3 py-1 bg-purple-500/90 backdrop-blur-sm text-white rounded-full text-xs font-bold shadow-lg">
              <Cog6ToothIcon className="h-4 w-4" />
              <span>Admin</span>
            </div>
          )}
          {hasActiveCycle && !isMember && (
            <div className="flex items-center gap-1 px-3 py-1 bg-orange-500/90 backdrop-blur-sm text-white rounded-full text-xs font-bold shadow-lg animate-pulse">
              <FireIcon className="h-4 w-4" />
              <span>Active</span>
            </div>
          )}
        </div>

        {/* Same Area Badge */}
        {!isMember && isSameArea && (
          <div className="absolute top-3 left-3 z-10">
            <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/90 backdrop-blur-sm text-white rounded-full text-xs font-bold shadow-lg">
              <MapPinIcon className="h-4 w-4" />
              <span>Your Area</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Group Name */}
        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-green-600 transition-colors">
          {group.name}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 mb-4">
          <MapPinIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span className="text-sm">
            {area.city || 'Mumbai'}, {area.pincode || '400001'}
          </span>
        </div>

        {/* Active Cycle Warning */}
        {hasActiveCycle && !isMember && (
          <div className="mb-4 p-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className="flex items-start gap-2">
              <ClockIcon className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-orange-900">Active Order Cycle</p>
                <p className="text-xs text-orange-700 mt-1">
                  Join now to participate in open products
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <UsersIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Members</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {memberCount}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              of {maxMembers} max
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-purple-700 mb-1">
              <ShoppingBagIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Orders</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {stats.totalOrders || 0}
            </div>
            <div className="text-xs text-purple-600 mt-1">
              completed
            </div>
          </div>
        </div>

        {/* Member Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span className="font-medium">Capacity</span>
            <span className="font-bold">{memberPercentage}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                memberPercentage >= 90 
                  ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                  : memberPercentage >= 70
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600'
              }`}
              style={{ width: `${Math.min(memberPercentage, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Total Savings */}
        {stats.totalSavings > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 text-green-700 mb-1">
              <CurrencyRupeeIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Total Savings</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              ₹{stats.totalSavings?.toLocaleString()}
            </div>
          </div>
        )}

        {/* Action Button */}
        {isMember ? (
          <button
            onClick={onNavigate}
            className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>View Group</span>
          </button>
        ) : (
          <button
            onClick={onJoin}
            disabled={isJoining || memberCount >= maxMembers}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-500/50 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
          >
            {isJoining ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                <span>Joining...</span>
              </>
            ) : memberCount >= maxMembers ? (
              <>
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span>Group Full</span>
              </>
            ) : (
              <>
                <PlusIcon className="h-5 w-5" />
                <span>{hasActiveCycle ? 'Join Mid-Cycle' : 'Join Group'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}