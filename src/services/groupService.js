// src/services/groupService.js - Complete Service File - UPDATED WITH FIXES
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ref, onValue, push } from 'firebase/database';
import { db, rtdb } from '../config/firebase';

// ============================================
// GROUP SERVICE
// ============================================
export const groupService = {
  // Create new group
  async createGroup(groupData) {
    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        members: [groupData.createdBy],
        isActive: true,
        currentOrders: [],
        totalOrders: 0,
        totalSavings: 0
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  // Get groups by location
  async getGroupsByLocation(latitude, longitude, radius = 5) {
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(
        groupsRef,
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(group => {
        if (!group.location) return true;
        const distance = calculateDistance(
          latitude, longitude,
          group.location.latitude, group.location.longitude
        );
        return distance <= radius;
      });
    } catch (error) {
      console.error('Error fetching groups:', error);
      throw error;
    }
  },

  // Get user's groups
  async getUserGroups(userId) {
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(
        groupsRef,
        where('members', 'array-contains', userId),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  },

  // Join group
  async joinGroup(groupId, userId) {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();
      
      if (groupData.members?.includes(userId)) {
        throw new Error('Already a member of this group');
      }

      if (groupData.maxMembers && groupData.members?.length >= groupData.maxMembers) {
        throw new Error('Group is full');
      }

      await updateDoc(groupRef, {
        members: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  },

  // Leave group
  async leaveGroup(groupId, userId) {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupDoc.data();
      
      if (groupData.createdBy === userId) {
        throw new Error('Group creator cannot leave the group');
      }

      await updateDoc(groupRef, {
        members: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      throw error;
    }
  },

  // Get group details
  async getGroupById(groupId) {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const snapshot = await getDoc(groupRef);
      
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  },

  // Real-time group updates
  subscribeToGroup(groupId, callback) {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  },

  // Group chat functionality
  async sendMessage(groupId, message, userId, userName) {
    try {
      const messagesRef = ref(rtdb, `groupChats/${groupId}/messages`);
      await push(messagesRef, {
        message,
        userId,
        userName,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Subscribe to group chat
  subscribeToGroupChat(groupId, callback) {
    const messagesRef = ref(rtdb, `groupChats/${groupId}/messages`);
    return onValue(messagesRef, (snapshot) => {
      const messages = [];
      snapshot.forEach((child) => {
        messages.push({
          id: child.key,
          ...child.val()
        });
      });
      callback(messages.sort((a, b) => a.timestamp - b.timestamp));
    });
  }
};

// ============================================
// PRODUCT SERVICE
// ============================================
export const productService = {
  // Get all products
  async getProducts(category = null) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('isActive', '==', true));
      
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get product categories
  async getCategories() {
    try {
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Add product (admin only)
  async addProduct(productData) {
    try {
      const docRef = await addDoc(collection(db, 'products'), {
        ...productData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        views: 0,
        favorites: 0,
        sales: 0
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }
};

// ============================================
// ORDER SERVICE - FIXED VERSION
// ============================================
export const orderService = {
  // Create individual order within a group
  async createIndividualOrder(groupId, orderData) {
    try {
      // Check if there's an active group order
      let groupOrderId = await this.getOrCreateActiveGroupOrder(groupId);
      
      // Create individual order
      const orderRef = await addDoc(collection(db, 'orders'), {
        groupId,
        groupOrderId,
        userId: orderData.userId,
        userName: orderData.userName,
        userEmail: orderData.userEmail,
        userPhone: orderData.userPhone,
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        paymentStatus: 'pending',
        orderStatus: 'placed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // FIXED: Use Date.now() instead of serverTimestamp() in arrayUnion
      await this.addParticipantToGroupOrder(groupOrderId, {
        userId: orderData.userId,
        userName: orderData.userName,
        orderId: orderRef.id,
        amount: orderData.totalAmount,
        items: orderData.items,
        paymentStatus: 'pending',
        joinedAt: Date.now() // FIXED: Use Date.now() instead of serverTimestamp()
      });

      return orderRef.id;
    } catch (error) {
      console.error('Error creating individual order:', error);
      throw error;
    }
  },

  // Get or create active group order
  async getOrCreateActiveGroupOrder(groupId) {
    try {
      const groupOrdersQuery = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', 'in', ['collecting', 'active'])
      );
      
      const snapshot = await getDocs(groupOrdersQuery);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      const groupOrderRef = await addDoc(collection(db, 'groupOrders'), {
        groupId,
        status: 'collecting',
        participants: [],
        totalAmount: 0,
        totalParticipants: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deliveryDate: null,
        minQuantityMet: false
      });

      return groupOrderRef.id;
    } catch (error) {
      console.error('Error getting/creating group order:', error);
      throw error;
    }
  },

  // Add participant to group order
  async addParticipantToGroupOrder(groupOrderId, participantData) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      
      await updateDoc(groupOrderRef, {
        participants: arrayUnion(participantData),
        totalAmount: increment(participantData.amount),
        totalParticipants: increment(1),
        updatedAt: serverTimestamp()
      });

      await this.checkMinimumQuantities(groupOrderId);
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  },

  // Update payment status
  async updatePaymentStatus(orderId, status) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data();
      
      await updateDoc(orderRef, {
        paymentStatus: status,
        paidAt: status === 'paid' ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });

      if (orderData.groupOrderId) {
        await this.updateParticipantPaymentStatus(
          orderData.groupOrderId,
          orderData.userId,
          status
        );
      }

      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  // Update participant payment status
  async updateParticipantPaymentStatus(groupOrderId, userId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) return;

      const groupOrderData = groupOrderDoc.data();
      const updatedParticipants = groupOrderData.participants.map(p =>
        p.userId === userId ? { ...p, paymentStatus: status, paidAt: Date.now() } : p
      );

      await updateDoc(groupOrderRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });

      const allPaid = updatedParticipants.every(p => p.paymentStatus === 'paid');
      if (allPaid) {
        await updateDoc(groupOrderRef, {
          status: 'confirmed',
          confirmedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating participant payment:', error);
      throw error;
    }
  },

  // Check minimum quantities
  async checkMinimumQuantities(groupOrderId) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) return;

      const groupOrderData = groupOrderDoc.data();
      const productQuantities = {};

      groupOrderData.participants.forEach(participant => {
        participant.items.forEach(item => {
          if (productQuantities[item.id]) {
            productQuantities[item.id].quantity += item.quantity;
          } else {
            productQuantities[item.id] = {
              quantity: item.quantity,
              minQuantity: item.minQuantity || 1,
              name: item.name
            };
          }
        });
      });

      const allMinimumsMet = Object.values(productQuantities).every(
        product => product.quantity >= product.minQuantity
      );

      await updateDoc(groupOrderRef, {
        productQuantities,
        minQuantityMet: allMinimumsMet,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error checking minimum quantities:', error);
      throw error;
    }
  },

  // Get group order details
  async getGroupOrderDetails(groupOrderId) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) {
        throw new Error('Group order not found');
      }

      return {
        id: groupOrderDoc.id,
        ...groupOrderDoc.data()
      };
    } catch (error) {
      console.error('Error fetching group order details:', error);
      throw error;
    }
  },

  // Get user's orders - FIXED to not require index
  async getUserOrders(userId) {
    try {
      // Simplified query without orderBy to avoid index requirement
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(ordersQuery);
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort client-side
      return orders.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },

  // Subscribe to group order updates
  subscribeToGroupOrder(groupOrderId, callback) {
    const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
    return onSnapshot(groupOrderRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}