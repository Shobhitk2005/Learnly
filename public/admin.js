let currentUser = null;
let adminKey = null;

// Get admin key from user
function getAdminKey() {
  if (!adminKey) {
    adminKey = prompt('Enter admin secret key:');
    if (!adminKey) {
      alert('Admin key is required to access admin panel');
      window.location.href = '/';
      return false;
    }
  }
  return true;
}

// Show different sections
function showSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll('.admin-section');
  sections.forEach(section => {
    section.style.display = 'none';
  });

  // Show selected section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = 'block';
  }

  // Update active tab
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.classList.remove('active');
  });

  const activeTab = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
}

// Initialize admin panel
function initializeAdmin() {
  console.log('✅ Admin panel initialized successfully');

  if (!getAdminKey()) return;

  // Show users section by default
  showSection('users');

  // Load all data
  loadUsers();
  loadPayments();
  loadDoubts();

  // Set up auto-refresh every 10 seconds for real-time updates
  setInterval(() => {
    refreshCurrentSection();
  }, 10000);
}

// Load users data
async function loadUsers() {
  try {
    console.log('🔄 Loading users...');
    const response = await fetch('/api/admin/users', {
      headers: {
        'admin-key': adminKey
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert('Invalid admin key');
        adminKey = null;
        return getAdminKey() && loadUsers();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const users = await response.json();
    console.log('✅ Users loaded:', users.length);
    displayUsers(users);
  } catch (error) {
    console.error('❌ Error loading users:', error);
    document.getElementById('users-list').innerHTML = '<p class="error-message">Failed to load users. Please refresh the page.</p>';
  }
}

// Display users with enhanced information
function displayUsers(users) {
  const usersContainer = document.getElementById('users-list');
  if (!usersContainer) return;

  if (users.length === 0) {
    usersContainer.innerHTML = '<p class="no-data">No users found</p>';
    return;
  }

  usersContainer.innerHTML = users.map(user => `
    <div class="user-card">
      <h3>${user.name || 'N/A'}</h3>
      <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
      <p><strong>Phone:</strong> ${user.phoneNumber || 'N/A'}</p>
      <p><strong>Subscription Status:</strong> 
        <span class="status ${user.subscriptionStatus === 'active' ? 'active' : 'inactive'}">
          ${user.subscriptionStatus || 'inactive'}
        </span>
      </p>
      <p><strong>Admin Approved:</strong> 
        <span class="status ${user.adminApproved ? 'approved' : 'pending'}">
          ${user.adminApproved ? 'Yes' : 'No'}
        </span>
      </p>
      <p><strong>Payment Proof:</strong> 
        <span class="status ${user.paymentProofUploaded ? 'uploaded' : 'not-uploaded'}">
          ${user.paymentProofUploaded ? 'Uploaded' : 'Not Uploaded'}
        </span>
      </p>
      <p><strong>Doubt Access:</strong> 
        <span class="status ${user.doubtAccess ? 'enabled' : 'disabled'}">
          ${user.doubtAccess ? 'Enabled' : 'Disabled'}
        </span>
      </p>
      <p><strong>Joined:</strong> ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
      <div class="user-actions">
        <button class="btn-toggle" onclick="toggleDoubtAccess('${user.id}', ${!user.doubtAccess})">
          ${user.doubtAccess ? 'Disable' : 'Enable'} Doubt Access
        </button>
        <button class="btn-view" onclick="viewUserDetails('${user.id}')">
          View Details
        </button>
      </div>
    </div>
  `).join('');
}

// Load payments data
async function loadPayments() {
  try {
    console.log('🔄 Loading payments...');
    const response = await fetch('/api/admin/payments', {
      headers: {
        'admin-key': adminKey
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert('Invalid admin key');
        adminKey = null;
        return getAdminKey() && loadPayments();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const payments = await response.json();
    console.log('✅ Payments loaded:', payments.length);
    displayPayments(payments);
  } catch (error) {
    console.error('❌ Error loading payments:', error);
    document.getElementById('payments-list').innerHTML = '<p class="error-message">Failed to load payments. Please refresh the page.</p>';
  }
}

// Display payments with enhanced information
function displayPayments(payments) {
  const paymentsContainer = document.getElementById('payments-list');
  if (!paymentsContainer) return;

  if (payments.length === 0) {
    paymentsContainer.innerHTML = '<p class="no-data">No payments found</p>';
    return;
  }

  paymentsContainer.innerHTML = payments.map(payment => `
    <div class="payment-item">
          <div class="payment-header">
            <h3>💳 Payment #${payment.id.substring(0, 8)}</h3>
            <span class="payment-status status-${payment.status || 'pending'}">${(payment.status || 'pending').toUpperCase()}</span>
          </div>
          <div class="payment-details">
            <p><strong>👤 User:</strong> ${payment.userName || 'Unknown'} (${payment.userEmail || 'No email'})</p>
            <p><strong>💰 Amount:</strong> ₹${payment.amount || 'N/A'}</p>
            <p><strong>💳 Method:</strong> ${payment.paymentMethod || 'N/A'}</p>
            <p><strong>📅 Date:</strong> ${payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'N/A'}</p>
            ${payment.userPhone ? `<p><strong>📱 Phone:</strong> ${payment.userPhone}</p>` : ''}
          </div>
          <div class="payment-actions">
            ${payment.proofUrl ? `
              <div class="proof-container">
                <img src="${payment.proofUrl}" alt="Payment Proof" class="payment-proof-img" 
                     onclick="window.open('${payment.proofUrl}', '_blank')"
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIE5vdCBGb3VuZDwvdGV4dD48L3N2Zz4='; this.title='Image failed to load';">
                <p class="proof-filename">📄 ${payment.proofImageName || 'payment-proof.jpg'}</p>
                ${payment.uploadMethod ? `<small class="upload-method">Uploaded via: ${payment.uploadMethod}</small>` : ''}
              </div>
            ` : '<p class="no-proof">❌ No payment proof uploaded</p>'}

            <div class="action-buttons">
              <button class="approve-btn ${payment.approved === true ? 'approved' : ''}" 
                      onclick="approvePayment('${payment.id}', true)"
                      ${payment.approved === true ? 'disabled' : ''}>
                ${payment.approved === true ? '✅ Approved' : '✅ Approve'}
              </button>
              <button class="reject-btn ${payment.approved === false ? 'rejected' : ''}" 
                      onclick="approvePayment('${payment.id}', false)"
                      ${payment.approved === false ? 'disabled' : ''}>
                ${payment.approved === false ? '❌ Rejected' : '❌ Reject'}
              </button>
            </div>
          </div>
        </div>
  `).join('');
}

// Load doubts data
async function loadDoubts() {
  try {
    console.log('🔄 Loading doubts...');
    const response = await fetch('/api/admin/doubts', {
      headers: {
        'admin-key': adminKey
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert('Invalid admin key');
        adminKey = null;
        return getAdminKey() && loadDoubts();
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const doubts = await response.json();
    console.log('✅ Doubts loaded:', doubts.length);
    displayDoubts(doubts);
  } catch (error) {
    console.error('❌ Error loading doubts:', error);
    document.getElementById('doubts-list').innerHTML = '<p class="error-message">Failed to load doubts. Please refresh the page.</p>';
  }
}

// Display doubts
function displayDoubts(doubts) {
  const doubtsContainer = document.getElementById('doubts-list');
  if (!doubtsContainer) return;

  if (doubts.length === 0) {
    doubtsContainer.innerHTML = '<p class="no-data">No doubts found</p>';
    return;
  }

  doubtsContainer.innerHTML = doubts.map(doubt => `
    <div class="doubt-card">
      <h3>Doubt #${doubt.id}</h3>
      <p><strong>User:</strong> ${doubt.userName || 'N/A'}</p>
      <p><strong>Email:</strong> ${doubt.userEmail || 'N/A'}</p>
      <p><strong>Subject:</strong> ${doubt.subject || 'N/A'}</p>
      <p><strong>Question:</strong> ${doubt.question || 'N/A'}</p>
      <p><strong>Status:</strong> 
        <span class="status ${doubt.status || 'pending'}">
          ${doubt.status || 'pending'}
        </span>
      </p>
      <p><strong>Date:</strong> ${doubt.createdAt ? new Date(doubt.createdAt).toLocaleDateString() : 'N/A'}</p>
      ${doubt.adminResponse ? `<p><strong>Response:</strong> ${doubt.adminResponse}</p>` : ''}
      ${doubt.imageUrl ? `
        <p><strong>Attached Image:</strong> 
          <button class="btn-view" onclick="viewDoubtImage('${doubt.imageUrl}')">View Image</button>
        </p>
      ` : '<p><strong>Attached Image:</strong> <span class="no-proof">No image attached</span></p>'}
      <div class="doubt-actions">
        ${doubt.status !== 'responded' ? `
          <button class="btn-respond" onclick="respondToDoubt('${doubt.id}')">Respond</button>
        ` : ''}
        ${doubt.status !== 'resolved' ? `
          <button class="btn-resolve" onclick="resolveDoubt('${doubt.id}')">Mark Resolved</button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Toggle doubt access for user
async function toggleDoubtAccess(userId, enabled) {
  try {
    console.log(`🔄 Toggling doubt access for user ${userId} to ${enabled}`);
    const response = await fetch('/api/admin/toggle-doubt-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': adminKey
      },
      body: JSON.stringify({ userId, enabled })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Doubt access toggled successfully');
    alert(result.message);
    loadUsers(); // Reload users to show updated status
  } catch (error) {
    console.error('❌ Error toggling doubt access:', error);
    alert('Failed to toggle doubt access. Please try again.');
  }
}

// Approve/reject payment
async function approvePayment(paymentId, approve) {
  try {
    console.log(`🔄 ${approve ? 'Approving' : 'Rejecting'} payment ${paymentId}`);
    const response = await fetch('/api/admin/approve-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': adminKey
      },
      body: JSON.stringify({ paymentId, approve })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Payment processed successfully');
    alert(result.message);

    // Reload both payments and users to show updated status
    loadPayments();
    loadUsers();
  } catch (error) {
    console.error('❌ Error processing payment:', error);
    alert('Failed to process payment. Please try again.');
  }
}

// View payment proof
function viewPaymentProof(proofUrl) {
  if (proofUrl && proofUrl !== 'N/A') {
    // Firebase Storage URLs already include the full domain
    window.open(proofUrl, '_blank');
  } else {
    alert('No payment proof available');
  }
}

// View doubt image
function viewDoubtImage(imageUrl) {
  if (imageUrl && imageUrl !== 'N/A') {
    // If it's a relative URL, make it absolute
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : window.location.origin + imageUrl;
    window.open(fullUrl, '_blank');
  } else {
    alert('No doubt image available');
  }
}

// Respond to doubt
async function respondToDoubt(doubtId) {
  const response = prompt('Enter your response to this doubt:');
  if (!response) return;

  try {
    console.log(`🔄 Responding to doubt ${doubtId}`);
    const apiResponse = await fetch('/api/admin/respond-doubt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': adminKey
      },
      body: JSON.stringify({ doubtId, response })
    });

    if (!apiResponse.ok) {
      throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
    }

    const result = await apiResponse.json();
    console.log('✅ Response added successfully');
    alert(result.message);
    loadDoubts(); // Reload doubts to show updated status
  } catch (error) {
    console.error('❌ Error responding to doubt:', error);
    alert('Failed to respond to doubt. Please try again.');
  }
}

// Resolve doubt
async function resolveDoubt(doubtId) {
  if (!confirm('Are you sure you want to mark this doubt as resolved?')) {
    return;
  }

  try {
    console.log(`🔄 Resolving doubt ${doubtId}`);
    const response = await fetch('/api/admin/resolve-doubt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admin-key': adminKey
      },
      body: JSON.stringify({ doubtId })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Doubt resolved successfully');
    alert(result.message);
    loadDoubts(); // Reload doubts to show updated status
  } catch (error) {
    console.error('❌ Error resolving doubt:', error);
    alert('Failed to resolve doubt. Please try again.');
  }
}

// View user details
function viewUserDetails(userId) {
  alert(`Viewing details for user: ${userId}`);
  // You can implement a modal or detailed view here
}

// Refresh current section
function refreshCurrentSection() {
  const activeSection = document.querySelector('.admin-section[style*="block"]');
  if (!activeSection) return;

  const sectionId = activeSection.id;

  switch(sectionId) {
    case 'users':
      loadUsers();
      break;
    case 'payments':
      loadPayments();
      break;
    case 'doubts':
      loadDoubts();
      break;
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ Admin panel loading...');
  initializeAdmin();
});