// src/pages/Groups.jsx - Enhanced Version
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/groupService';
import LoadingSpinner, { SkeletonLoader } from '../components/LoadingSpinner';
import { PlusIcon, UserGroupIcon, MapPinIcon, CalendarIcon, UsersIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchGroups();
    }
  }, [userLocation]);

  const getUserLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationLoading(false);
          toast.success('Location detected!');
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location (Mumbai)
          setUserLocation({ latitude: 19.0760, longitude: 72.8777 });
          setLocationLoading(false);
          toast('Using default location: Mumbai', { icon: '📍' });
        }
      );
    } else {
      setUserLocation({ latitude: 19.0760, longitude: 72.8777 });
      setLocationLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const groupsData = await groupService.getGroupsByLocation(
        userLocation.latitude,
        userLocation.longitude
      );
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await groupService.joinGroup(groupId, currentUser.uid);
      toast.success('Successfully joined group!', { icon: '🎉' });
      fetchGroups();
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group');
    }
  };

  if (locationLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="large" text="Getting your location..." fullScreen />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Local Groups</h1>
          <p className="text-gray-600 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-green-600" />
            Find and join buying groups in your area
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
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-600 rounded-xl">
              <UserGroupIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Groups</p>
              <p className="text-3xl font-bold text-gray-800">{groups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl">
              <UsersIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Members</p>
              <p className="text-3xl font-bold text-gray-800">
                {groups.reduce((sum, g) => sum + (g.members?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-600 rounded-xl">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Active Orders</p>
              <p className="text-3xl font-bold text-gray-800">
                {groups.reduce((sum, g) => sum + (g.currentOrders?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonLoader type="card" count={6} />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-6">
            <UserGroupIcon className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">No groups found nearby</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Be the first to create a group in your area and start saving together!
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <PlusIcon className="h-5 w-5" />
            Create First Group
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard 
              key={group.id} 
              group={group} 
              onJoin={handleJoinGroup}
              currentUserId={currentUser.uid}
            />
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateForm && (
        <CreateGroupModal 
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchGroups();
          }}
          userLocation={userLocation}
        />
      )}
    </div>
  );
}

function GroupCard({ group, onJoin, currentUserId }) {
  const [isJoining, setIsJoining] = useState(false);
  const isMember = group.members?.includes(currentUserId);
  const memberCount = group.members?.length || 0;
  const activeOrders = group.currentOrders?.length || 0;

  const handleJoin = async () => {
    setIsJoining(true);
    await onJoin(group.id);
    setIsJoining(false);
  };

  return (
    <div className="group bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
      {/* Header with gradient */}
      <div className="h-32 bg-gradient-to-br from-green-500 to-emerald-600 p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white rounded-full"></div>
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white rounded-full"></div>
        </div>
        <div className="relative">
          <h3 className="text-2xl font-bold text-white mb-2">{group.name}</h3>
          <div className="flex items-center gap-4 text-white/90 text-sm">
            <span className="flex items-center gap-1">
              <UsersIcon className="h-4 w-4" />
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
            {activeOrders > 0 && (
              <span className="flex items-center gap-1">
                <SparklesIcon className="h-4 w-4" />
                {activeOrders} active
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
            <span className="truncate">{group.area || 'Local Area'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
            <span>Created {new Date(group.createdAt?.seconds * 1000).toLocaleDateString()}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <Link
            to={`/groups/${group.id}`}
            className="flex-1 text-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            View Details
          </Link>
          {!isMember && (
            <button
              onClick={handleJoin}
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
          )}
          {isMember && (
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
    setLoading(true);

    try {
      await groupService.createGroup({
        ...formData,
        createdBy: currentUser.uid,
        creatorName: userProfile.name,
        location: userLocation,
        maxMembers: 50
      });
      toast.success('Group created successfully!', { icon: '🎉' });
      onSuccess();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
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
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition cursor-pointer"
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
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
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