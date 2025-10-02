// src/pages/Profile.jsx - Enhanced User Profile
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Profile() {
  const { userProfile, updateUserProfile, currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    city: userProfile?.city || '',
    pincode: userProfile?.pincode || ''
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      await updateUserProfile(currentUser.uid, formData);
      toast.success('Profile updated successfully! 🎉');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: userProfile?.name || '',
      phone: userProfile?.phone || '',
      address: userProfile?.address || '',
      city: userProfile?.city || '',
      pincode: userProfile?.pincode || ''
    });
    setIsEditing(false);
  };

  const stats = [
    {
      label: 'Groups Joined',
      value: userProfile?.joinedGroups?.length || 0,
      icon: UserGroupIcon,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      label: 'Total Savings',
      value: `₹${(userProfile?.savings || 0).toLocaleString()}`,
      icon: CurrencyRupeeIcon,
      color: 'from-green-500 to-emerald-600'
    },
    {
      label: 'Orders Placed',
      value: userProfile?.orderHistory?.length || 0,
      icon: ShoppingBagIcon,
      color: 'from-purple-500 to-pink-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your account information and preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          {/* Header Section */}
          <div className="relative h-32 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mb-32"></div>
            </div>
          </div>

          {/* Avatar */}
          <div className="relative px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-white text-4xl font-bold shadow-2xl ring-4 ring-white">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {userProfile?.name || 'User'}
                </h2>
                <p className="text-gray-600 mb-2">{userProfile?.email}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  <CheckIcon className="h-4 w-4" />
                  <span>Active Member</span>
                </div>
              </div>

              {/* Edit Button */}
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-green-500/50 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
                >
                  <PencilIcon className="h-5 w-5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600 font-medium">{stat.label}</span>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Profile Information</h3>
            
            {isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center gap-2"
                >
                  <XMarkIcon className="h-5 w-5" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-5 w-5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{userProfile?.name}</span>
                </div>
              )}
            </div>

            {/* Email (Read Only) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-900">{userProfile?.email}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{userProfile?.phone}</span>
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Address
              </label>
              {isEditing ? (
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows="2"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <span className="text-gray-900">{userProfile?.address}</span>
                </div>
              )}
            </div>

            {/* City & Pincode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  City
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-900">{userProfile?.city}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Pincode
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    maxLength="6"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-900">{userProfile?.pincode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="mt-8 bg-blue-50 rounded-2xl p-6 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Account Information</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Member Since:</strong> {new Date(userProfile?.createdAt?.toDate?.() || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
            <p><strong>Account Status:</strong> <span className="font-semibold text-green-600">Active</span></p>
            <p><strong>Role:</strong> <span className="capitalize">{userProfile?.role || 'Member'}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}