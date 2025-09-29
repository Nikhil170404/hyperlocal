// src/services/groupService.js - COMPLETE FIXED VERSION
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

  subscribeToGroup(groupId, callback) {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(groupRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  },

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
// ORDER SERVICE - COMPLETELY FIXED
// ============================================
export const orderService = {
  // Create individual order - FIXED
  async createIndividualOrder(groupId, orderData) {
    try {
      console.log('📦 Creating individual order for group:', groupId);
      
      // Get or create active group order
      const groupOrderId = await this.getOrCreateActiveGroupOrder(groupId);
      
      console.log('📋 Using group order:', groupOrderId);

      // Create individual order document
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

      console.log('✅ Individual order created:', orderRef.id);

      // Prepare participant data
      const participantData = {
        userId: orderData.userId,
        userName: orderData.userName,
        orderId: orderRef.id,
        amount: orderData.totalAmount,
        items: orderData.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.groupPrice,
          minQuantity: item.minQuantity || 1
        })),
        paymentStatus: 'pending',
        joinedAt: Date.now()
      };

      // Add to group order
      await this.addParticipantToGroupOrder(groupOrderId, participantData);

      console.log('✅ Participant added to group order');

      return orderRef.id;
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  },

  // Get or create active group order - FIXED
  async getOrCreateActiveGroupOrder(groupId) {
    try {
      // Query for active collecting orders
      const groupOrdersQuery = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', '==', 'collecting')
      );
      
      const snapshot = await getDocs(groupOrdersQuery);
      
      // Return existing order
      if (!snapshot.empty) {
        const existingOrder = snapshot.docs[0];
        console.log('✅ Found existing group order:', existingOrder.id);
        return existingOrder.id;
      }

      // Create new group order
      console.log('📝 Creating new group order');
      
      const groupOrderRef = await addDoc(collection(db, 'groupOrders'), {
        groupId,
        status: 'collecting',
        participants: [],
        totalAmount: 0,
        totalParticipants: 0,
        productQuantities: {},
        minQuantityMet: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ New group order created:', groupOrderRef.id);
      return groupOrderRef.id;
    } catch (error) {
      console.error('❌ Error getting/creating group order:', error);
      throw error;
    }
  },

  // Add participant to group order - COMPLETELY FIXED
  async addParticipantToGroupOrder(groupOrderId, participantData) {
    try {
      console.log('➕ Adding participant to group order:', groupOrderId);
      
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) {
        throw new Error('Group order not found');
      }

      const currentData = groupOrderDoc.data();
      const currentParticipants = currentData.participants || [];
      
      // Check if participant already exists
      const existingIndex = currentParticipants.findIndex(
        p => p.userId === participantData.userId || p.orderId === participantData.orderId
      );

      let updatedParticipants;
      if (existingIndex >= 0) {
        // Update existing participant
        console.log('🔄 Updating existing participant');
        updatedParticipants = [...currentParticipants];
        updatedParticipants[existingIndex] = participantData;
      } else {
        // Add new participant
        console.log('✨ Adding new participant');
        updatedParticipants = [...currentParticipants, participantData];
      }

      // Calculate totals
      const totalAmount = updatedParticipants.reduce((sum, p) => sum + p.amount, 0);
      const totalParticipants = updatedParticipants.length;

      // Update group order with new participants
      await updateDoc(groupOrderRef, {
        participants: updatedParticipants,
        totalAmount,
        totalParticipants,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Group order updated: ${totalParticipants} participants, ₹${totalAmount}`);

      // Update product quantities
      await this.updateProductQuantities(groupOrderId, updatedParticipants);

      return true;
    } catch (error) {
      console.error('❌ Error adding participant:', error);
      throw error;
    }
  },

  // Update product quantities - FIXED
  async updateProductQuantities(groupOrderId, participants) {
    try {
      const productQuantities = {};

      // Aggregate quantities
      participants.forEach(participant => {
        participant.items.forEach(item => {
          if (productQuantities[item.id]) {
            productQuantities[item.id].quantity += item.quantity;
          } else {
            productQuantities[item.id] = {
              quantity: item.quantity,
              minQuantity: item.minQuantity || 1,
              name: item.name,
              price: item.price
            };
          }
        });
      });

      // Check minimums
      const allMinimumsMet = Object.values(productQuantities).every(
        product => product.quantity >= product.minQuantity
      );

      // Update
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      await updateDoc(groupOrderRef, {
        productQuantities,
        minQuantityMet: allMinimumsMet,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Product quantities updated, all minimums met:', allMinimumsMet);
      
      return allMinimumsMet;
    } catch (error) {
      console.error('❌ Error updating quantities:', error);
      throw error;
    }
  },

  // Update payment status - FIXED
  async updatePaymentStatus(orderId, status) {
    try {
      console.log(`💳 Updating payment: ${orderId} to ${status}`);
      
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }

      const orderData = orderDoc.data();
      
      // Update order
      await updateDoc(orderRef, {
        paymentStatus: status,
        paidAt: status === 'paid' ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });

      // Update group order
      if (orderData.groupOrderId) {
        await this.updateParticipantPaymentStatus(
          orderData.groupOrderId,
          orderData.userId,
          orderId,
          status
        );
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating payment:', error);
      throw error;
    }
  },

  // Update participant payment - FIXED
  async updateParticipantPaymentStatus(groupOrderId, userId, orderId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) {
        console.log('⚠️ Group order not found');
        return;
      }

      const groupOrderData = groupOrderDoc.data();
      const participants = groupOrderData.participants || [];
      
      // Update participant
      const updatedParticipants = participants.map(p => {
        if (p.userId === userId || p.orderId === orderId) {
          return {
            ...p,
            paymentStatus: status,
            paidAt: status === 'paid' ? Date.now() : null
          };
        }
        return p;
      });

      // Update group order
      await updateDoc(groupOrderRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });

      console.log('✅ Participant payment updated');

      // Check if all paid
      const paidCount = updatedParticipants.filter(p => p.paymentStatus === 'paid').length;
      const allPaid = paidCount === updatedParticipants.length && updatedParticipants.length > 0;

      if (allPaid) {
        await updateDoc(groupOrderRef, {
          status: 'confirmed',
          confirmedAt: serverTimestamp()
        });
        console.log('🎉 All participants paid! Order confirmed');
      } else if (paidCount > 0) {
        await updateDoc(groupOrderRef, {
          status: 'active'
        });
        console.log(`✅ ${paidCount}/${updatedParticipants.length} paid - Order active`);
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating participant payment:', error);
      throw error;
    }
  },

  // Get group order details - FIXED
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
      console.error('Error fetching group order:', error);
      throw error;
    }
  },

  // Get user orders - FIXED (no index required)
  async getUserOrders(userId) {
    try {
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

  // Subscribe to group order
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
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}