// Initialize Firebase and then dashboard
initializeFirebase();

// Initialize Firebase with config from server
let auth, storage, app;

async function initializeFirebase() {
  try {
    const response = await fetch('/api/firebase-config');
    const firebaseConfig = await response.json();

    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js');
    const { getStorage } = await import('https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js');

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    storage = getStorage(app);

    // Initialize the dashboard after Firebase is ready
    initializeDashboard();
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js';


/* =========================
   PARALLAX: element handles
   ========================= */
const text  = document.getElementById('text');
const leaf  = document.getElementById('leaf');
const hill1 = document.getElementById('hill1');
const hill2 = document.getElementById('hill2');
const hill3 = document.getElementById('hill3');
const hill4 = document.getElementById('hill4');
const hill5 = document.getElementById('hill5');
const tree  = document.getElementById('tree');
const plant = document.getElementById('plant');
const parallaxRoot = document.querySelector('.parallax');

// group present targets only (avoids errors if some images are missing)
const parallaxTargets = [
    text, leaf, hill1, hill2, hill3, hill4, hill5, tree, plant
].filter(Boolean);

// Set once (you previously set this inside scroll which causes jank)
function setParallaxTransitionsOnce() {
  parallaxTargets.forEach(el => {
    el.style.willChange = 'transform';
    el.style.backfaceVisibility = 'hidden';
    el.style.transformStyle = 'preserve-3d';
    // keep your easing look without re-applying every frame:
    el.style.transition = 'transform 0.1s ease-out';
  });
}

/* =========================
   PARALLAX: smooth RAF loop
   ========================= */
let ticking = false;
let heroInView = true; // pause updates when hero not visible
let multiplier = 1;

// compute multiplier only on resize (not every scroll)
function recomputeMultiplier() {
  const w = window.innerWidth;
  if (w <= 768)       multiplier = 0.3; // mobile
  else if (w <= 1024) multiplier = 0.6; // tablet
  else                multiplier = 1;   // desktop
}
recomputeMultiplier();

function updateParallax() {
  ticking = false;
  if (!heroInView) return;

  const v = window.scrollY;

  if (text)  { text.style.transform  = `translateY(${v * 1.5 * multiplier}px)`; }
  if (leaf)  { leaf.style.transform  = `translate3d(${v * 0.8 * multiplier}px, ${v * -0.8 * multiplier}px, 0)`; }
  if (hill5) { hill5.style.transform = `translateX(${v * 0.7 * multiplier}px)`; }
  if (hill4) { hill4.style.transform = `translateX(${v * -0.7 * multiplier}px)`; }
  if (hill3) { hill3.style.transform = `translateX(${v * 0.4 * multiplier}px)`; }
  if (hill2) { hill2.style.transform = `translateX(${v * -0.3 * multiplier}px)`; }
  if (hill1) { hill1.style.transform = `translateY(${v * 0.2 * multiplier}px)`; }
  if (tree)  { tree.style.transform  = `translateX(${v * -1.2 * multiplier}px)`; }
  if (plant) { plant.style.transform = `translateY(${v * -0.9 * multiplier}px)`; }
}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(updateParallax);
    ticking = true;
  }
}

// passive scroll listener = smoother
window.addEventListener('scroll', requestTick, { passive: true });
window.addEventListener('resize', () => {
  recomputeMultiplier();
  requestTick();
});

/* Pause parallax work when hero not in viewport */
if ('IntersectionObserver' in window && parallaxRoot) {
  const io = new IntersectionObserver(entries => {
    heroInView = entries[0]?.isIntersecting ?? true;
    if (heroInView) requestTick();
  }, { root: null, threshold: 0 });
  io.observe(parallaxRoot);
}

/* =========================
   BOOTSTRAP
   ========================= */
