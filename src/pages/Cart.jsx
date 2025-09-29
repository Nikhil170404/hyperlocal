// src/pages/Cart.jsx - Fixed & Mobile Responsive
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { groupService, orderService } from '../services/groupService';
import { TrashIcon, MinusIcon, PlusIcon, UserGroupIcon, CreditCardIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Cart() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const { currentUser, userProfile } = useAuth();
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, getRetailTotal, getTotalSavings, clearCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
      setLoadingGroups(true);
      const groups = await groupService.getUserGroups(currentUser.uid);
      setUserGroups(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedGroup) {
      toast.error('Please select a group to continue');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        userId: currentUser.uid,
        userName: userProfile.name,
        items: cartItems,
        totalAmount: getTotal(),
        userEmail: userProfile.email,
        userPhone: userProfile.phone,
        paymentStatus: 'pending'
      };

      const orderId = await orderService.createIndividualOrder(
        selectedGroup.id,
        orderData
      );

      clearCart();
      toast.success('Order placed successfully!', { icon: '🎉' });
      navigate(`/orders/${orderId}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTotal = () => {
    const deliveryFee = 30;
    return getCartTotal() + deliveryFee;
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 sm:py-16 bg-white rounded-2xl shadow-md">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-6">
              <ShoppingBagIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 px-4">Your cart is empty</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">Start shopping with your group to get amazing deals!</p>
            <button
              onClick={() => navigate('/products')}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 text-sm sm:text-base"
            >
              Browse Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4 sm:mb-8">Shopping Cart</h1>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Group Selection */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                <span className="text-sm sm:text-base">Select Your Group</span>
              </h3>
              
              {loadingGroups ? (
                <LoadingSpinner size="small" />
              ) : userGroups.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {userGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`w-full p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 text-left transition-all duration-200 ${
                        selectedGroup?.id === group.id
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">{group.name}</p>
                          <p className="text-xs sm:text-sm text-gray-600">{group.members?.length || 0} members</p>
                        </div>
                        {selectedGroup?.id === group.id && (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 ml-2">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm sm:text-base text-gray-600 mb-4">You're not in any groups yet</p>
                  <button
                    onClick={() => navigate('/groups')}
                    className="text-green-600 font-semibold hover:text-green-700 text-sm sm:text-base"
                  >
                    Join a Group →
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 sticky top-20">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Order Summary</h3>
              
              <div className="space-y-2 sm:space-y-3 mb-4">
                <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                  <span>Subtotal ({cartItems.length} items):</span>
                  <span className="font-medium">₹{getCartTotal()}</span>
                </div>
                <div className="flex justify-between text-green-600 font-semibold text-sm sm:text-base">
                  <span>You Save:</span>
                  <span>₹{getTotalSavings()}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                  <span>Delivery Fee:</span>
                  <span className="font-medium">₹30</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-base sm:text-lg">
                    <span>Your Total:</span>
                    <span className="text-green-600">₹{getTotal()}</span>
                  </div>
                </div>
              </div>

              {/* Savings Badge */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 mb-4 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl sm:text-2xl">🎉</span>
                  <span className="font-semibold text-green-800 text-sm sm:text-base">You're Saving</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">₹{getTotalSavings()}</p>
                <p className="text-xs sm:text-sm text-green-700 mt-1">vs retail prices</p>
              </div>
              
              <button
                onClick={handleCheckout}
                disabled={loading || !selectedGroup}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span className="text-sm sm:text-base">Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCardIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-sm sm:text-base">Proceed to Payment</span>
                  </>
                )}
              </button>

              {!selectedGroup && (
                <p className="text-center text-xs sm:text-sm text-red-600 mt-3">
                  Please select a group to continue
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItem({ item, onUpdateQuantity, onRemove }) {
  const savings = (item.retailPrice - item.groupPrice) * item.quantity;
  const discount = Math.round(((item.retailPrice - item.groupPrice) / item.retailPrice) * 100);

  return (
    <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-shadow">
      <div className="flex gap-3 sm:gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="text-gray-400 text-xs text-center">No Image</div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2 gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-800 text-sm sm:text-base lg:text-lg truncate">{item.name}</h3>
              {discount > 0 && (
                <span className="inline-block px-2 py-0.5 sm:py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full mt-1">
                  {discount}% OFF
                </span>
              )}
            </div>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors flex-shrink-0"
            >
              <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-500 line-through">₹{item.retailPrice}</span>
              <span className="text-base sm:text-lg lg:text-xl font-bold text-green-600">₹{item.groupPrice}</span>
              <span className="text-xs sm:text-sm text-green-700 font-medium hidden sm:inline">Save ₹{item.retailPrice - item.groupPrice}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 rounded-lg p-1 w-fit">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="p-1.5 sm:p-2 hover:bg-white rounded-md transition-colors"
                >
                  <MinusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
                <span className="w-8 sm:w-10 text-center font-semibold text-sm sm:text-base">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="p-1.5 sm:p-2 hover:bg-white rounded-md transition-colors"
                >
                  <PlusIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </button>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm text-gray-500">Item Total</p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-800">₹{item.groupPrice * item.quantity}</p>
                <p className="text-xs text-green-600 font-medium">Saving ₹{savings}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}