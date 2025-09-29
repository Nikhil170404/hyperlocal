// src/services/orderService.js - Enhanced with Payment Tracking
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const enhancedOrderService = {
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

      // Update group order with this participant
      await this.addParticipantToGroupOrder(groupOrderId, {
        userId: orderData.userId,
        userName: orderData.userName,
        orderId: orderRef.id,
        amount: orderData.totalAmount,
        items: orderData.items,
        paymentStatus: 'pending',
        joinedAt: serverTimestamp()
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
      // Check for active group order
      const groupOrdersQuery = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', 'in', ['collecting', 'active']),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(groupOrdersQuery);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Create new group order
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

      // Check if minimum quantities are met
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

      // Update group order participant status
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

  // Update participant payment status in group order
  async updateParticipantPaymentStatus(groupOrderId, userId, status) {
    try {
      const groupOrderRef = doc(db, 'groupOrders', groupOrderId);
      const groupOrderDoc = await getDoc(groupOrderRef);
      
      if (!groupOrderDoc.exists()) return;

      const groupOrderData = groupOrderDoc.data();
      const updatedParticipants = groupOrderData.participants.map(p =>
        p.userId === userId ? { ...p, paymentStatus: status } : p
      );

      await updateDoc(groupOrderRef, {
        participants: updatedParticipants,
        updatedAt: serverTimestamp()
      });

      // Check if all participants have paid
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

      // Aggregate quantities from all participants
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

      // Check if all minimums are met
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

  // Get group order details with participants
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

  // Get user's orders
  async getUserOrders(userId) {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
  },

  // Get active group orders for a group
  async getActiveGroupOrders(groupId) {
    try {
      const ordersQuery = query(
        collection(db, 'groupOrders'),
        where('groupId', '==', groupId),
        where('status', 'in', ['collecting', 'active', 'confirmed']),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(ordersQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching active group orders:', error);
      throw error;
    }
  },

  // Update order status
  async updateOrderStatus(orderId, status) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        orderStatus: status,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
};

// Export for use in other files
export default enhancedOrderService;