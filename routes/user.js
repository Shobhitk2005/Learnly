
const express = require('express');
const multer = require('multer');
const path = require('path');
const { admin, db } = require('../firebase');
const router = express.Router();

// Configure multer for doubt images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/doubt-images/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'doubt-image-' + uniqueSuffix + path.extname(file.originalname));
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
      return res.status(401).json({ error: 'No authorization token provided' });
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

// Submit doubt
router.post('/submit-doubt', verifyToken, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
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
    const { subject, question } = req.body;
    const userId = req.user.uid;

    if (!subject || !question) {
      return res.status(400).json({ error: 'Subject and question are required' });
    }

    // Check if user has doubt access
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    if (!userData.doubtAccess || userData.subscriptionStatus !== 'active') {
      return res.status(403).json({ error: 'Doubt access not enabled. Please complete subscription and wait for admin approval.' });
    }

    const doubtData = {
      userId: userId,
      subject: subject,
      question: question,
      imagePath: req.file ? req.file.path : null,
      imageName: req.file ? req.file.filename : null,
      status: 'pending',
      adminResponse: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const doubtRef = await db.collection('doubts').add(doubtData);

    console.log('✅ Doubt submitted successfully by user:', userId);

    res.json({ 
      success: true, 
      message: 'Doubt submitted successfully',
      doubtId: doubtRef.id
    });

  } catch (error) {
    console.error('Error submitting doubt:', error);
    res.status(500).json({ 
      error: 'Failed to submit doubt',
      details: error.message 
    });
  }
});

// Get user's doubts
router.get('/my-doubts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const doubtsSnapshot = await db.collection('doubts')
      .where('userId', '==', userId)
      .get();

    const doubts = [];
    doubtsSnapshot.forEach(doc => {
      const doubtData = doc.data();
      doubts.push({
        id: doc.id,
        ...doubtData,
        createdAt: doubtData.createdAt?.toDate(),
        updatedAt: doubtData.updatedAt?.toDate(),
        respondedAt: doubtData.respondedAt?.toDate()
      });
    });

    // Sort by createdAt in descending order (newest first)
    doubts.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(doubts);
  } catch (error) {
    console.error('Error fetching user doubts:', error);
    res.status(500).json({ error: 'Failed to fetch doubts' });
  }
});

// Configure multer for profile picture uploads
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-pictures/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-pic-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const profileUpload = multer({ 
  storage: profileStorage,
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

// Upload profile picture
router.post('/upload-profile-picture', verifyToken, (req, res, next) => {
  profileUpload.single('profilePicture')(req, res, (err) => {
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
    const userId = req.user.uid;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Update user's profile picture in database
    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    
    await db.collection('users').doc(userId).update({
      profilePicture: profilePictureUrl,
      updatedAt: new Date()
    });

    console.log('✅ Profile picture uploaded successfully for user:', userId);

    res.json({ 
      success: true, 
      message: 'Profile picture uploaded successfully',
      profilePictureUrl: profilePictureUrl
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ 
      error: 'Failed to upload profile picture',
      details: error.message 
    });
  }
});

module.exports = router;
