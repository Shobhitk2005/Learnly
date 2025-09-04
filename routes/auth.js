
const express = require('express');
const { admin, db } = require('../firebase');
const router = express.Router();

// Verify Firebase token middleware
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create user profile after registration
router.post('/create-profile', verifyToken, async (req, res) => {
  try {
    const { uid, email, phone_number } = req.user;
    const { name, phone, userType } = req.body;
    
    // Use phone from Firebase token if available (phone auth), otherwise use provided phone
    const userPhone = phone_number || phone || '';
    const userEmail = email || `${userPhone}@phone.auth`; // Create email for phone-only users
    
    await db.collection('users').doc(uid).set({
      name: name || 'Student',
      email: userEmail,
      phone: userPhone,
      subscriptionStatus: 'inactive',
      doubtAccess: false,
      createdAt: new Date(),
      role: userType || 'student',
      authMethod: phone_number ? 'phone' : 'email'
    });

    res.json({ message: 'Profile created successfully' });
  } catch (error) {
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

// Get user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    console.log('🔍 Fetching profile for user:', req.user.uid);
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      console.log('❌ User document not found for:', req.user.uid);
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    console.log('✅ User profile found:', userData.name || userData.email);
    res.json(userData);
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
