
const express = require('express');
const { admin, db, bucket } = require('../firebase');
const router = express.Router();

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    const adminKey = req.headers['admin-key'] || req.body.adminKey || req.query.adminKey;
    
    if (!adminKey || adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }
    
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Apply admin auth to all routes
router.use(adminAuth);

// Get all users
router.get('/users', async (req, res) => {
  try {
    console.log('🔄 Fetching users from database...');
    const usersSnapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        name: userData.name,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        subscriptionStatus: userData.subscriptionStatus || 'inactive',
        doubtAccess: userData.doubtAccess || false,
        adminApproved: userData.adminApproved || false,
        paymentProofUploaded: userData.paymentProofUploaded || false,
        createdAt: userData.createdAt?.toDate(),
        updatedAt: userData.updatedAt?.toDate()
      });
    });
    
    console.log(`✅ Found ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all payments
router.get('/payments', async (req, res) => {
  try {
    console.log('🔄 Fetching payments from database...');
    const paymentsSnapshot = await db.collection('payments').orderBy('createdAt', 'desc').get();
    const payments = [];
    
    for (const doc of paymentsSnapshot.docs) {
      const paymentData = doc.data();
      
      // Get user info for each payment
      let userInfo = {};
      if (paymentData.userId) {
        try {
          const userDoc = await db.collection('users').doc(paymentData.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userInfo = {
              userName: userData.name,
              userEmail: userData.email,
              userPhone: userData.phoneNumber
            };
          }
        } catch (userError) {
          console.error('Error fetching user info for payment:', userError);
        }
      }
      
      payments.push({
        id: doc.id,
        userId: paymentData.userId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        proofUrl: paymentData.proofUrl || (paymentData.proofImageName ? `/uploads/payment-proofs/${paymentData.proofImageName}` : null),
        proofImagePath: paymentData.proofImagePath,
        proofImageName: paymentData.proofImageName,
        approved: paymentData.approved,
        status: paymentData.status || 'pending',
        upiId: paymentData.upiId,
        transactionId: paymentData.transactionId,
        ...userInfo,
        createdAt: paymentData.createdAt?.toDate(),
        updatedAt: paymentData.updatedAt?.toDate(),
        approvedAt: paymentData.approvedAt?.toDate(),
        rejectedAt: paymentData.rejectedAt?.toDate()
      });
    }
    
    console.log(`✅ Found ${payments.length} payments`);
    res.json(payments);
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get all doubts
router.get('/doubts', async (req, res) => {
  try {
    console.log('🔄 Fetching doubts from database...');
    const doubtsSnapshot = await db.collection('doubts').orderBy('createdAt', 'desc').get();
    const doubts = [];
    
    for (const doc of doubtsSnapshot.docs) {
      const doubtData = doc.data();
      
      // Get user info for each doubt
      let userInfo = {};
      if (doubtData.userId) {
        try {
          const userDoc = await db.collection('users').doc(doubtData.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userInfo = {
              userName: userData.name,
              userEmail: userData.email
            };
          }
        } catch (userError) {
          console.error('Error fetching user info for doubt:', userError);
        }
      }
      
      doubts.push({
        id: doc.id,
        userId: doubtData.userId,
        subject: doubtData.subject,
        question: doubtData.question,
        status: doubtData.status,
        adminResponse: doubtData.adminResponse,
        imagePath: doubtData.imagePath,
        imageName: doubtData.imageName,
        imageUrl: doubtData.imageName ? `/uploads/doubt-images/${doubtData.imageName}` : null,
        ...userInfo,
        createdAt: doubtData.createdAt?.toDate(),
        updatedAt: doubtData.updatedAt?.toDate()
      });
    }
    
    console.log(`✅ Found ${doubts.length} doubts`);
    res.json(doubts);
  } catch (error) {
    console.error('❌ Error fetching doubts:', error);
    res.status(500).json({ error: 'Failed to fetch doubts' });
  }
});

// Toggle doubt access for a user
router.post('/toggle-doubt-access', async (req, res) => {
  try {
    const { userId, enabled } = req.body;
    
    if (!userId || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request data. userId and enabled (boolean) are required.' });
    }
    
    console.log(`🔄 Toggling doubt access for user ${userId} to ${enabled}`);
    await db.collection('users').doc(userId).update({
      doubtAccess: enabled,
      updatedAt: new Date()
    });
    
    console.log(`✅ Doubt access ${enabled ? 'enabled' : 'disabled'} for user:`, userId);
    
    res.json({ 
      success: true,
      message: `Doubt access ${enabled ? 'enabled' : 'disabled'} successfully` 
    });
  } catch (error) {
    console.error('❌ Error toggling doubt access:', error);
    res.status(500).json({ error: 'Failed to toggle doubt access' });
  }
});

// Approve/reject payment
router.post('/approve-payment', async (req, res) => {
  try {
    const { paymentId, approve } = req.body;
    
    if (!paymentId || typeof approve !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request data. paymentId and approve (boolean) are required.' });
    }
    
    console.log(`🔄 ${approve ? 'Approving' : 'Rejecting'} payment ${paymentId}`);
    
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    if (!paymentDoc.exists) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const paymentData = paymentDoc.data();
    
    // Use batch for atomic operations
    const batch = db.batch();
    
    // Update payment status
    const paymentRef = db.collection('payments').doc(paymentId);
    batch.update(paymentRef, {
      approved: approve,
      status: approve ? 'approved' : 'rejected',
      approvedAt: approve ? new Date() : null,
      rejectedAt: !approve ? new Date() : null,
      updatedAt: new Date()
    });
    
    // Update user subscription status only if user exists
    if (paymentData.userId) {
      const userRef = db.collection('users').doc(paymentData.userId);
      
      // Check if user exists first
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        if (approve) {
          batch.update(userRef, {
            subscriptionStatus: 'active',
            adminApproved: true,
            doubtAccess: true,
            paymentApprovedAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          batch.update(userRef, {
            subscriptionStatus: 'inactive',
            adminApproved: false,
            doubtAccess: false,
            paymentRejectedAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
    await batch.commit();
    
    console.log(`✅ Payment ${approve ? 'approved' : 'rejected'} for payment ID:`, paymentId);
    
    res.json({ 
      success: true,
      message: `Payment ${approve ? 'approved' : 'rejected'} successfully`,
      userId: paymentData.userId,
      approve: approve
    });
  } catch (error) {
    console.error('❌ Error processing payment approval:', error);
    res.status(500).json({ error: 'Failed to process payment approval' });
  }
});

// Respond to doubt
router.post('/respond-doubt', async (req, res) => {
  try {
    const { doubtId, response } = req.body;
    
    if (!doubtId || !response) {
      return res.status(400).json({ error: 'Doubt ID and response are required' });
    }
    
    console.log(`🔄 Responding to doubt ${doubtId}`);
    await db.collection('doubts').doc(doubtId).update({
      adminResponse: response,
      respondedAt: new Date(),
      status: 'responded',
      updatedAt: new Date()
    });
    
    console.log('✅ Response added to doubt:', doubtId);
    
    res.json({ 
      success: true,
      message: 'Response added successfully' 
    });
  } catch (error) {
    console.error('❌ Error responding to doubt:', error);
    res.status(500).json({ error: 'Failed to respond to doubt' });
  }
});

// Resolve doubt
router.post('/resolve-doubt', async (req, res) => {
  try {
    const { doubtId } = req.body;
    
    if (!doubtId) {
      return res.status(400).json({ error: 'Doubt ID is required' });
    }
    
    console.log(`🔄 Resolving doubt ${doubtId}`);
    await db.collection('doubts').doc(doubtId).update({
      status: 'resolved',
      resolvedAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Doubt resolved:', doubtId);
    
    res.json({ 
      success: true,
      message: 'Doubt resolved successfully' 
    });
  } catch (error) {
    console.error('❌ Error resolving doubt:', error);
    res.status(500).json({ error: 'Failed to resolve doubt' });
  }
});

module.exports = router;
