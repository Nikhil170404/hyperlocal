// src/services/groupService.js - WITH PAYMENT WINDOW & TIMER LOGIC
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
  increment,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Constants
const PAYMENT_WINDOW_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

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
        totalOrders: 0
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
      const q = query(groupsRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);
      
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(group => {
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
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user groups:', error);
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
      console.error('Error joining group:', error);
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
      console.error('Error leaving group:', error);
      throw error;
    }
  },

  async getGroupById(groupId) {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const snapshot = await getDoc(groupRef);
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
      console.error('Error fetching group:', error);
      throw error;
    }
  },

  subscribeToGroup(groupId, callback) {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(groupRef, (doc) => {
      if (doc.exists()) callback({ id: doc.id, ...doc.data() });
    });
  }
};

export const productService = {
  async getProducts(category = null) {
    try {
      const productsRef = collection(db, 'products');
      let q = query(productsRef, where('isActive', '==', true));
      
      if (category) {
        q = query(q, where('category', '==', category));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getCategories() {
    try {
      const categoriesRef = collection(db, 'categories');
      const snapshot = await getDocs(categoriesRef);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
};

export const orderService = {
  /**
   * Create individual order
   */
  async createIndividualOrder(groupId, orderData) {
    try {
      console.log('📦 Creating order for:', orderData.userName);
      
      const groupOrderId = await this.getOrCreateActiveGroupOrder(groupId);
      
      const orderRef = await addDoc(collection(db, 'orders'), {
        groupId,
        groupOrderId,
        userId: orderData.userId,
        userName: orderData.userName || '',
        userEmail: orderData.userEmail || '',
        userPhone: orderData.userPhone || '',
        items: orderData.items,
        totalAmount: orderData.totalAmount || 0,
        paymentStatus: 'pending',
        orderStatus: 'placed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        expiresAt: null // Will be set when payment window opens
      });

      await this.addParticipantToGroupOrder(groupOrderId, {
        userId: orderData.userId,
        userName: orderData.userName || 'User',
        orderId: orderRef.id,
        amount: orderData.totalAmount || 0,
        items: orderData.items,
        paymentStatus: 'pending',
        joinedAt: Date.now()
      });

      return orderRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Get or create active group order
   */
  async getOrCreateActiveGroupOrder(groupId) {
    try {
      const q = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', 'in', ['collecting', 'active', 'payment_window'])
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      const groupOrderRef = await addDoc(collection(db, 'groupOrders'), {
        groupId,
        status: 'collecting',
        participants: [],
        totalAmount: 0,
        totalParticipants: 0,
        productQuantities: {},
        minQuantityMet: false,
        allPaid: false,
        paymentProgress: 0,
        paymentWindow: {
          isActive: false,
          startedAt: null,
          expiresAt: null
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return groupOrderRef.id;
    } catch (error) {
      console.error('Error in getOrCreateActiveGroupOrder:', error);
      throw error;
    }
  },

  /**
   * Add participant and check if payment window should open
   */
  async addParticipantToGroupOrder(groupOrderId, participantData) {
    try {
      return await runTransaction(db, async (transaction) => {
        const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
        const groupOrderDoc = await transaction.get(groupOrderRef);
        
        if (!groupOrderDoc.exists()) throw new Error('Group order not found');

        const currentData = groupOrderDoc.data();
        let participants = currentData.participants || [];
        
        const existingIndex = participants.findIndex(
          p => p.userId === participantData.userId
        );

        if (existingIndex >= 0) {
          participants[existingIndex] = {
            ...participants[existingIndex],
            ...participantData,
            updatedAt: Date.now()
          };
        } else {
          participants.push(participantData);
        }

        // Aggregate product quantities
        const productQuantities = {};
        
        participants.forEach(participant => {
          (participant.items || []).forEach(item => {
            if (!item.id) return;
            
            if (productQuantities[item.id]) {
              productQuantities[item.id].quantity += item.quantity;
              productQuantities[item.id].totalValue += (item.groupPrice * item.quantity);
              productQuantities[item.id].participants.push({
                userId: participant.userId,
                userName: participant.userName,
                quantity: item.quantity
              });
            } else {
              productQuantities[item.id] = {
                quantity: item.quantity,
                minQuantity: item.minQuantity || 50,
                name: item.name,
                price: item.groupPrice,
                retailPrice: item.retailPrice || item.groupPrice,
                totalValue: item.groupPrice * item.quantity,
                participants: [{
                  userId: participant.userId,
                  userName: participant.userName,
                  quantity: item.quantity
                }]
              };
            }
          });
        });

        // Check if ALL products meet minimum
        const minQuantityMet = Object.keys(productQuantities).length > 0 &&
          Object.values(productQuantities).every(p => p.quantity >= p.minQuantity);

        const totalAmount = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
        const paidCount = participants.filter(p => p.paymentStatus === 'paid').length;
        const allPaid = paidCount === participants.length && participants.length > 0;

        // Payment window logic
        let paymentWindow = currentData.paymentWindow || { isActive: false };
        let status = currentData.status;

        if (minQuantityMet && !paymentWindow.isActive) {
          // Open payment window
          const now = Date.now();
          paymentWindow = {
            isActive: true,
            startedAt: now,
            expiresAt: now + PAYMENT_WINDOW_DURATION
          };
          status = 'payment_window';
          
          console.log('✅ Payment window opened! Expires at:', new Date(paymentWindow.expiresAt));
          
          // Schedule cleanup job
          this.schedulePaymentWindowCleanup(groupOrderId, paymentWindow.expiresAt);
        }

        if (allPaid && minQuantityMet) {
          status = 'confirmed';
        } else if (paidCount > 0 && paymentWindow.isActive) {
          status = 'active';
        }

        transaction.update(groupOrderRef, {
          participants,
          totalAmount,
          totalParticipants: participants.length,
          productQuantities,
          minQuantityMet,
          allPaid,
          paymentProgress: participants.length > 0 ? Math.round((paidCount / participants.length) * 100) : 0,
          status,
          paymentWindow,
          updatedAt: serverTimestamp()
        });

        return true;
      });
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  },

  /**
   * Schedule cleanup for expired payment window
   */
  schedulePaymentWindowCleanup(groupOrderId, expiresAt) {
    const delay = expiresAt - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        await this.cleanupExpiredPaymentWindow(groupOrderId);
      }, delay);
    }
  },

  /**
   * Clean up expired payment window - remove unpaid orders
   */
  async cleanupExpiredPaymentWindow(groupOrderId) {
    try {
      console.log('🧹 Cleaning up expired payment window:', groupOrderId);
      
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) return;

      const data = groupOrderDoc.data();
      
      // Check if already confirmed or cancelled
      if (data.status === 'confirmed' || data.status === 'cancelled') {
        return;
      }

      // Remove unpaid participants
      const paidParticipants = (data.participants || []).filter(
        p => p.paymentStatus === 'paid'
      );
      const unpaidParticipants = (data.participants || []).filter(
        p => p.paymentStatus !== 'paid'
      );

      // Delete unpaid individual orders
      const batch = writeBatch(db);
      for (const participant of unpaidParticipants) {
        if (participant.orderId) {
          const orderRef = doc(db, 'orders', participant.orderId);
          batch.update(orderRef, {
            orderStatus: 'cancelled',
            cancelReason: 'payment_window_expired',
            updatedAt: serverTimestamp()
          });
        }
      }
      await batch.commit();

      if (paidParticipants.length === 0) {
        // No paid orders - cancel entire group order
        await updateDoc(groupOrderRef, {
          status: 'cancelled',
          cancelReason: 'no_payments',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Some paid - proceed with paid orders only
        await updateDoc(groupOrderRef, {
          participants: paidParticipants,
          status: 'confirmed',
          confirmedAt: serverTimestamp(),
          paymentWindow: {
            ...data.paymentWindow,
            isActive: false,
            closedAt: Date.now()
          },
          updatedAt: serverTimestamp()
        });
      }

      console.log(`✅ Cleaned up: ${paidParticipants.length} paid, ${unpaidParticipants.length} cancelled`);
    } catch (error) {
      console.error('Error cleaning up payment window:', error);
    }
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(orderId, status) {
    try {
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
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  /**
   * Update participant payment in group order
   */
  async updateParticipantPaymentInGroupOrder(groupOrderId, userId, orderId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) return false;

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

      const paidCount = participants.filter(p => p.paymentStatus === 'paid').length;
      const allPaid = paidCount === participants.length && participants.length > 0;

      let newStatus = data.status;
      if (allPaid && data.minQuantityMet) {
        newStatus = 'processing'; // Ready for delivery
      } else if (paidCount > 0) {
        newStatus = 'active';
      }

      await updateDoc(groupOrderRef, {
        participants,
        status: newStatus,
        allPaid,
        paymentProgress: participants.length > 0 ? Math.round((paidCount / participants.length) * 100) : 0,
        ...(allPaid && { confirmedAt: serverTimestamp() }),
        updatedAt: serverTimestamp()
      });

      // If all paid, start delivery process
      if (allPaid) {
        await this.startDeliveryProcess(groupOrderId);
      }

      return true;
    } catch (error) {
      console.error('Error updating participant payment:', error);
      return false;
    }
  },

  /**
   * Start delivery process
   */
  async startDeliveryProcess(groupOrderId) {
    try {
      console.log('🚚 Starting delivery process for:', groupOrderId);
      
      await updateDoc(doc(db, 'groupOrders', groupOrderId), {
        status: 'processing',
        deliveryStatus: 'preparing',
        processingStartedAt: serverTimestamp(),
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error starting delivery:', error);
    }
  },

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(groupOrderId, deliveryStatus) {
    try {
      await updateDoc(doc(db, 'groupOrders', groupOrderId), {
        deliveryStatus,
        ...(deliveryStatus === 'delivered' && {
          deliveredAt: serverTimestamp(),
          status: 'completed'
        }),
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  },

  async getActiveGroupOrders(groupId) {
    try {
      const q = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', 'in', ['collecting', 'active', 'payment_window', 'confirmed', 'processing'])
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      console.error('Error fetching active orders:', error);
      throw error;
    }
  },

  async getGroupOrderDetails(groupOrderId) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const docSnapshot = await getDoc(groupOrderRef);
      return docSnapshot.exists() ? { id: docSnapshot.id, ...docSnapshot.data() } : null;
    } catch (error) {
      console.error('Error fetching order details:', error);
      throw error;
    }
  },

  async getUserOrders(userId) {
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw error;
    }
  },

  subscribeToGroupOrder(groupOrderId, callback) {
    const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
    return onSnapshot(groupOrderRef, (doc) => {
      if (doc.exists()) callback({ id: doc.id, ...doc.data() });
    });
  }
};

export default { groupService, productService, orderService };