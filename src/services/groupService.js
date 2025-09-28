// src/services/groupService.js
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { db, rtdb } from '../config/firebase';

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
        currentOrders: []
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  // Get groups by location
  async getGroupsByLocation(latitude, longitude, radius = 3) {
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
        // Simple distance calculation (you might want to use a proper geospatial library)
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

  // Join group
  async joinGroup(groupId, userId) {
    try {
      const groupRef = doc(db, 'groups', groupId);
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

// Helper function for distance calculation
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

// src/services/productService.js
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
      }));
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
        isActive: true
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }
};

// src/services/orderService.js
export const orderService = {
  // Create group order
  async createGroupOrder(groupId, orderData) {
    try {
      const docRef = await addDoc(collection(db, 'groupOrders'), {
        groupId,
        ...orderData,
        status: 'collecting',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants: [],
        totalAmount: 0,
        minQuantityMet: false
      });
      
      // Update group with current order
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        currentOrders: arrayUnion(docRef.id),
        updatedAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating group order:', error);
      throw error;
    }
  },

  // Join group order
  async joinGroupOrder(orderId, userId, items, amount) {
    try {
      const orderRef = doc(db, 'groupOrders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data();
      const updatedParticipants = [...orderData.participants, {
        userId,
        items,
        amount,
        joinedAt: new Date()
      }];
      
      await updateDoc(orderRef, {
        participants: updatedParticipants,
        totalAmount: orderData.totalAmount + amount,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error joining group order:', error);
      throw error;
    }
  },

  // Get user orders
  async getUserOrders(userId) {
    try {
      const ordersRef = collection(db, 'groupOrders');
      const q = query(
        ordersRef,
        where('participants', 'array-contains-any', [{ userId }]),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const orderRef = doc(db, 'groupOrders', orderId);
      await updateDoc(orderRef, {
        status,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  // Subscribe to group order updates
  subscribeToGroupOrder(orderId, callback) {
    const orderRef = doc(db, 'groupOrders', orderId);
    return onSnapshot(orderRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }
};