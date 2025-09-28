// src/pages/GroupDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/groupService';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  ShoppingBagIcon,
  ArrowLeftIcon 
} from '@heroicons/react/24/outline';

export default function GroupDetail() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    fetchGroupDetails();
    
    // Subscribe to real-time updates
    const unsubscribe = groupService.subscribeToGroup(groupId, (groupData) => {
      setGroup(groupData);
    });

    // Subscribe to group chat
    const unsubscribeChat = groupService.subscribeToGroupChat(groupId, (messagesData) => {
      setMessages(messagesData);
    });

    return () => {
      unsubscribe();
      unsubscribeChat();
    };
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      const groupData = await groupService.getGroupById(groupId);
      setGroup(groupData);
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await groupService.sendMessage(
        groupId,
        newMessage,
        currentUser.uid,
        userProfile.name
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await groupService.joinGroup(groupId, currentUser.uid);
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await groupService.leaveGroup(groupId, currentUser.uid);
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Group not found</h2>
        <Link to="/groups" className="text-green-600 hover:text-green-700 mt-4 inline-block">
          Back to Groups
        </Link>
      </div>
    );
  }

  const isMember = group.members?.includes(currentUser.uid);
  const memberCount = group.members?.length || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Link 
          to="/groups" 
          className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800">{group.name}</h1>
          <p className="text-gray-600 mt-1">{group.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
            {memberCount} members
          </span>
          {isMember ? (
            <button
              onClick={handleLeaveGroup}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Leave Group
            </button>
          ) : (
            <button
              onClick={handleJoinGroup}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Join Group
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['overview', 'chat', 'orders'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Group Information</h3>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <label className="font-medium text-gray-700">Area:</label>
                <p className="text-gray-600">{group.area}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">Category:</label>
                <p className="text-gray-600 capitalize">{group.category}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">Created by:</label>
                <p className="text-gray-600">{group.creatorName}</p>
              </div>
              <div>
                <label className="font-medium text-gray-700">Created on:</label>
                <p className="text-gray-600">
                  {new Date(group.createdAt?.seconds * 1000).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Active Orders</h3>
            <div className="bg-white rounded-lg shadow p-6">
              {group.currentOrders?.length > 0 ? (
                <div className="space-y-4">
                  {group.currentOrders.map((orderId) => (
                    <div key={orderId} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-medium">Order #{orderId}</p>
                      <p className="text-sm text-gray-600">Status: Collecting orders</p>
                      <Link 
                        to={`/orders/${orderId}`}
                        className="text-green-600 hover:text-green-700 text-sm"
                      >
                        View Details →
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No active orders</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chat' && isMember && (
        <div className="bg-white rounded-lg shadow">
          <div className="h-96 overflow-y-auto p-4 border-b">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className="bg-gray-300 w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {message.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{message.userName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-700">{message.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No messages yet</p>
            )}
          </div>
          <div className="p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
              <button
                onClick={handleSendMessage}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">Group Orders</h3>
            {isMember && (
              <Link
                to="/products"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                <span>Start New Order</span>
              </Link>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500 text-center py-8">
              {isMember ? 'No orders yet. Start the first order!' : 'Join the group to see orders'}
            </p>
          </div>
        </div>
      )}

      {!isMember && activeTab === 'chat' && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Join the group to participate in discussions</p>
          <button
            onClick={handleJoinGroup}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Join Group
          </button>
        </div>
      )}
    </div>
  );
}