// src/services/groupService.js - FIXED ALL IMPORT ERRORS
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
  runTransaction,
  writeBatch,
  increment
} from 'firebase/firestore';
import { ref, onValue, push, set } from 'firebase/database';
import { db, rtdb } from '../config/firebase';

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
      console.log('✅ Group created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating group:', error);
      throw error;
    }
  },

  async getGroupsByLocation(latitude, longitude, radius = 5) {
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      })).filter(group => {
        if (!group.location) return true;
        const distance = calculateDistance(
          latitude, longitude,
          group.location.latitude, group.location.longitude
        );
        return distance <= radius;
      }).sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0));
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
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
      
      return snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
    } catch (error) {
      console.error('❌ Error fetching user groups:', error);
      throw error;
    }
  },

  async joinGroup(groupId, userId) {
    try {
      return await runTransaction(db, async (transaction) => {
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await transaction.get(groupRef);
        
        if (!groupDoc.exists()) throw new Error('Group not found');
        
        const groupData = groupDoc.data();
        if (groupData.members?.includes(userId)) {
          throw new Error('Already a member');
        }
        
        transaction.update(groupRef, {
          members: arrayUnion(userId),
          updatedAt: serverTimestamp()
        });
        
        return true;
      });
    } catch (error) {
      console.error('❌ Error joining group:', error);
      throw error;
    }
  },

  async leaveGroup(groupId, userId) {
    try {
      return await runTransaction(db, async (transaction) => {
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await transaction.get(groupRef);
        
        if (!groupDoc.exists()) throw new Error('Group not found');
        
        const groupData = groupDoc.data();
        if (groupData.createdBy === userId) {
          throw new Error('Group creator cannot leave');
        }
        
        transaction.update(groupRef, {
          members: arrayRemove(userId),
          updatedAt: serverTimestamp()
        });
        
        return true;
      });
    } catch (error) {
      console.error('❌ Error leaving group:', error);
      throw error;
    }
  },

  async getGroupById(groupId) {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const snapshot = await getDoc(groupRef);
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
      console.error('❌ Error fetching group:', error);
      throw error;
    }
  },

  subscribeToGroup(groupId, callback) {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(groupRef, (docSnapshot) => {
      if (docSnapshot.exists()) callback({ id: docSnapshot.id, ...docSnapshot.data() });
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
      return snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      throw error;
    }
  },

  async getCategories() {
    try {
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      return snapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      throw error;
    }
  }
};

