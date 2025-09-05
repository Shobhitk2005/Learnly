
const express = require('express');
const multer = require('multer');
const path = require('path');
const { admin, db, bucket } = require('../firebase');
const cloudinary = require('cloudinary').v2;
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
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

// Function to upload to Firebase Storage
async function uploadToFirebase(fileBuffer, fileName, mimetype, userId) {
  const filePath = `payment-proofs/${fileName}`;
  const file = bucket.file(filePath);
  
  const stream = file.createWriteStream({
    metadata: {
      contentType: mimetype,
      metadata: {
        userId: userId,
        uploadedAt: new Date().toISOString()
      }
    }
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (error) => {
      console.error('Firebase Storage upload error:', error);
      reject(error);
    });

    stream.on('finish', async () => {
      try {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
        resolve(publicUrl);
      } catch (error) {
        console.error('Error making file public:', error);
        reject(error);
      }
    });

    stream.end(fileBuffer);
  });
}

// Function to upload to Cloudinary
async function uploadToCloudinary(fileBuffer, fileName, userId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        public_id: `payment-proofs/${fileName}`,
        folder: 'learnly/payment-proofs',
        tags: ['payment-proof', userId]
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    ).end(fileBuffer);
  });
}

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

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `payment-proof-${userId}-${timestamp}-${randomString}${fileExtension}`;

    let publicUrl;
    let uploadMethod = 'firebase';

    try {
      // Try Firebase Storage first
      publicUrl = await uploadToFirebase(req.file.buffer, fileName, req.file.mimetype, userId);
      console.log('✅ File uploaded to Firebase Storage:', publicUrl);
    } catch (firebaseError) {
      console.error('❌ Firebase upload failed, trying Cloudinary:', firebaseError.message);
      
      try {
        // Fallback to Cloudinary
        publicUrl = await uploadToCloudinary(req.file.buffer, fileName, userId);
        uploadMethod = 'cloudinary';
        console.log('✅ File uploaded to Cloudinary:', publicUrl);
      } catch (cloudinaryError) {
        console.error('❌ Cloudinary upload also failed:', cloudinaryError.message);
        throw new Error('Both Firebase and Cloudinary uploads failed');
      }
    }

    // Create payment record
    const paymentData = {
      userId: userId,
      plan: plan,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'UPI',
      proofUrl: publicUrl,
      proofImageName: fileName,
      proofImagePath: uploadMethod === 'firebase' ? `payment-proofs/${fileName}` : publicUrl,
      uploadMethod: uploadMethod,
      status: 'pending',
      approved: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore
    const paymentRef = await db.collection('payments').add(paymentData);

    // Update user record
    await db.collection('users').doc(userId).update({
      paymentProofUploaded: true,
      lastPaymentId: paymentRef.id,
      updatedAt: new Date()
    });

    console.log('✅ Payment proof uploaded successfully for user:', userId);

    res.json({ 
      success: true, 
      message: 'Payment proof uploaded successfully. Please wait for admin approval.',
      paymentId: paymentRef.id,
      proofUrl: publicUrl,
      uploadMethod: uploadMethod
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
