// src/pages/Profile.jsx - ENHANCED WITH REWARDS & STATS
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserIcon, 
  TrophyIcon, 
  CurrencyRupeeIcon,
  SparklesIcon,
  GiftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function Profile() {
  const { userProfile, updateUserProfile, currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    city: userProfile?.city || '',
    pincode: userProfile?.pincode || ''
  });

  useEffect(() => {
    fetchUserStats();
  }, [currentUser]);

  const fetchUserStats = async () => {
    if (!currentUser) return;

    try {
      const orders = await orderService.getUserOrders(currentUser.uid);
      
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.paymentStatus === 'paid').length;
      const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalSavings = orders.reduce((sum, o) => {
        const items = o.items || [];
        return sum + items.reduce((itemSum, item) => {
          return itemSum + ((item.retailPrice - item.groupPrice) * item.quantity);
        }, 0);
      }, 0);
      
      // Calculate consecutive orders
      const sortedOrders = orders
        .filter(o => o.paymentStatus === 'paid')
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      let consecutiveOrders = 0;
      for (let i = 0; i < sortedOrders.length; i++) {
        if (sortedOrders[i].paymentStatus === 'paid') {
          consecutiveOrders++;
        } else {
          break;
        }
      }

      // Penalty tracking
      const penalties = orders.filter(o => o.penalties).length;
      const warnings = userProfile?.warnings || 0;
      const suspensionDays = userProfile?.suspensionDays || 0;

      // Rewards
      const referralCredits = userProfile?.referralCredits || 0;
      const isVIP = consecutiveOrders >= 5;
      const earlyBirdCount = orders.filter(o => o.isEarlyBird).length;

      setStats({
        totalOrders,
        completedOrders,
        totalSpent,
        totalSavings,
        consecutiveOrders,
        penalties,
        warnings,
        suspensionDays,
        referralCredits,
        isVIP,
        earlyBirdCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateUserProfile(currentUser.uid, formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">Manage your account and track your rewards</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Orders"
              value={stats.totalOrders}
              icon={ClockIcon}
              color="blue"
            />
            <StatsCard
              title="Total Savings"
              value={`₹${stats.totalSavings.toLocaleString()}`}
              icon={CurrencyRupeeIcon}
              color="green"
            />
            <StatsCard
              title="Referral Credits"
              value={`₹${stats.referralCredits}`}
              icon={GiftIcon}
              color="purple"
            />
            <StatsCard
              title="Consecutive Orders"
              value={stats.consecutiveOrders}
              icon={TrophyIcon}
              color="orange"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Profile Information</h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={userProfile?.email || ''}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <textarea
                      name="address"
                      required
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        required
                        value={formData.pincode}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: userProfile?.name || '',
                          phone: userProfile?.phone || '',
                          address: userProfile?.address || '',
                          city: userProfile?.city || '',
                          pincode: userProfile?.pincode || ''
                        });
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-semibold"
                    >
                      {loading ? <LoadingSpinner size="small" /> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <ProfileField label="Full Name" value={userProfile?.name} />
                  <ProfileField label="Email" value={userProfile?.email} />
                  <ProfileField label="Phone" value={userProfile?.phone} />
                  <ProfileField label="Address" value={userProfile?.address} />
                  <div className="grid grid-cols-2 gap-4">
                    <ProfileField label="City" value={userProfile?.city} />
                    <ProfileField label="Pincode" value={userProfile?.pincode} />
                  </div>
                  <ProfileField 
                    label="Member Since" 
                    value={userProfile?.createdAt && new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString()}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rewards & Status */}
          <div className="space-y-6">
            {/* VIP Status */}
            {stats && stats.isVIP && (
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <TrophyIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium opacity-90">Status</p>
                    <p className="text-2xl font-bold">VIP Member</p>
                  </div>
                </div>
                <p className="text-sm opacity-90">
                  🎉 You've completed {stats.consecutiveOrders} consecutive orders! Enjoy priority delivery & extra discounts.
                </p>
              </div>
            )}

            {/* Rewards Summary */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6 text-yellow-500" />
                Rewards & Achievements
              </h3>
              
              {stats && (
                <div className="space-y-4">
                  <RewardItem
                    icon={CheckCircleIcon}
                    label="Completed Orders"
                    value={stats.completedOrders}
                    color="green"
                  />
                  <RewardItem
                    icon={GiftIcon}
                    label="Referral Credits"
                    value={`₹${stats.referralCredits}`}
                    color="purple"
                  />
                  <RewardItem
                    icon={SparklesIcon}
                    label="Early Bird Orders"
                    value={stats.earlyBirdCount}
                    color="yellow"
                  />
                  <RewardItem
                    icon={TrophyIcon}
                    label="Progress to VIP"
                    value={`${stats.consecutiveOrders}/5`}
                    color="orange"
                  />
                </div>
              )}

              {/* Progress Bar to VIP */}
              {stats && !stats.isVIP && (
                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-2">
                    Complete {5 - stats.consecutiveOrders} more orders to become VIP!
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(stats.consecutiveOrders / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Penalties & Warnings */}
            {stats && (stats.warnings > 0 || stats.penalties > 0) && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-800">
                  <ExclamationTriangleIcon className="h-6 w-6" />
                  Account Alerts
                </h3>
                
                <div className="space-y-3">
                  {stats.warnings > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-700">Warnings:</span>
                      <span className="font-bold text-red-900">{stats.warnings}</span>
                    </div>
                  )}
                  {stats.penalties > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-700">Penalties:</span>
                      <span className="font-bold text-red-900">{stats.penalties}</span>
                    </div>
                  )}
                  {stats.suspensionDays > 0 && (
                    <div className="p-3 bg-red-100 rounded-lg">
                      <p className="text-sm text-red-900 font-semibold">
                        ⚠️ Account suspended for {stats.suspensionDays} days
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Referral Program */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-3 text-green-900">
                Refer & Earn
              </h3>
              <p className="text-sm text-green-700 mb-4">
                Invite friends and earn ₹100 credits for each successful referral!
              </p>
              <button className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg transition">
                Share Referral Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    orange: 'from-orange-500 to-red-600',
    purple: 'from-purple-500 to-pink-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition">
      <div className={`inline-flex p-3 bg-gradient-to-br ${colorClasses[color]} rounded-xl mb-3`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <p className="text-sm text-gray-600 font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <p className="text-gray-900 font-medium">{value || 'Not provided'}</p>
    </div>
  );
}

function RewardItem({ icon: Icon, label, value, color }) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    orange: 'text-orange-600 bg-orange-50'
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-lg font-bold text-gray-900">{value}</span>
    </div>
  );
}