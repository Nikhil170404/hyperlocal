// src/pages/Groups.jsx - FIXED LOADING AND DISPLAY ISSUES
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/groupService';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { 
  PlusIcon, 
  UserGroupIcon, 
  MapPinIcon, 
  CalendarIcon, 
  UsersIcon, 
  SparklesIcon,
  ShoppingBagIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Refs to prevent duplicate operations
  const locationFetchedRef = useRef(false);
  const toastShownRef = useRef(false);
  const groupsFetchedRef = useRef(false);

  // Get user location on mount
  useEffect(() => {
    if (!locationFetchedRef.current) {
      locationFetchedRef.current = true;
      getUserLocation();
    }
  }, []);

  // Fetch groups when location is available
  useEffect(() => {
    if (userLocation && !groupsFetchedRef.current) {
      groupsFetchedRef.current = true;
      fetchGroups();
    }
  }, [userLocation]);

  const getUserLocation = () => {
    setLocationLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          setLocationLoading(false);
          
          // Show success toast only once
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            toast.success('Location detected!', { 
              icon: '📍',
              duration: 2000,
              id: 'location-detected'
            });
          }
        },
        (error) => {
          console.error('Location error:', error);
          const defaultLocation = { latitude: 19.0760, longitude: 72.8777 }; // Mumbai
          setUserLocation(defaultLocation);
          setLocationLoading(false);
          
          if (!toastShownRef.current) {
            toastShownRef.current = true;
            toast('Using default location: Mumbai', { 
              icon: '📍',
              duration: 2000,
              id: 'location-default'
            });
          }
        },
        {
          timeout: 10000,
          maximumAge: 60000,
          enableHighAccuracy: false
        }
      );
    } else {
      const defaultLocation = { latitude: 19.0760, longitude: 72.8777 };
      setUserLocation(defaultLocation);
      setLocationLoading(false);
      
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast('Geolocation not supported', { 
          icon: '📍',
          duration: 2000,
          id: 'location-unsupported'
        });
      }
    }
  };

  const fetchGroups = async () => {
    if (!userLocation) {
      console.log('No location available');
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching groups for location:', userLocation);
      
      const groupsData = await groupService.getGroupsByLocation(
        userLocation.latitude,
        userLocation.longitude,
        50 // 50km radius
      );
      
      console.log('Groups fetched:', groupsData.length);
      
      // Remove duplicates
      const uniqueGroups = Array.from(
        new Map(groupsData.map(group => [group.id, group])).values()
      );
      
      setGroups(uniqueGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
      setGroups([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await groupService.joinGroup(groupId, currentUser.uid);
      toast.success('Successfully joined group!', { icon: '🎉' });
      
      // Refresh groups
      groupsFetchedRef.current = false;
      await fetchGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(error.message || 'Failed to join group');
    }
  };

  const handleViewDetails = (groupId) => {
    navigate(`/groups/${groupId}`);
  };

  const handleCreateSuccess = async () => {
    setShowCreateForm(false);
    
    // Reset and refresh groups
    groupsFetchedRef.current = false;
    await fetchGroups();
    
    toast.success('Group created! Refreshing list...', { duration: 2000 });
  };

  // Show location loading screen
  if (locationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner size="large" text="Getting your location..." fullScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Local Groups</h1>
            <p className="text-gray-600 flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-green-600" />
              {groups.length} {groups.length === 1 ? 'group' : 'groups'} in your area
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Stats Cards */}
        {groups.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              icon={UserGroupIcon}
              label="Total Groups"
              value={groups.length}
              color="green"
            />
            <StatsCard
              icon={UsersIcon}
              label="Total Members"
              value={groups.reduce((sum, g) => sum + (g.members?.length || 0), 0)}
              color="blue"
            />
            <StatsCard
              icon={SparklesIcon}
              label="Active Orders"
              value={groups.reduce((sum, g) => sum + (g.currentOrders?.length || 0), 0)}
              color="purple"
            />
          </div>
        )}

        {/* Groups Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonLoader type="card" count={6} />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateForm(true)} />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <GroupCard 
                key={group.id} 
                group={group} 
                onJoin={handleJoinGroup}
                onViewDetails={handleViewDetails}
                currentUserId={currentUser.uid}
              />
            ))}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateForm && (
          <CreateGroupModal 
            onClose={() => setShowCreateForm(false)}
            onSuccess={handleCreateSuccess}
            userLocation={userLocation}
          />
        )}
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
      <div className={`inline-flex p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl mb-3`}>
        <Icon className="h-8 w-8 text-white" />
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

// Group Card Component
function GroupCard({ group, onJoin, onViewDetails, currentUserId }) {
  const [isJoining, setIsJoining] = useState(false);
  const isMember = group.members?.includes(currentUserId);
  const memberCount = group.members?.length || 0;
  const activeOrders = group.currentOrders?.length || 0;

  const handleJoinClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsJoining(true);
    try {
      await onJoin(group.id);
    } finally {
      setIsJoining(false);
    }
  };

  const handleViewClick = (e) => {
    e.preventDefault();
    onViewDetails(group.id);
  };

  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
      {/* Header */}
      <div className="h-32 bg-gradient-to-br from-green-500 to-emerald-600 p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white rounded-full"></div>
        </div>
        <div className="relative">
          <h3 className="text-2xl font-bold text-white mb-2 truncate">{group.name}</h3>
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <span className="flex items-center gap-1">
              <UsersIcon className="h-4 w-4" />
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
            {activeOrders > 0 && (
              <span className="flex items-center gap-1">
                <ShoppingBagIcon className="h-4 w-4" />
                {activeOrders} active
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <p className="text-gray-600 mb-4 line-clamp-2 min-h-[3rem]">
          {group.description || 'Join this group to start saving on bulk purchases!'}
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
            <span className="truncate">{group.area || 'Local Area'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
            <span>
              Created {group.createdAt ? new Date(group.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
            </span>
          </div>
          {group.category && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              <span>{getCategoryIcon(group.category)}</span>
              <span className="capitalize">{group.category}</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleViewClick}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <span>View Details</span>
            <ArrowRightIcon className="h-4 w-4" />
          </button>
          
          {!isMember ? (
            <button
              onClick={handleJoinClick}
              disabled={isJoining}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Joining...</span>
                </>
              ) : (
                'Join Group'
              )}
            </button>
          ) : (
            <div className="flex-1 px-4 py-3 bg-green-50 text-green-700 rounded-lg font-semibold flex items-center justify-center gap-2 border border-green-200">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Joined
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ onCreateClick }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-md">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-6">
        <UserGroupIcon className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">No groups found nearby</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto px-4">
        Be the first to create a group in your area and start saving together!
      </p>
      <button
        onClick={onCreateClick}
        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
      >
        <PlusIcon className="h-5 w-5" />
        Create First Group
      </button>
    </div>
  );
}

// Create Group Modal Component
function CreateGroupModal({ onClose, onSuccess, userLocation }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    area: '',
    category: 'groceries'
  });
  const [loading, setLoading] = useState(false);
  const { currentUser, userProfile } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    
    if (!formData.area.trim()) {
      toast.error('Please enter an area');
      return;
    }

    setLoading(true);

    try {
      const groupId = await groupService.createGroup({
        ...formData,
        createdBy: currentUser.uid,
        creatorName: userProfile?.name || 'User',
        location: userLocation,
        maxMembers: 50
      });
      
      console.log('✅ Group created successfully:', groupId);
      toast.success('Group created successfully!', { icon: '🎉', duration: 3000 });
      
      // Call success callback
      onSuccess();
    } catch (error) {
      console.error('❌ Error creating group:', error);
      toast.error('Failed to create group: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800">Create New Group</h2>
          <p className="text-gray-600 text-sm mt-1">Start saving together with your neighbors</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              placeholder="e.g., Andheri West Grocery Group"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition resize-none"
              placeholder="Describe your group and what you plan to buy together..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Area/Neighborhood *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              placeholder="e.g., Andheri West, Mumbai"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category *
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white transition cursor-pointer"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="groceries">🌾 Groceries</option>
              <option value="household">🧽 Household Items</option>
              <option value="personal-care">🧴 Personal Care</option>
              <option value="general">📦 General</option>
            </select>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper function
function getCategoryIcon(category) {
  const icons = {
    groceries: '🌾',
    household: '🧽',
    'personal-care': '🧴',
    general: '📦'
  };
  return icons[category] || '📦';
}