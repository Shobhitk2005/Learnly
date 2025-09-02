
const express = require('express');
const multer = require('multer');
const path = require('path');
const { admin, db, bucket } = require('../firebase');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/payment-proofs/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'payment-proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Upload payment proof
router.post('/upload-proof', verifyToken, (req, res, next) => {
  upload.single('paymentProof')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large. Please upload an image smaller than 2MB.' });
      } else if (err.message === 'Only image files are allowed') {
        return res.status(400).json({ error: 'Only image files are allowed.' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { plan, amount, paymentMethod } = req.body;
    const userId = req.user.uid;

    if (!req.file) {
      return res.status(400).json({ error: 'Payment proof file is required' });
    }

    if (!plan || !amount) {
      return res.status(400).json({ error: 'Plan and amount are required' });
    }

    // Create payment record with proper proof URL
    const proofUrl = `/uploads/payment-proofs/${req.file.filename}`;
    const paymentData = {
      userId: userId,
      plan: plan,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'UPI',
      proofUrl: proofUrl,
      proofImagePath: req.file.path,
      proofImageName: req.file.filename,
      status: 'pending',
      approved: null, // null = pending, true = approved, false = rejected
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore
    const paymentRef = await db.collection('payments').add(paymentData);

    // Update user record to indicate payment proof uploaded
    await db.collection('users').doc(userId).update({
      paymentProofUploaded: true,
      lastPaymentId: paymentRef.id,
      updatedAt: new Date()
    });

    console.log('✅ Payment proof uploaded successfully for user:', userId);

    res.json({ 
      success: true, 
      message: 'Payment proof uploaded successfully. Please wait for admin approval.',
      paymentId: paymentRef.id
    });

  } catch (error) {
    console.error('Error uploading payment proof:', error);
    res.status(500).json({ 
      error: 'Failed to upload payment proof',
      details: error.message 
    });
  }
});

// Get user's payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const paymentsSnapshot = await db.collection('payments')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const payments = [];
    paymentsSnapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      });
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;
