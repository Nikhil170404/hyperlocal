// src/services/groupService.js - COMPLETE REFACTOR WITH TIMER SYSTEM
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
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

// ============================================
// CONSTANTS
// ============================================
const COLLECTING_PHASE_DURATION = 4 * 60 * 60 * 1000; // 4 hours
const PAYMENT_WINDOW_DURATION = 4 * 60 * 60 * 1000; // 4 hours
const SUSPENSION_DAYS = 3;

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
        currentOrderCycle: null,
        stats: {
          totalOrders: 0,
          totalMembers: 1,
          totalSavings: 0
        }
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  async getGroupsByLocation(latitude, longitude, radius = 50) {
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
      // Check if user is suspended
      const isSuspended = await this.checkUserSuspension(userId);
      if (isSuspended) {
        throw new Error('Your account is suspended. You cannot join groups at this time.');
      }

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
          'stats.totalMembers': increment(1),
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
          'stats.totalMembers': increment(-1),
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
  },

  // Check if user is suspended
  async checkUserSuspension(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      if (!userData.suspendedUntil) return false;
      
      const now = Date.now();
      const suspendedUntil = userData.suspendedUntil.toMillis?.() || userData.suspendedUntil;
      
      if (suspendedUntil > now) {
        return true; // Still suspended
      } else {
        // Suspension expired, clear it
        await updateDoc(userRef, {
          suspendedUntil: null,
          suspensionReason: null,
          updatedAt: serverTimestamp()
        });
        return false;
      }
    } catch (error) {
      console.error('Error checking suspension:', error);
      return false;
    }
  },

  // Suspend user
  async suspendUser(userId, reason = 'Payment default') {
    try {
      const suspendUntil = Date.now() + (SUSPENSION_DAYS * 24 * 60 * 60 * 1000);
      
      await updateDoc(doc(db, 'users', userId), {
        suspendedUntil: Timestamp.fromMillis(suspendUntil),
        suspensionReason: reason,
        suspensionCount: increment(1),
        updatedAt: serverTimestamp()
      });

      // Log suspension
      await addDoc(collection(db, 'suspensions'), {
        userId,
        reason,
        suspendedAt: serverTimestamp(),
        suspendedUntil: Timestamp.fromMillis(suspendUntil),
        days: SUSPENSION_DAYS
      });

      console.log(`⚠️ User ${userId} suspended for ${SUSPENSION_DAYS} days`);
      return true;
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
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

// ============================================
// ORDER SERVICE - COMPLETE REFACTOR
// ============================================
export const orderService = {
  /**
   * Start a new order cycle for a group
   */
  async startOrderCycle(groupId) {
    try {
      const now = Date.now();
      const collectingEndsAt = now + COLLECTING_PHASE_DURATION;

      const cycleRef = await addDoc(collection(db, 'orderCycles'), {
        groupId,
        phase: 'collecting', // collecting -> payment_window -> confirmed -> processing -> completed
        collectingStartedAt: Timestamp.fromMillis(now),
        collectingEndsAt: Timestamp.fromMillis(collectingEndsAt),
        paymentWindowStartedAt: null,
        paymentWindowEndsAt: null,
        participants: [],
        productOrders: {}, // { productId: { quantity, participants: [], minQuantity, metMinimum: false } }
        totalParticipants: 0,
        totalAmount: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update group with current cycle
      await updateDoc(doc(db, 'groups', groupId), {
        currentOrderCycle: cycleRef.id,
        updatedAt: serverTimestamp()
      });

      // Schedule collecting phase end
      this.scheduleCollectingPhaseEnd(cycleRef.id, collectingEndsAt);

      console.log(`✅ Order cycle ${cycleRef.id} started for group ${groupId}`);
      return cycleRef.id;
    } catch (error) {
      console.error('Error starting order cycle:', error);
      throw error;
    }
  },

  /**
   * Get or create active order cycle
   */
  async getOrCreateOrderCycle(groupId) {
    try {
      // Check for active cycle
      const cyclesQuery = query(
        collection(db, 'orderCycles'),
        where('groupId', '==', groupId),
        where('phase', 'in', ['collecting', 'payment_window']),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(cyclesQuery);
      
      if (!snapshot.empty) {
        const cycle = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        
        // Check if collecting phase expired
        const now = Date.now();
        const collectingEndsAt = cycle.collectingEndsAt?.toMillis() || 0;
        
        if (cycle.phase === 'collecting' && now > collectingEndsAt) {
          // Transition to payment window or cancel
          await this.endCollectingPhase(cycle.id);
          // Recursively get the updated cycle
          return await this.getOrCreateOrderCycle(groupId);
        }
        
        return cycle.id;
      }

      // Create new cycle
      return await this.startOrderCycle(groupId);
    } catch (error) {
      console.error('Error getting/creating order cycle:', error);
      throw error;
    }
  },

  /**
   * Add user order to cycle
   */
  async addOrderToCycle(cycleId, orderData) {
    try {
      // Check if user is suspended
      const isSuspended = await groupService.checkUserSuspension(orderData.userId);
      if (isSuspended) {
        throw new Error('Your account is suspended. You cannot place orders.');
      }

      return await runTransaction(db, async (transaction) => {
        const cycleRef = doc(db, 'orderCycles', cycleId);
        const cycleDoc = await transaction.get(cycleRef);
        
        if (!cycleDoc.exists()) throw new Error('Order cycle not found');
        
        const cycle = cycleDoc.data();
        
        // Check phase
        if (cycle.phase !== 'collecting') {
          throw new Error('Order cycle is not accepting new orders');
        }

        // Check time
        const now = Date.now();
        const collectingEndsAt = cycle.collectingEndsAt?.toMillis() || 0;
        if (now > collectingEndsAt) {
          throw new Error('Collecting phase has ended');
        }

        // Update participants
        let participants = cycle.participants || [];
        const existingIndex = participants.findIndex(p => p.userId === orderData.userId);
        
        const participantData = {
          userId: orderData.userId,
          userName: orderData.userName,
          userEmail: orderData.userEmail,
          userPhone: orderData.userPhone,
          items: orderData.items,
          totalAmount: orderData.totalAmount,
          paymentStatus: 'pending',
          orderStatus: 'placed',
          joinedAt: Timestamp.fromMillis(Date.now())
        };

        if (existingIndex >= 0) {
          participants[existingIndex] = participantData;
        } else {
          participants.push(participantData);
        }

        // Aggregate product orders
        const productOrders = {};
        participants.forEach(participant => {
          participant.items.forEach(item => {
            if (!productOrders[item.id]) {
              productOrders[item.id] = {
                productId: item.id,
                name: item.name,
                price: item.groupPrice,
                retailPrice: item.retailPrice,
                minQuantity: item.minQuantity || 50,
                quantity: 0,
                totalValue: 0,
                participants: [],
                metMinimum: false
              };
            }
            
            productOrders[item.id].quantity += item.quantity;
            productOrders[item.id].totalValue += item.groupPrice * item.quantity;
            productOrders[item.id].participants.push({
              userId: participant.userId,
              userName: participant.userName,
              quantity: item.quantity
            });
            productOrders[item.id].metMinimum = 
              productOrders[item.id].quantity >= productOrders[item.id].minQuantity;
          });
        });

        const totalAmount = participants.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

        transaction.update(cycleRef, {
          participants,
          productOrders,
          totalParticipants: participants.length,
          totalAmount,
          updatedAt: serverTimestamp()
        });

        return cycleId;
      });
    } catch (error) {
      console.error('Error adding order to cycle:', error);
      throw error;
    }
  },

  /**
   * End collecting phase and transition to payment window or cancel
   */
  async endCollectingPhase(cycleId) {
    try {
      console.log(`⏰ Ending collecting phase for cycle ${cycleId}`);
      
      const cycleRef = doc(db, 'orderCycles', cycleId);
      const cycleDoc = await getDoc(cycleRef);
      
      if (!cycleDoc.exists()) return;
      
      const cycle = cycleDoc.data();
      const productOrders = cycle.productOrders || {};
      
      // Check which products met minimum
      const productsMetMinimum = Object.values(productOrders).filter(p => p.metMinimum);
      const productsNotMetMinimum = Object.values(productOrders).filter(p => !p.metMinimum);
      
      console.log(`✅ Products met minimum: ${productsMetMinimum.length}`);
      console.log(`❌ Products NOT met minimum: ${productsNotMetMinimum.length}`);

      if (productsMetMinimum.length === 0) {
        // No products met minimum - cancel entire cycle
        await updateDoc(cycleRef, {
          phase: 'cancelled',
          status: 'cancelled',
          cancelReason: 'No products met minimum quantity',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        toast.error('Order cycle cancelled - minimum quantities not met', { duration: 5000 });
        return;
      }

      // Remove products that didn't meet minimum
      const filteredProductOrders = {};
      const filteredParticipants = cycle.participants.map(participant => {
        const filteredItems = participant.items.filter(item => 
          productOrders[item.id]?.metMinimum
        );
        
        const newTotalAmount = filteredItems.reduce(
          (sum, item) => sum + (item.groupPrice * item.quantity), 
          0
        );

        return {
          ...participant,
          items: filteredItems,
          totalAmount: newTotalAmount
        };
      }).filter(p => p.items.length > 0); // Remove participants with no valid items

      // Rebuild product orders
      filteredParticipants.forEach(participant => {
        participant.items.forEach(item => {
          if (!filteredProductOrders[item.id]) {
            filteredProductOrders[item.id] = productOrders[item.id];
          }
        });
      });

      // Start payment window
      const now = Date.now();
      const paymentWindowEndsAt = now + PAYMENT_WINDOW_DURATION;

      await updateDoc(cycleRef, {
        phase: 'payment_window',
        participants: filteredParticipants,
        productOrders: filteredProductOrders,
        totalParticipants: filteredParticipants.length,
        totalAmount: filteredParticipants.reduce((sum, p) => sum + p.totalAmount, 0),
        paymentWindowStartedAt: Timestamp.fromMillis(now),
        paymentWindowEndsAt: Timestamp.fromMillis(paymentWindowEndsAt),
        updatedAt: serverTimestamp()
      });

      // Schedule payment window end
      this.schedulePaymentWindowEnd(cycleId, paymentWindowEndsAt);

      // Notify users
      toast.success(`Payment window opened! You have 4 hours to complete payment.`, {
        duration: 10000,
        icon: '💳'
      });

      console.log(`✅ Payment window opened for cycle ${cycleId}`);
    } catch (error) {
      console.error('Error ending collecting phase:', error);
    }
  },

  /**
   * End payment window and process payments
   */
  async endPaymentWindow(cycleId) {
    try {
      console.log(`⏰ Ending payment window for cycle ${cycleId}`);
      
      const cycleRef = doc(db, 'orderCycles', cycleId);
      const cycleDoc = await getDoc(cycleRef);
      
      if (!cycleDoc.exists()) return;
      
      const cycle = cycleDoc.data();
      const participants = cycle.participants || [];
      
      const paidParticipants = participants.filter(p => p.paymentStatus === 'paid');
      const unpaidParticipants = participants.filter(p => p.paymentStatus !== 'paid');
      
      console.log(`✅ Paid: ${paidParticipants.length}, ❌ Unpaid: ${unpaidParticipants.length}`);

      // Suspend unpaid users
      const batch = writeBatch(db);
      for (const participant of unpaidParticipants) {
        await groupService.suspendUser(participant.userId, 'Failed to complete payment within time limit');
      }

      if (paidParticipants.length === 0) {
        // No one paid - cancel order
        await updateDoc(cycleRef, {
          phase: 'cancelled',
          status: 'cancelled',
          cancelReason: 'No payments received',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        toast.error('Order cycle cancelled - no payments received');
        return;
      }

      // Proceed with paid participants only
      // Recalculate product orders
      const finalProductOrders = {};
      paidParticipants.forEach(participant => {
        participant.items.forEach(item => {
          if (!finalProductOrders[item.id]) {
            finalProductOrders[item.id] = {
              productId: item.id,
              name: item.name,
              price: item.groupPrice,
              quantity: 0,
              participants: []
            };
          }
          finalProductOrders[item.id].quantity += item.quantity;
          finalProductOrders[item.id].participants.push({
            userId: participant.userId,
            userName: participant.userName,
            quantity: item.quantity
          });
        });
      });

      await updateDoc(cycleRef, {
        phase: 'confirmed',
        status: 'confirmed',
        participants: paidParticipants,
        productOrders: finalProductOrders,
        totalParticipants: paidParticipants.length,
        totalAmount: paidParticipants.reduce((sum, p) => sum + p.totalAmount, 0),
        confirmedAt: serverTimestamp(),
        estimatedDelivery: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        updatedAt: serverTimestamp()
      });

      toast.success(`Order confirmed! Delivering tomorrow to ${paidParticipants.length} members`, {
        duration: 5000,
        icon: '🚚'
      });

      console.log(`✅ Order cycle ${cycleId} confirmed with ${paidParticipants.length} participants`);
    } catch (error) {
      console.error('Error ending payment window:', error);
    }
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(cycleId, userId, status) {
    try {
      return await runTransaction(db, async (transaction) => {
        const cycleRef = doc(db, 'orderCycles', cycleId);
        const cycleDoc = await transaction.get(cycleRef);
        
        if (!cycleDoc.exists()) throw new Error('Cycle not found');
        
        const cycle = cycleDoc.data();
        const participants = cycle.participants.map(p => 
          p.userId === userId 
            ? { ...p, paymentStatus: status, paidAt: status === 'paid' ? Timestamp.now() : null }
            : p
        );

        const allPaid = participants.every(p => p.paymentStatus === 'paid');

        transaction.update(cycleRef, {
          participants,
          ...(allPaid && {
            phase: 'confirmed',
            status: 'confirmed',
            confirmedAt: serverTimestamp(),
            estimatedDelivery: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
          }),
          updatedAt: serverTimestamp()
        });

        return true;
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  },

  /**
   * Schedule collecting phase end
   */
  scheduleCollectingPhaseEnd(cycleId, endsAt) {
    const delay = endsAt - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await this.endCollectingPhase(cycleId);
      }, delay);
    }
  },

  /**
   * Schedule payment window end
   */
  schedulePaymentWindowEnd(cycleId, endsAt) {
    const delay = endsAt - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        await this.endPaymentWindow(cycleId);
      }, delay);
    }
  },

  /**
   * Get active order cycles for a group
   */
  async getActiveOrderCycles(groupId) {
    try {
      const cyclesQuery = query(
        collection(db, 'orderCycles'),
        where('groupId', '==', groupId),
        where('phase', 'in', ['collecting', 'payment_window', 'confirmed', 'processing']),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(cyclesQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching cycles:', error);
      throw error;
    }
  },

  /**
   * Get order cycle details
   */
  async getOrderCycleDetails(cycleId) {
    try {
      const cycleRef = doc(db, 'orderCycles', cycleId);
      const cycleDoc = await getDoc(cycleRef);
      return cycleDoc.exists() ? { id: cycleDoc.id, ...cycleDoc.data() } : null;
    } catch (error) {
      console.error('Error fetching cycle details:', error);
      throw error;
    }
  },

  /**
   * Subscribe to order cycle updates
   */
  subscribeToOrderCycle(cycleId, callback) {
    const cycleRef = doc(db, 'orderCycles', cycleId);
    return onSnapshot(cycleRef, (doc) => {
      if (doc.exists()) callback({ id: doc.id, ...doc.data() });
    });
  },

  /**
   * Get user's order history
   */
  async getUserOrderHistory(userId) {
    try {
      const cyclesQuery = query(
        collection(db, 'orderCycles'),
        where('participants', 'array-contains', { userId })
      );
      
      const snapshot = await getDocs(cyclesQuery);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(cycle => cycle.participants?.some(p => p.userId === userId));
    } catch (error) {
      console.error('Error fetching user orders:', error);
      return [];
    }
  }
};

export default { groupService, productService, orderService };