// src/pages/Groups.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, UserGroupIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location or show error
          setUserLocation({ latitude: 19.0760, longitude: 72.8777 }); // Mumbai default
        }
      );
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
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await groupService.joinGroup(groupId, currentUser.uid);
      fetchGroups(); // Refresh groups
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Local Groups</h1>
          <p className="text-gray-600 mt-2">Find and join buying groups in your area</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Group</span>
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No groups found nearby</h3>
          <p className="text-gray-500 mb-6">Be the first to create a group in your area!</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
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
  const isMember = group.members?.includes(currentUserId);
  const memberCount = group.members?.length || 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{group.name}</h3>
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
          {memberCount} members
        </span>
      </div>
      
      <p className="text-gray-600 mb-4">{group.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-500">
          <MapPinIcon className="h-4 w-4 mr-2" />
          <span>{group.area || 'Local Area'}</span>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <CalendarIcon className="h-4 w-4 mr-2" />
          <span>Created {new Date(group.createdAt?.seconds * 1000).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Link
          to={`/groups/${group.id}`}
          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-center hover:bg-gray-200 transition"
        >
          View Details
        </Link>
        {!isMember && (
          <button
            onClick={() => onJoin(group.id)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Join Group
          </button>
        )}
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
      onSuccess();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold mb-4">Create New Group</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area/Neighborhood
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.area}
              onChange={(e) => setFormData({...formData, area: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="groceries">Groceries</option>
              <option value="household">Household Items</option>
              <option value="personal-care">Personal Care</option>
              <option value="general">General</option>
            </select>
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="small" /> : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}