function initializeDashboard() {
  // image load sanity check (kept from your code)
  const imgs = [hill1, hill2, hill3, hill4, hill5, tree, leaf, plant].filter(Boolean);
  imgs.forEach((img, i) => {
    if (img && img.complete && img.naturalHeight === 0) {
      console.warn(`Image ${i + 1} failed to load:`, img.src);
    }
  });

  setParallaxTransitionsOnce();

  // Initialize the dashboard after Firebase is ready
  checkAuthAndInitialize();
}

/* =========================
   USER DATA / AUTH
   ========================= */
async function loadUserData() {
  try {
    if (!currentUser) {
      console.log('No current user available');
      window.location.href = '/auth?type=student';
      return;
    }

    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (response.ok) {
      const userData = await response.json();
      window.userDataGlobal = userData;
      updateUserInfo(userData);
      displaySubscriptionStatus(userData);
      updateDoubtAccess();
      loadRecentDoubts();
    } else if (response.status === 401) {
      console.error('Unauthorized access, redirecting to login.');
      window.location.href = '/auth?type=student';
    } else {
      console.warn('Failed to fetch user profile, using fallback data.');
      const fallbackUserData = {
        name: currentUser.displayName || 'Student',
        email: currentUser.email,
        phoneNumber: currentUser.phoneNumber || 'Not provided',
        subscriptionStatus: 'inactive',
        doubtAccess: false
      };
      updateUserInfo(fallbackUserData);
      displaySubscriptionStatus(fallbackUserData);
      updateDoubtAccess();
      loadRecentDoubts();
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    const fallbackUserData = {
      name: currentUser?.displayName || 'Student',
      email: currentUser?.email || 'student@learnly.com',
      phoneNumber: 'Not provided',
      subscriptionStatus: 'inactive',
      doubtAccess: false
    };
    updateUserInfo(fallbackUserData);
    displaySubscriptionStatus(fallbackUserData);
    updateDoubtAccess();
    loadRecentDoubts();
  }
}

// Update user info in UI
function updateUserInfo(userData) {
  const elements = {
    userName: document.getElementById('userName'),
    welcomeName: document.getElementById('welcomeName'),
    profileName: document.getElementById('profileName'),
    profileEmail: document.getElementById('profileEmail'),
    profilePhone: document.getElementById('profilePhone'),
    userAvatar: document.getElementById('userAvatar'),
    profileAvatar: document.getElementById('profileAvatar')
  };

  const name = userData.name || currentUser?.displayName || 'Student';
  const email = userData.email || currentUser?.email || 'student@learnly.com';
  const phone = userData.phoneNumber || 'Not provided';

  if (elements.userName) elements.userName.textContent = name;
  if (elements.welcomeName) elements.welcomeName.textContent = name;
  if (elements.profileName) elements.profileName.textContent = name;
  if (elements.profileEmail) elements.profileEmail.textContent = email;
  if (elements.profilePhone) elements.profilePhone.textContent = phone;

  // Update avatars - prioritize database profile picture over Google photo
  const photoURL = userData.profilePicture || currentUser?.photoURL || userData.avatar;
  if (photoURL) {
    if (elements.userAvatar) {
      elements.userAvatar.innerHTML = `<img src="${photoURL}" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
    if (elements.profileAvatar) {
      elements.profileAvatar.innerHTML = `<img src="${photoURL}" alt="Profile" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
  }
}

// Display subscription status
function displaySubscriptionStatus(userData) {
  const statusEl = document.getElementById('subscriptionStatus');
  if (!statusEl) return;

  if (userData.subscriptionStatus === 'active') {
    statusEl.innerHTML = `
      <div class="subscription-active">
        <div class="status-icon"><i class="fas fa-check-circle"></i></div>
        <div class="status-content">
          <h3>Subscription Active</h3>
          <p>You have full access to all features</p>
        </div>
      </div>
    `;
  } else if (userData.paymentProofUploaded) {
    statusEl.innerHTML = `
      <div class="subscription-pending">
        <div class="status-icon"><i class="fas fa-clock"></i></div>
        <div class="status-content">
          <h3>Payment Under Review</h3>
          <p>Your payment proof is being reviewed by admin</p>
        </div>
      </div>
    `;
  } else {
    statusEl.innerHTML = `
      <div class="subscription-inactive">
        <div class="status-icon"><i class="fas fa-exclamation-circle"></i></div>
        <div class="status-content">
          <h3>Subscription Required</h3>
          <p>Subscribe to access all features</p>
          <button onclick="window.location.href='/sub.html'" class="activate-btn">
            Subscribe Now
          </button>
        </div>
      </div>
    `;
  }
}

// Update doubt access
function updateDoubtAccess() {
  const askDoubtBtn = document.getElementById('askDoubtBtn');
  const doubtForm = document.getElementById('doubtForm');
  const doubtAccessMessage = document.getElementById('doubtAccessMessage');

  if (window.userDataGlobal && window.userDataGlobal.doubtAccess && window.userDataGlobal.subscriptionStatus === 'active') {
    if (askDoubtBtn) {
      askDoubtBtn.disabled = false;
      askDoubtBtn.style.opacity = '1';
      askDoubtBtn.style.cursor = 'pointer';
    }
    if (doubtForm) doubtForm.style.display = 'block';
    if (doubtAccessMessage) doubtAccessMessage.style.display = 'none';
    setupDoubtForm();
  } else {
    if (askDoubtBtn) {
      askDoubtBtn.disabled = true;
      askDoubtBtn.style.opacity = '0.6';
      askDoubtBtn.style.cursor = 'not-allowed';
    }
    if (doubtForm) doubtForm.style.display = 'none';
    if (doubtAccessMessage) doubtAccessMessage.style.display = 'block';
  }
}

// Setup doubt form submission
function setupDoubtForm() {
  const form = document.getElementById('doubtSubmissionForm');
  if (form) {
    form.removeEventListener('submit', submitDoubt); // Remove existing listener
    form.addEventListener('submit', submitDoubt);
  }
}

// Submit doubt
async function submitDoubt(e) {
  e.preventDefault();

  if (!currentUser) {
    showMessage('Please login to submit doubts', 'error');
    return;
  }

  try {
    const subject = document.getElementById('doubtSubject').value;
    const question = document.getElementById('doubtQuestion').value;
    const imageFile = document.getElementById('doubtImage').files[0];

    if (!subject || !question) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    showLoadingOverlay();

    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('question', question);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/user/submit-doubt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`
      },
      body: formData
    });

    if (response.ok) {
      showMessage('Doubt submitted successfully!', 'success');
      document.getElementById('doubtSubmissionForm').reset();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to submit doubt');
    }
  } catch (error) {
    console.error('Error submitting doubt:', error);
    showMessage('Failed to submit doubt. Please try again.', 'error');
  } finally {
    hideLoadingOverlay();
  }
}

// Logout function
async function logout() {
  try {
    showLoadingOverlay();
    await signOut(auth);
    localStorage.removeItem('userToken');
    localStorage.removeItem('userType');
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('Logout failed. Please try again.', 'error');
    hideLoadingOverlay();
  }
}

// Utility functions
function showMessage(message, type = 'info') {
  const existingMessage = document.querySelector('.message-toast');
  if (existingMessage) {
    existingMessage.remove();
  }

  const toast = document.createElement('div');
  toast.className = `message-toast ${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    max-width: 350px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    animation: slideInRight 0.3s ease-out;
    ${type === 'success' ? 'background: linear-gradient(135deg, #10b981, #059669);' :
      type === 'error' ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' :
      type === 'warning' ? 'background: linear-gradient(135deg, #f59e0b, #d97706);' :
      'background: linear-gradient(135deg, #3b82f6, #2563eb);'}
  `;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

function showLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// Initialize the dashboard
// This is now called from initializeFirebase after Firebase is ready.
// document.addEventListener('DOMContentLoaded', () => {
//   console.log('✅ Dashboard loading...');
//   initializeDashboard();
// });


// Setup navigation links
function setupNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const section = link.getAttribute('data-section');
      switchSection(section);
    });
  });

  // Add back button to all pages except admin, redirecting to dashboard
  const backButtons = document.querySelectorAll('.back-btn');
  backButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Check if the current page is not the admin page
      if (!window.location.pathname.includes('/admin')) {
        window.location.href = '/dashboard'; // Redirect to dashboard
      }
    });
  });
}

// Setup logout button
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }
}

// Setup action buttons
function setupActionButtons() {
  const askDoubtBtn = document.getElementById('askDoubtBtn');
  if (askDoubtBtn) {
    askDoubtBtn.addEventListener('click', () => {
      if (window.userDataGlobal && window.userDataGlobal.doubtAccess) {
        switchSection('doubts');
      } else {
        showMessage('Doubt access is not enabled. Please complete your subscription and wait for admin approval.', 'warning');
      }
    });
  }
}

// Function to switch between different dashboard sections
function switchSection(section) {
  const sections = document.querySelectorAll('.dashboard-section');
  sections.forEach(s => s.classList.remove('active'));

  const targetSection = document.getElementById(`${section}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  if (section === 'doubts') {
    updateDoubtAccess();
  } else if (section === 'doubt-responses') {
    loadDoubtResponses();
  }
}

// Setup hover effects for cards
function setupCardHoverEffects() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
}

// Function to add dynamic entrance effects
function addDynamicEffects() {
  document.querySelectorAll('.progress').forEach(bar => {
    const width = bar.style.width;
    bar.style.width = '0%';
    setTimeout(() => { bar.style.width = width; }, 500);
  });

  document.querySelectorAll('.bar').forEach((bar, i) => {
    const height = bar.style.height;
    bar.style.height = '0%';
    setTimeout(() => { bar.style.height = height; }, 700 + (i * 100));
  });
}

// Check subscription status and update UI
async function checkSubscriptionStatus() {
  const statusEl = document.getElementById('subscriptionStatus');
  const loadingEl = document.getElementById('subscriptionLoading');

  try {
    if (!currentUser) {
      console.log('No current user, cannot check subscription status.');
      return;
    }

    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (response.ok) {
      const userData = await response.json();
      window.userDataGlobal = userData;
      displaySubscriptionStatus(userData);
      updateDoubtAccess();
    } else if (response.status === 401) {
      console.error('Unauthorized: Redirecting to login.');
      window.location.href = '/auth?type=student';
    } else {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Error checking subscription status:', error);
    if (statusEl) {
      statusEl.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error loading subscription status. Please refresh the page.</p>
        </div>
      `;
    }
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// Load recent doubts for dashboard display
async function loadRecentDoubts() {
  const loadingEl = document.getElementById('recentDoubtsActivityLoading');
  const recentDoubtsEl = document.getElementById('recentDoubtsActivityList');
  if (!recentDoubtsEl) return;

  if (loadingEl) loadingEl.style.display = 'block';

  try {
    if (!currentUser) return;

    console.log('🔄 Loading recent doubts...');

    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/user/my-doubts', {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (response.ok) {
      const doubts = await response.json();
      console.log('✅ Recent doubts loaded:', doubts.length);

      if (loadingEl) loadingEl.style.display = 'none';

      if (doubts.length === 0) {
        recentDoubtsEl.innerHTML = `
          <div class="no-activity">
            <i class="fas fa-question-circle"></i>
            <p>No doubts asked yet</p>
          </div>
        `;
      } else {
        // Show only the 3 most recent doubts
        const recentDoubts = doubts.slice(0, 3);
        recentDoubtsEl.innerHTML = recentDoubts.map(doubt => `
          <div class="activity-item">
            <div class="activity-icon">
              <i class="fas fa-question"></i>
            </div>
            <div class="activity-content">
              <p><strong>${doubt.subject}</strong> - ${doubt.question.substring(0, 50)}${doubt.question.length > 50 ? '...' : ''}</p>
              <small>${formatTimeAgo(doubt.createdAt)} • ${doubt.status}</small>
            </div>
          </div>
        `).join('');
      }
    } else {
      throw new Error('Failed to load recent doubts');
    }
  } catch (error) {
    console.error('❌ Error loading recent doubts:', error);
    if (loadingEl) loadingEl.style.display = 'none';
    if (recentDoubtsEl) {
      recentDoubtsEl.innerHTML = `
        <div class="no-activity">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error loading recent doubts</p>
        </div>
      `;
    }
  }
}

// Load doubt responses for doubt responses section
async function loadDoubtResponses() {
  const loadingEl = document.getElementById('doubtResponsesLoading');
  const listEl = document.getElementById('doubtResponsesList');

  try {
    if (!currentUser) return;

    if (loadingEl) loadingEl.style.display = 'block';

    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/user/my-doubts', {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (response.ok) {
      const doubts = await response.json();

      if (loadingEl) loadingEl.style.display = 'none';

      if (listEl) {
        if (doubts.length === 0) {
          listEl.innerHTML = `
            <div class="no-responses">
              <i class="fas fa-question-circle"></i>
              <h3>No doubts asked yet</h3>
              <p>Start asking doubts to see responses here</p>
            </div>
          `;
        } else {
          listEl.innerHTML = doubts.map(doubt => `
            <div class="doubt-response-item">
              <div class="doubt-response-header">
                <span class="doubt-subject">${doubt.subject}</span>
                <span class="doubt-status ${doubt.status}">${doubt.status}</span>
              </div>
              <div class="doubt-question">
                <strong>Question:</strong> ${doubt.question}
              </div>
              ${doubt.adminResponse ? `
                <div class="doubt-response">
                  <h4><i class="fas fa-reply"></i> Admin Response:</h4>
                  <p>${doubt.adminResponse}</p>
                </div>
              ` : '<p style="color: #718096; font-style: italic;">No response yet</p>'}
              <div class="doubt-date">
                Asked ${formatTimeAgo(doubt.createdAt)}
                ${doubt.updatedAt && doubt.adminResponse ? ` • Responded ${formatTimeAgo(doubt.updatedAt)}` : ''}
              </div>
            </div>
          `).join('');
        }
      }
    }
  } catch (error) {
    console.error('Error loading doubt responses:', error);
    if (loadingEl) loadingEl.style.display = 'none';
    if (listEl) {
      listEl.innerHTML = `
        <div class="no-responses">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error loading responses</h3>
          <p>Please refresh the page to try again</p>
        </div>
      `;
    }
  }
}

// Format time ago helper function
function formatTimeAgo(dateString) {
  if (!dateString) return 'Unknown time';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

// Load view profile data
function loadViewProfileData() {
  if (!currentUser) return;

  console.log('📋 Loading view profile data...');

  // Update profile information
  document.getElementById('viewProfileName').textContent = currentUser.displayName || currentUser.email.split('@')[0];
  document.getElementById('viewProfileEmail').textContent = currentUser.email;
  document.getElementById('viewProfilePhone').textContent = '+91 XXXXXXXXXX'; // This would come from user data
  document.getElementById('viewProfileJoined').textContent = `Joined: ${new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`;

  // Update profile picture if available
  const profilePicture = document.getElementById('viewProfilePicture');
  if (currentUser.photoURL) {
    profilePicture.innerHTML = `<img src="${currentUser.photoURL}" alt="Profile Picture">`;
  } else {
    profilePicture.innerHTML = '<i class="fas fa-user"></i>';
  }

  // Load subscription and doubt statistics
  loadProfileStatistics();
}

// Load profile statistics
async function loadProfileStatistics() {
  try {
    // Load subscription status
    const subResponse = await fetch('/api/user/subscription-status');
    if (subResponse.ok) {
      const subData = await subResponse.json();
      document.getElementById('viewSubscriptionStatus').textContent = subData.hasSubscription ? 'Active' : 'Inactive';
    }

    // Load doubt statistics
    const doubtsResponse = await fetch('/api/user/doubts-stats');
    if (doubtsResponse.ok) {
      const doubtsData = await doubtsResponse.json();
      document.getElementById('viewTotalDoubts').textContent = doubtsData.total || '0';
      document.getElementById('viewResolvedDoubts').textContent = doubtsData.resolved || '0';
    }
  } catch (error) {
    console.error('❌ Error loading profile statistics:', error);
  }
}

// Handle profile picture upload
// Removed the DOMContentLoaded listener here as initializeFirebase handles the initialization flow now.
// document.addEventListener('DOMContentLoaded', function() {
//   const profilePictureUpload = document.getElementById('profilePictureUpload');
//   if (profilePictureUpload) {
//     profilePictureUpload.addEventListener('change', handleProfilePictureUpload);
//   }
// });

// Also set up the event listener when dashboard initializes
function setupProfilePictureUpload() {
  const profilePictureUpload = document.getElementById('profilePictureUpload');
  if (profilePictureUpload) {
    profilePictureUpload.removeEventListener('change', handleProfilePictureUpload);
    profilePictureUpload.addEventListener('change', handleProfilePictureUpload);
  }
}

async function handleProfilePictureUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  if (file.size > 2 * 1024 * 1024) { // 2MB limit
    alert('File size must be less than 2MB.');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/user/upload-profile-picture', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`
      },
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      // Update profile picture display
      const profilePicture = document.getElementById('viewProfilePicture');
      profilePicture.innerHTML = `<img src="${result.profilePictureUrl}" alt="Profile Picture">`;

      // Also update other profile avatars
      const userAvatar = document.getElementById('userAvatar');
      const profileAvatar = document.getElementById('profileAvatar');
      if (userAvatar) userAvatar.innerHTML = `<img src="${result.profilePictureUrl}" alt="Profile Picture" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
      if (profileAvatar) profileAvatar.innerHTML = `<img src="${result.profilePictureUrl}" alt="Profile Picture" style="width: 100%; height: 100%; border-radius: 20px; object-fit: cover;">`;

      alert('Profile picture updated successfully!');
    } else {
      throw new Error('Failed to upload profile picture');
    }
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error);
    alert('Failed to upload profile picture. Please try again.');
  }
}

// Make functions available globally
window.switchSection = switchSection;
window.logout = logout;
window.loadUserData = loadUserData;
window.checkSubscriptionStatus = checkSubscriptionStatus;
window.loadRecentDoubts = loadRecentDoubts;
window.loadDoubtResponses = loadDoubtResponses;
window.showSection = function(sectionId) {
      // Hide all sections
      document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
      });

      // Remove active class from all nav links
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
      });

      // Show selected section
      const targetSection = document.getElementById(sectionId + '-section');
      if (targetSection) {
        targetSection.classList.add('active');

        // Load profile data if viewing profile section
        if (sectionId === 'view-profile') {
          loadViewProfileData();
        }
      }

      // Add active class to clicked nav link
      const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    };

// Helper function to check authentication status and then initialize the dashboard
function checkAuthAndInitialize() {
  // This function is called after Firebase is initialized
  console.log('✅ Checking authentication status...');
  // For now, we assume the user is authenticated if they reach this page.
  // A more robust check might involve checking Firebase auth state here.
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      console.log('✅ User authenticated:', user.email);
      loadUserData();
      loadRecentDoubts(); // Load recent doubts for recent activity section
    } else {
      console.log('❌ No user found, redirecting to auth');
      window.location.href = '/auth?type=student';
    }
  });
}

console.log('✅ Student Dashboard initialized (waiting for Firebase)');