// ============================================
// ORDER SERVICE - ENHANCED FOR GROUP ORDERS
// ============================================
export const orderService = {
  /**
   * CREATE INDIVIDUAL ORDER
   */
  async createIndividualOrder(groupId, orderData) {
    try {
      console.log('📦 Creating order for group:', groupId);
      
      if (!groupId || !orderData.userId || !orderData.items?.length) {
        throw new Error('Invalid order data');
      }

      const groupOrderId = await this.getOrCreateActiveGroupOrder(groupId);
      
      const orderRef = await addDoc(collection(db, 'orders'), {
        groupId,
        groupOrderId,
        userId: orderData.userId,
        userName: orderData.userName || '',
        userEmail: orderData.userEmail || '',
        userPhone: orderData.userPhone || '',
        items: orderData.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          groupPrice: item.groupPrice,
          retailPrice: item.retailPrice,
          minQuantity: item.minQuantity || 50
        })),
        totalAmount: orderData.totalAmount || 0,
        paymentStatus: 'pending',
        orderStatus: 'placed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ Order created:', orderRef.id);

      await this.addParticipantToGroupOrder(groupOrderId, {
        userId: orderData.userId,
        userName: orderData.userName || 'User',
        orderId: orderRef.id,
        amount: orderData.totalAmount || 0,
        items: orderData.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.groupPrice,
          minQuantity: item.minQuantity || 50
        })),
        paymentStatus: 'pending',
        joinedAt: Date.now()
      });

      return orderRef.id;
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  },

  /**
   * GET OR CREATE ACTIVE GROUP ORDER
   */
  async getOrCreateActiveGroupOrder(groupId) {
    try {
      const q = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', 'in', ['collecting', 'active'])
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const existing = snapshot.docs[0];
        console.log('✅ Using existing group order:', existing.id);
        return existing.id;
      }

      console.log('📝 Creating new group order');
      const groupOrderRef = await addDoc(collection(db, 'groupOrders'), {
        groupId,
        status: 'collecting',
        participants: [],
        totalAmount: 0,
        totalParticipants: 0,
        productQuantities: {},
        minQuantityMet: false,
        allPaid: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        currentOrders: arrayUnion(groupOrderRef.id)
      });

      console.log('✅ New group order:', groupOrderRef.id);
      return groupOrderRef.id;
    } catch (error) {
      console.error('❌ Error in getOrCreateActiveGroupOrder:', error);
      throw error;
    }
  },

  /**
   * ADD PARTICIPANT TO GROUP ORDER
   */
  async addParticipantToGroupOrder(groupOrderId, participantData) {
    try {
      console.log('➕ Adding participant to group order');
      
      return await runTransaction(db, async (transaction) => {
        const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
        const groupOrderDoc = await transaction.get(groupOrderRef);
        
        if (!groupOrderDoc.exists()) {
          throw new Error('Group order not found');
        }

        const currentData = groupOrderDoc.data();
        let participants = currentData.participants || [];
        
        const existingIndex = participants.findIndex(
          p => p.userId === participantData.userId
        );

        if (existingIndex >= 0) {
          console.log('🔄 Updating existing participant');
          participants[existingIndex] = {
            ...participants[existingIndex],
            ...participantData,
            updatedAt: Date.now()
          };
        } else {
          console.log('✨ Adding new participant');
          participants.push(participantData);
        }

        // Aggregate product quantities
        const productQuantities = {};
        participants.forEach(participant => {
          (participant.items || []).forEach(item => {
            if (!item.id) return;
            
            if (productQuantities[item.id]) {
              productQuantities[item.id].quantity += item.quantity;
            } else {
              productQuantities[item.id] = {
                quantity: item.quantity,
                minQuantity: item.minQuantity || 50,
                name: item.name,
                price: item.price
              };
            }
          });
        });

        const minQuantityMet = Object.values(productQuantities).length > 0 &&
          Object.values(productQuantities).every(p => p.quantity >= p.minQuantity);

        const totalAmount = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalParticipants = participants.length;

        transaction.update(groupOrderRef, {
          participants,
          totalAmount,
          totalParticipants,
          productQuantities,
          minQuantityMet,
          status: totalParticipants > 0 ? 'active' : 'collecting',
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Updated: ${totalParticipants} participants, min met: ${minQuantityMet}`);
        return true;
      });
    } catch (error) {
      console.error('❌ Error adding participant:', error);
      throw error;
    }
  },

  /**
   * UPDATE PAYMENT STATUS
   */
  async updatePaymentStatus(orderId, status) {
    try {
      console.log(`💳 Updating payment: ${orderId} -> ${status}`);
      
      return await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await transaction.get(orderRef);
        
        if (!orderDoc.exists()) throw new Error('Order not found');
        
        const orderData = orderDoc.data();
        
        transaction.update(orderRef, {
          paymentStatus: status,
          paidAt: status === 'paid' ? serverTimestamp() : null,
          updatedAt: serverTimestamp()
        });

        if (orderData.groupOrderId) {
          await this.updateParticipantPaymentInGroupOrder(
            orderData.groupOrderId,
            orderData.userId,
            orderId,
            status
          );
        }

        return true;
      });
    } catch (error) {
      console.error('❌ Error updating payment:', error);
      throw error;
    }
  },

  /**
   * UPDATE PARTICIPANT PAYMENT IN GROUP ORDER
   */
  async updateParticipantPaymentInGroupOrder(groupOrderId, userId, orderId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) {
        console.log('⚠️ Group order not found');
        return false;
      }

      const data = groupOrderDoc.data();
      let participants = data.participants || [];
      
      participants = participants.map(p => {
        if (p.userId === userId || p.orderId === orderId) {
          return {
            ...p,
            paymentStatus: status,
            paidAt: status === 'paid' ? Date.now() : null
          };
        }
        return p;
      });

      const totalCount = participants.length;
      const paidCount = participants.filter(p => p.paymentStatus === 'paid').length;
      const allPaid = paidCount === totalCount && totalCount > 0;

      let newStatus = data.status;
      if (allPaid && data.minQuantityMet) {
        newStatus = 'confirmed';
      } else if (paidCount > 0) {
        newStatus = 'active';
      }

      await updateDoc(groupOrderRef, {
        participants,
        status: newStatus,
        allPaid,
        ...(allPaid && { confirmedAt: serverTimestamp() }),
        updatedAt: serverTimestamp()
      });

      console.log(`✅ Group order: ${paidCount}/${totalCount} paid, status: ${newStatus}`);

      if (newStatus === 'confirmed' && !data.nextOrderCreated) {
        await this.createNextGroupOrder(data.groupId, groupOrderId);
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating participant payment:', error);
      return false;
    }
  },

  /**
   * CREATE NEXT GROUP ORDER
   */
  async createNextGroupOrder(groupId, completedOrderId) {
    try {
      console.log('🔄 Creating next group order for group:', groupId);
      
      const completedOrderRef = doc(db, 'groupOrders', completedOrderId);
      await updateDoc(completedOrderRef, {
        nextOrderCreated: true,
        completedAt: serverTimestamp()
      });

      const newOrderRef = await addDoc(collection(db, 'groupOrders'), {
        groupId,
        status: 'collecting',
        participants: [],
        totalAmount: 0,
        totalParticipants: 0,
        productQuantities: {},
        minQuantityMet: false,
        allPaid: false,
        previousOrderId: completedOrderId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, {
        currentOrders: arrayUnion(newOrderRef.id),
        totalOrders: increment(1)
      });

      console.log('✅ Next group order created:', newOrderRef.id);
      return newOrderRef.id;
    } catch (error) {
      console.error('❌ Error creating next order:', error);
      throw error;
    }
  },

  /**
   * GET ACTIVE GROUP ORDERS FOR A GROUP
   */
  async getActiveGroupOrders(groupId) {
    try {
      const q = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', 'in', ['collecting', 'active', 'confirmed'])
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      console.error('❌ Error fetching active orders:', error);
      throw error;
    }
  },

  /**
   * GET GROUP ORDER DETAILS - FIXED
   */
  async getGroupOrderDetails(groupOrderId) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const docSnapshot = await getDoc(groupOrderRef);
      
      if (!docSnapshot.exists()) {
        console.error('❌ Group order not found:', groupOrderId);
        return null;
      }
      
      return { 
        id: docSnapshot.id, 
        ...docSnapshot.data() 
      };
    } catch (error) {
      console.error('❌ Error fetching order details:', error);
      throw error;
    }
  },

  /**
   * GET USER ORDERS
   */
  async getUserOrders(userId) {
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      console.error('❌ Error fetching user orders:', error);
      throw error;
    }
  },

  /**
   * SUBSCRIBE TO GROUP ORDER
   */
  subscribeToGroupOrder(groupOrderId, callback) {
    const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
    return onSnapshot(
      groupOrderRef, 
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          callback({ id: docSnapshot.id, ...docSnapshot.data() });
        }
      },
      (error) => {
        console.error('❌ Subscription error:', error);
      }
    );
  }
};

// Export everything
export default { groupService, productService, orderService };