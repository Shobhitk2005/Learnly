import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, OAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential, sendPasswordResetEmail, sendEmailVerification, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDaL18Mt7-oWbWwXuy1j1ov6QepclsUkbU",
  authDomain: "learnly-2c0fc.firebaseapp.com",
  projectId: "learnly-2c0fc",
  storageBucket: "learnly-2c0fc.firebasestorage.app",
  messagingSenderId: "864247257392",
  appId: "1:864247257392:web:faad461dd382d4ace3d0f5",
  measurementId: "G-NQVCSEPJDH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Phone authentication variables
let recaptchaVerifier = null;
let confirmationResult = null;
let phoneAuthType = 'signup'; // 'signup' or 'login'

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Auth page loaded successfully');

    // Get user type from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const userType = urlParams.get('type') || 'student';
    console.log('👤 User type detected:', userType);

    // DOM elements - check if they exist first
    const container = document.getElementById('container');
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const registerBtn = document.getElementById('register');
    const loginBtn = document.getElementById('login');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const passwordResetModal = document.getElementById('passwordResetModal');
    const closePasswordResetModalBtn = document.getElementById('closePasswordResetModalBtn');
    const passwordResetForm = document.getElementById('passwordResetForm');

    // Check for main container first
    if (!container) {
        console.error('❌ Main container not found - page may not be loaded properly');
        return;
    }

    // Set auth titles based on user type - with null checks
    const authTitleText = userType === 'student' ? 'Student Portal' : 'Admin Portal';

    const signupTitle = document.querySelector('.sign-up h1');
    const loginTitle = document.querySelector('.sign-in h1');

    if (signupTitle) {
        signupTitle.textContent = `${authTitleText} - Sign Up`;
        console.log('✅ Signup title set');
    }
    if (loginTitle) {
        loginTitle.textContent = `${authTitleText} - Sign In`;
        console.log('✅ Login title set');
    }

    // Check for required form elements
    if (!signupForm || !loginForm) {
        console.error('❌ Form elements not found');
        return;
    }

    console.log('✅ All required DOM elements found');

    // Helper function to show messages
    function showMessage(message, type = 'info') {
        console.log(`📢 Showing ${type} message:`, message);

        const existingMessage = document.querySelector('.auth-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `auth-message ${type}`;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            ${type === 'success' ? 'background-color: #10b981;' :
              type === 'error' ? 'background-color: #ef4444;' : 'background-color: #3b82f6;'}
        `;
        messageEl.textContent = message;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 5000);
    }

    // Helper function to set loading state
    function setLoadingState(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.style.opacity = '0.7';
            button.style.cursor = 'not-allowed';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
        }
    }

    // Set up form toggle functionality only if buttons exist
    if (registerBtn && loginBtn) {
        registerBtn.addEventListener('click', () => {
            console.log('🔄 Switching to signup form');
            container.classList.add('active');
        });

        loginBtn.addEventListener('click', () => {
            console.log('🔄 Switching to login form');
            container.classList.remove('active');
        });
    }

    // Handle signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📝 Processing signup...');

            const submitBtn = signupForm.querySelector('button[type="submit"]');
            setLoadingState(submitBtn, true);

            try {
                const nameField = document.getElementById('signupName');
                const emailField = document.getElementById('signupEmail');
                const passwordField = document.getElementById('signupPassword');

                if (!nameField || !emailField || !passwordField) {
                    showMessage('Form fields not found. Please refresh the page.', 'error');
                    return;
                }

                const name = nameField.value.trim();
                const email = emailField.value.trim();
                const password = passwordField.value;

                if (!name || !email || !password) {
                    showMessage('Please fill in all required fields.', 'error');
                    return;
                }

                console.log('📤 Sending signup request for:', email);

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Send email verification
                try {
                    if (user.email) {
                        await sendEmailVerification(user);
                        console.log('✉️ Email verification sent to:', user.email);
                    }
                } catch (verificationError) {
                    console.error('❌ Email verification error:', verificationError);
                }

                const profileData = {
                    name: name,
                    phone: '', // Explicitly set phone to empty string
                    userType
                };

                const response = await fetch('/api/auth/create-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await user.getIdToken()}`
                    },
                    body: JSON.stringify(profileData)
                });

                if (response.ok) {
                    localStorage.setItem('userToken', await user.getIdToken());
                    localStorage.setItem('userType', userType);
                    showMessage('Account created successfully! Please check your email for verification. Redirecting...', 'success');

                    setTimeout(() => {
                        redirectToDashboard(userType);
                    }, 1500);
                } else {
                    try {
                        await user.delete();
                        console.log('🧹 Cleaned up Firebase user due to profile creation failure.');
                    } catch (deleteError) {
                        console.error('❌ Failed to delete Firebase user after profile creation failure:', deleteError);
                    }
                    throw new Error('Failed to create profile');
                }
            } catch (error) {
                console.error('❌ Signup error:', error);
                let errorMessage = 'Signup failed. Please try again.';
                if (error.code) {
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'This email is already in use. Please try logging in or use a different email.';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'Password is too weak. Please choose a stronger password.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Please enter a valid email address.';
                            break;
                        default:
                            errorMessage = error.message || errorMessage;
                    }
                } else if (error.message.includes('Failed to create profile')) {
                    errorMessage = 'Failed to create your profile. Please try again.';
                }
                showMessage(errorMessage, 'error');
            } finally {
                setLoadingState(submitBtn, false);
            }
        });
    }

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('🔑 Processing login...');

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            setLoadingState(submitBtn, true);

            try {
                const emailField = document.getElementById('loginEmail');
                const passwordField = document.getElementById('loginPassword');

                if (!emailField || !passwordField) {
                    showMessage('Form fields not found. Please refresh the page.', 'error');
                    return;
                }

                const email = emailField.value.trim();
                const password = passwordField.value;

                if (!email || !password) {
                    showMessage('Please enter both email and password.', 'error');
                    return;
                }

                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Reload user to get latest verification status
                await user.reload();

                // Check if email is verified before proceeding
                if (!user.emailVerified) {
                    // Create verification message with resend option
                    const existingMessage = document.querySelector('.auth-message');
                    if (existingMessage) {
                        existingMessage.remove();
                    }

                    const messageEl = document.createElement('div');
                    messageEl.className = 'auth-message error';
                    messageEl.style.cssText = `
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 15px 20px;
                        border-radius: 8px;
                        color: white;
                        font-weight: 600;
                        z-index: 10000;
                        max-width: 350px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        background-color: #ef4444;
                    `;

                    messageEl.innerHTML = `
                        <div>Please verify your email address first.</div>
                        <button onclick="resendVerificationEmail()" style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3);
                            color: white;
                            padding: 5px 10px;
                            border-radius: 4px;
                            margin-top: 8px;
                            cursor: pointer;
                            font-size: 12px;
                        ">Resend Verification Email</button>
                    `;

                    document.body.appendChild(messageEl);

                    // Store user for resend function
                    window.pendingVerificationUser = user;

                    setTimeout(() => {
                        if (messageEl.parentNode) {
                            messageEl.remove();
                        }
                    }, 10000);

                    await auth.signOut(); // Sign out the user
                    return;
                }

                const idToken = await user.getIdToken();
                localStorage.setItem('userToken', idToken);
                localStorage.setItem('userType', userType);
                showMessage('Login successful! Redirecting...', 'success');

                setTimeout(() => {
                    redirectToDashboard(userType);
                }, 1500);

            } catch (error) {
                console.error('❌ Login error:', error);
                let errorMessage = 'Login failed. Please check your credentials.';
                if (error.code) {
                    switch (error.code) {
                        case 'auth/user-not-found':
                        case 'auth/wrong-password':
                        case 'auth/invalid-login-credentials':
                            errorMessage = 'Invalid email or password. Please try again.';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Please enter a valid email address.';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Too many login attempts. Please try again later.';
                            break;
                        default:
                            errorMessage = error.message || errorMessage;
                    }
                }
                showMessage(errorMessage, 'error');
            } finally {
                setLoadingState(submitBtn, false);
            }
        });
    }

    // Redirect to appropriate dashboard
    function redirectToDashboard(userType) {
        console.log('🔄 Redirecting to dashboard for:', userType);

        switch (userType) {
            case 'admin':
                window.location.href = '/admin-2c9f7';
                break;
            default:
                window.location.href = '/dashboard';
                break;
        }
    }

    // Social login handlers
    function setupSocialLogin() {
        // Google buttons
        const googleBtnSignup = document.getElementById('googleBtn');
        const googleBtnLogin = document.getElementById('googleBtnLogin');
        const appleBtnSignup = document.getElementById('appleBtnSignup');
        const appleBtnLogin = document.getElementById('appleBtnLogin');

        // Google Sign Up
        if (googleBtnSignup) {
            googleBtnSignup.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🌐 Initiating Google OAuth for signup:', userType);

                setLoadingState(googleBtnSignup, true);

                try {
                    const provider = new GoogleAuthProvider();
                    const result = await signInWithPopup(auth, provider);
                    const user = result.user;

                    // Send email verification if email is available
                    try {
                        if (user.email) {
                            const actionCodeSettings = {
                                url: window.location.origin + '/auth',
                                handleCodeInApp: false
                            };
                            await sendEmailVerification(user, actionCodeSettings);
                            console.log('✉️ Email verification sent to:', user.email);
                            console.log('📧 Google verification email configured with URL:', actionCodeSettings.url);
                        }
                    } catch (verificationError) {
                        console.error('❌ Google email verification error:', verificationError);
                    }

                    const profileData = {
                        name: user.displayName || 'New User',
                        phone: '', // Removed phone number
                        userType
                    };

                    const response = await fetch('/api/auth/create-profile', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${await user.getIdToken()}`
                        },
                        body: JSON.stringify(profileData)
                    });

                    if (response.ok) {
                        localStorage.setItem('userToken', await user.getIdToken());
                        localStorage.setItem('userType', userType);
                        showMessage('Google signup successful! Please check your email for verification. Redirecting...', 'success');
                        setTimeout(() => redirectToDashboard(userType), 1500);
                    } else {
                        try {
                            if (user) await user.delete();
                            console.log('🧹 Cleaned up Firebase user due to profile creation failure.');
                        } catch (deleteError) {
                            console.error('❌ Failed to delete Firebase user after profile creation failure:', deleteError);
                        }
                        throw new Error('Failed to create profile after Google signup');
                    }
                } catch (error) {
                    console.error('Google signup error:', error);
                    let errorMessage = 'Error during Google signup.';
                    if (error.code === 'auth/account-exists-with-different-credential') {
                        errorMessage = 'An account with this email already exists. Please log in instead.';
                    } else if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage = 'Sign-in was cancelled. Please try again.';
                    } else {
                        errorMessage = error.message || errorMessage;
                    }
                    showMessage(errorMessage, 'error');
                } finally {
                    setLoadingState(googleBtnSignup, false);
                }
            });
        }

        // Google Login
        if (googleBtnLogin) {
            googleBtnLogin.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🌐 Initiating Google OAuth for login:', userType);

                setLoadingState(googleBtnLogin, true);

                try {
                    const provider = new GoogleAuthProvider();
                    const result = await signInWithPopup(auth, provider);
                    const user = result.user;
                    const token = await user.getIdToken();
                    localStorage.setItem('userToken', token);
                    localStorage.setItem('userType', userType);
                    showMessage('Google login successful! Redirecting...', 'success');
                    setTimeout(() => redirectToDashboard(userType), 1500);
                } catch (error) {
                    console.error('Google login error:', error);
                    let errorMessage = 'Error during Google login.';
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage = 'Sign-in was cancelled. Please try again.';
                    } else {
                        errorMessage = error.message || errorMessage;
                    }
                    showMessage(errorMessage, 'error');
                } finally {
                    setLoadingState(googleBtnLogin, false);
                }
            });
        }

        // Apple ID Sign Up
        if (appleBtnSignup) {
            appleBtnSignup.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🍎 Initiating Apple ID OAuth for signup:', userType);

                setLoadingState(appleBtnSignup, true);

                try {
                    const provider = new OAuthProvider('apple.com');
                    provider.addScope('email');
                    provider.addScope('name');

                    const result = await signInWithPopup(auth, provider);
                    const user = result.user;

                    // Send email verification if email is available
                    try {
                        if (user.email) {
                            const actionCodeSettings = {
                                url: window.location.origin + '/auth',
                                handleCodeInApp: false
                            };
                            await sendEmailVerification(user, actionCodeSettings);
                            console.log('✉️ Email verification sent to:', user.email);
                            console.log('📧 Apple verification email configured with URL:', actionCodeSettings.url);
                        }
                    } catch (verificationError) {
                        console.error('❌ Apple email verification error:', verificationError);
                    }

                    const profileData = {
                        name: user.displayName || 'New User',
                        phone: '', // Removed phone number
                        userType
                    };

                    const response = await fetch('/api/auth/create-profile', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${await user.getIdToken()}`
                        },
                        body: JSON.stringify(profileData)
                    });

                    if (response.ok) {
                        localStorage.setItem('userToken', await user.getIdToken());
                        localStorage.setItem('userType', userType);
                        showMessage('Apple ID signup successful! Please check your email for verification. Redirecting...', 'success');
                        setTimeout(() => redirectToDashboard(userType), 1500);
                    } else {
                        try {
                            if (user) await user.delete();
                        } catch (deleteError) {
                            console.error('❌ Failed to delete Firebase user:', deleteError);
                        }
                        throw new Error('Failed to create profile');
                    }
                } catch (error) {
                    console.error('Apple ID signup error:', error);
                    let errorMessage = 'Error during Apple ID signup.';
                    if (error.code === 'auth/account-exists-with-different-credential') {
                        errorMessage = 'An account with this email already exists. Please log in instead.';
                    } else if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage = 'Sign-in was cancelled. Please try again.';
                    } else {
                        errorMessage = error.message || errorMessage;
                    }
                    showMessage(errorMessage, 'error');
                } finally {
                    setLoadingState(appleBtnSignup, false);
                }
            });
        }

        // Apple ID Login
        if (appleBtnLogin) {
            appleBtnLogin.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🍎 Initiating Apple ID OAuth for login:', userType);

                setLoadingState(appleBtnLogin, true);

                try {
                    const provider = new OAuthProvider('apple.com');
                    provider.addScope('email');
                    provider.addScope('name');

                    const result = await signInWithPopup(auth, provider);
                    const user = result.user;
                    const token = await user.getIdToken();

                    localStorage.setItem('userToken', token);
                    localStorage.setItem('userType', userType);
                    showMessage('Apple ID login successful! Redirecting...', 'success');
                    setTimeout(() => redirectToDashboard(userType), 1500);
                } catch (error) {
                    console.error('Apple ID login error:', error);
                    let errorMessage = 'Error during Apple ID login.';
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorMessage = 'Sign-in was cancelled. Please try again.';
                    } else {
                        errorMessage = error.message || errorMessage;
                    }
                    showMessage(errorMessage, 'error');
                } finally {
                    setLoadingState(appleBtnLogin, false);
                }
            });
        }
    }

    // Check if user is already logged in and redirect if on auth page
    onAuthStateChanged(auth, (user) => {
        if (user && window.location.pathname.includes('auth.html')) {
            console.log('👤 User already signed in, redirecting to dashboard.');
            const storedUserType = localStorage.getItem('userType');
            const typeForRedirect = storedUserType || userType;
            redirectToDashboard(typeForRedirect);
        } else if (!user && (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('dashboard'))) {
            console.log('👤 User not signed in, redirecting to auth.');
            window.location.href = '/auth';
        }
    });

    // Phone Authentication Functions
    window.openPhoneModal = function(type) {
        console.log('📱 Opening phone modal for:', type);
        phoneAuthType = type;
        
        // Reset modal state
        document.getElementById('phoneAuthModal').style.display = 'flex';
        document.getElementById('phone-step-1').style.display = 'block';
        document.getElementById('phone-step-2').style.display = 'none';
        document.getElementById('phone-step-3').style.display = 'none';
        
        // Clear previous inputs
        const phoneNumberInput = document.getElementById('phoneNumber');
        const otpCodeInput = document.getElementById('otpCode');
        const phoneUserNameInput = document.getElementById('phoneUserName');
        
        if (phoneNumberInput) phoneNumberInput.value = '';
        if (otpCodeInput) otpCodeInput.value = '';
        if (phoneUserNameInput) phoneUserNameInput.value = '';
        
        // Reset confirmation result
        confirmationResult = null;
        
        // Setup reCAPTCHA with a small delay to ensure DOM is ready
        setTimeout(() => {
            setupRecaptcha();
        }, 100);
    };

    window.closePhoneModal = function() {
        console.log('❌ Closing phone modal and cleaning up');
        document.getElementById('phoneAuthModal').style.display = 'none';
        
        // Clean up reCAPTCHA
        if (recaptchaVerifier) {
            try {
                recaptchaVerifier.clear();
            } catch (e) {
                console.log('reCAPTCHA already cleared');
            }
            recaptchaVerifier = null;
        }
        
        // Clear confirmation result
        confirmationResult = null;
        
        // Clear form inputs
        const phoneNumberInput = document.getElementById('phoneNumber');
        const otpCodeInput = document.getElementById('otpCode');
        const phoneUserNameInput = document.getElementById('phoneUserName');
        
        if (phoneNumberInput) phoneNumberInput.value = '';
        if (otpCodeInput) otpCodeInput.value = '';
        if (phoneUserNameInput) phoneUserNameInput.value = '';
        
        // Reset to first step
        document.getElementById('phone-step-1').style.display = 'block';
        document.getElementById('phone-step-2').style.display = 'none';
        document.getElementById('phone-step-3').style.display = 'none';
    };

    function setupRecaptcha() {
        if (recaptchaVerifier) {
            try {
                recaptchaVerifier.clear();
            } catch (e) {
                console.log('reCAPTCHA already cleared or not initialized');
            }
            recaptchaVerifier = null;
        }

        try {
            // Clear any existing reCAPTCHA container content
            const recaptchaContainer = document.getElementById('recaptcha-container');
            if (recaptchaContainer) {
                recaptchaContainer.innerHTML = '';
            }

            recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    console.log('✅ reCAPTCHA solved:', response);
                    // Enable send OTP button
                    const sendBtn = document.getElementById('sendOtpBtn');
                    if (sendBtn) {
                        sendBtn.disabled = false;
                        sendBtn.style.opacity = '1';
                    }
                },
                'expired-callback': () => {
                    console.log('⏰ reCAPTCHA expired');
                    showMessage('reCAPTCHA expired. Please solve it again.', 'error');
                    // Disable send OTP button
                    const sendBtn = document.getElementById('sendOtpBtn');
                    if (sendBtn) {
                        sendBtn.disabled = true;
                        sendBtn.style.opacity = '0.6';
                    }
                },
                'error-callback': (error) => {
                    console.error('❌ reCAPTCHA error:', error);
                    showMessage('reCAPTCHA error. Please refresh and try again.', 'error');
                }
            });

            // Render reCAPTCHA and handle any errors
            recaptchaVerifier.render().then((widgetId) => {
                console.log('✅ reCAPTCHA rendered successfully with widget ID:', widgetId);
                // Initially disable the send button until reCAPTCHA is solved
                const sendBtn = document.getElementById('sendOtpBtn');
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.style.opacity = '0.6';
                }
            }).catch(error => {
                console.error('❌ reCAPTCHA render error:', error);
                showMessage('reCAPTCHA failed to load. Please refresh the page and try again.', 'error');
            });

        } catch (error) {
            console.error('❌ reCAPTCHA setup error:', error);
            showMessage('Phone authentication is currently unavailable. Please use email signup instead.', 'error');
        }
    }

    window.sendOTP = async function() {
        const phoneNumberInput = document.getElementById('phoneNumber');
        const countryCode = document.getElementById('countryCode').value;
        const phoneNumber = phoneNumberInput.value.trim();

        // Validate phone number format
        if (!phoneNumber) {
            showMessage('Please enter a valid phone number', 'error');
            return;
        }

        // Basic phone number validation
        const phoneRegex = /^[0-9]{6,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
            showMessage('Please enter a valid phone number (6-15 digits)', 'error');
            return;
        }

        const fullPhoneNumber = countryCode + phoneNumber;
        console.log('📱 Attempting to send OTP to:', fullPhoneNumber);

        const sendBtn = document.getElementById('sendOtpBtn');
        setLoadingState(sendBtn, true);
        sendBtn.textContent = 'Sending OTP...';

        try {
            // Check if reCAPTCHA is solved
            if (!recaptchaVerifier) {
                throw new Error('reCAPTCHA not initialized. Please refresh the page.');
            }

            confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifier);
            console.log('✅ OTP sent successfully to:', fullPhoneNumber);

            document.getElementById('phone-step-1').style.display = 'none';
            document.getElementById('phone-step-2').style.display = 'block';
            document.getElementById('sentPhoneNumber').textContent = fullPhoneNumber;

            showMessage('OTP sent successfully! Check your messages.', 'success');
        } catch (error) {
            console.error('❌ Error sending OTP:', error);
            let errorMessage = 'Failed to send OTP. Please try again.';

            switch (error.code) {
                case 'auth/invalid-phone-number':
                    errorMessage = 'Invalid phone number format. Please check and try again.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many requests. Please wait before trying again.';
                    break;
                case 'auth/captcha-check-failed':
                    errorMessage = 'reCAPTCHA verification failed. Please solve the reCAPTCHA and try again.';
                    break;
                case 'auth/quota-exceeded':
                    errorMessage = 'SMS quota exceeded. Please try again later or use email signup.';
                    break;
                case 'auth/missing-phone-number':
                    errorMessage = 'Phone number is required.';
                    break;
                case 'auth/invalid-app-credential':
                    errorMessage = 'App not properly configured for phone authentication.';
                    break;
                default:
                    if (error.message.includes('reCAPTCHA')) {
                        errorMessage = 'reCAPTCHA verification required. Please solve the reCAPTCHA first.';
                    } else if (error.message.includes('domain')) {
                        errorMessage = 'Domain not authorized for phone authentication. Please contact support.';
                    } else {
                        errorMessage = error.message || errorMessage;
                    }
            }

            showMessage(errorMessage, 'error');
            
            // Reset reCAPTCHA for retry
            setTimeout(() => {
                setupRecaptcha();
            }, 1000);
        } finally {
            setLoadingState(sendBtn, false);
            sendBtn.textContent = 'Send OTP';
        }
    };

    window.verifyOTP = async function() {
        const otpCode = document.getElementById('otpCode').value.trim();

        if (!otpCode) {
            showMessage('Please enter the OTP code', 'error');
            return;
        }

        if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
            showMessage('Please enter a valid 6-digit OTP', 'error');
            return;
        }

        if (!confirmationResult) {
            showMessage('No OTP session found. Please request a new OTP.', 'error');
            return;
        }

        const verifyBtn = document.getElementById('verifyOtpBtn');
        setLoadingState(verifyBtn, true);
        verifyBtn.textContent = 'Verifying...';

        try {
            console.log('🔍 Verifying OTP code:', otpCode);
            const result = await confirmationResult.confirm(otpCode);
            const user = result.user;
            console.log('✅ OTP verified successfully for user:', user.uid);

            if (phoneAuthType === 'signup') {
                // For signup, go to profile completion step
                document.getElementById('phone-step-2').style.display = 'none';
                document.getElementById('phone-step-3').style.display = 'block';
                document.getElementById('phoneUserName').value = user.displayName || ''; // Pre-fill name if available
                showMessage('Phone verified! Please complete your profile.', 'success');
            } else {
                // For login, redirect directly
                const idToken = await user.getIdToken();
                localStorage.setItem('userToken', idToken);
                localStorage.setItem('userType', userType);
                showMessage('Phone login successful! Redirecting...', 'success');
                closePhoneModal();
                setTimeout(() => redirectToDashboard(userType), 1500);
            }
        } catch (error) {
            console.error('❌ Error verifying OTP:', error);
            let errorMessage = 'Invalid OTP. Please try again.';

            switch (error.code) {
                case 'auth/invalid-verification-code':
                    errorMessage = 'Invalid verification code. Please check and try again.';
                    break;
                case 'auth/code-expired':
                    errorMessage = 'OTP has expired. Please request a new one.';
                    break;
                case 'auth/session-expired':
                    errorMessage = 'Session expired. Please request a new OTP.';
                    break;
                case 'auth/invalid-verification-id':
                    errorMessage = 'Invalid verification session. Please request a new OTP.';
                    break;
                case 'auth/missing-verification-code':
                    errorMessage = 'Please enter the verification code.';
                    break;
                default:
                    errorMessage = error.message || errorMessage;
            }

            showMessage(errorMessage, 'error');
        } finally {
            setLoadingState(verifyBtn, false);
            verifyBtn.textContent = 'Verify OTP';
        }
    };

    window.completePhoneProfile = async function() {
        const userName = document.getElementById('phoneUserName').value.trim();

        if (!userName) {
            showMessage('Please enter your name', 'error');
            return;
        }

        const completeBtn = document.getElementById('completeProfileBtn');
        setLoadingState(completeBtn, true);
        completeBtn.textContent = 'Creating Profile...';

        try {
            const user = auth.currentUser;
            const idToken = await user.getIdToken();

            const profileData = {
                name: userName,
                phone: user.phoneNumber, // Keep phone number here as it's from phone auth
                userType
            };

            const response = await fetch('/api/auth/create-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                localStorage.setItem('userToken', idToken);
                localStorage.setItem('userType', userType);
                showMessage('Profile created successfully! Redirecting...', 'success');
                setTimeout(() => redirectToDashboard(userType), 1500);
            } else {
                throw new Error('Failed to create profile');
            }
        } catch (error) {
            console.error('Error completing profile:', error);
            showMessage('Failed to create profile. Please try again.', 'error');
        } finally {
            setLoadingState(completeBtn, false);
            completeBtn.textContent = 'Complete Registration';
        }
    };

    window.resendOTP = async function() {
        const resendBtn = document.getElementById('resendOtpBtn');
        setLoadingState(resendBtn, true);
        resendBtn.textContent = 'Resending...';

        try {
            console.log('🔄 Resending OTP...');
            
            // Clear current confirmation result
            confirmationResult = null;
            
            // Go back to step 1 to resend
            document.getElementById('phone-step-2').style.display = 'none';
            document.getElementById('phone-step-1').style.display = 'block';
            
            // Clear OTP input
            const otpCodeInput = document.getElementById('otpCode');
            if (otpCodeInput) otpCodeInput.value = '';
            
            // Setup new reCAPTCHA
            setTimeout(() => {
                setupRecaptcha();
                showMessage('Please solve reCAPTCHA and send OTP again', 'info');
            }, 500);
            
        } finally {
            setLoadingState(resendBtn, false);
            resendBtn.textContent = 'Resend OTP';
        }
    };

    // Password Reset Functionality
    if (forgotPasswordBtn && passwordResetModal && closePasswordResetModalBtn && passwordResetForm) {
        forgotPasswordBtn.addEventListener('click', (e) => {
            e.preventDefault();
            passwordResetModal.style.display = 'flex';
            console.log('🔑 Password reset modal opened');
        });

        closePasswordResetModalBtn.addEventListener('click', () => {
            passwordResetModal.style.display = 'none';
        });

        passwordResetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resetEmailField = document.getElementById('resetEmail');
            const resetEmail = resetEmailField.value.trim();

            if (!resetEmail) {
                showMessage('Please enter your email address.', 'error');
                return;
            }

            const resetBtn = passwordResetForm.querySelector('button[type="submit"]');
            setLoadingState(resetBtn, true);
            resetBtn.textContent = 'Sending reset link...';

            try {
                const actionCodeSettings = {
                    url: window.location.origin + '/auth',
                    handleCodeInApp: false
                };
                await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
                showMessage('Password reset email sent! Please check your inbox and spam folder.', 'success');
                passwordResetModal.style.display = 'none';
                resetEmailField.value = '';
            } catch (error) {
                console.error('Password reset error:', error);
                let errorMessage = 'Failed to send password reset email.';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No user found with that email address.';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Please enter a valid email address.';
                }
                showMessage(errorMessage, 'error');
            } finally {
                setLoadingState(resetBtn, false);
                resetBtn.textContent = 'Send Reset Link';
            }
        });
    }


    // Add phone button event listeners
    function setupPhoneAuth() {
        const phoneBtnSignup = document.getElementById('phoneBtnSignup');
        const phoneBtnLogin = document.getElementById('phoneBtnLogin');
        const sendOtpBtn = document.getElementById('sendOtpBtn');
        const verifyOtpBtn = document.getElementById('verifyOtpBtn');
        const completeProfileBtn = document.getElementById('completeProfileBtn');
        const resendOtpBtn = document.getElementById('resendOtpBtn');

        if (phoneBtnSignup) {
            phoneBtnSignup.addEventListener('click', () => openPhoneModal('signup'));
        }

        if (phoneBtnLogin) {
            phoneBtnLogin.addEventListener('click', () => openPhoneModal('login'));
        }

        if (sendOtpBtn) {
            sendOtpBtn.addEventListener('click', sendOTP);
        }

        if (verifyOtpBtn) {
            verifyOtpBtn.addEventListener('click', verifyOTP);
        }

        if (completeProfileBtn) {
            completeProfileBtn.addEventListener('click', completePhoneProfile);
        }

        if (resendOtpBtn) {
            resendOtpBtn.addEventListener('click', resendOTP);
        }
    }

    // Resend verification email function
    window.resendVerificationEmail = async function() {
        if (!window.pendingVerificationUser) {
            showMessage('Please try logging in again.', 'error');
            return;
        }

        try {
            const actionCodeSettings = {
                url: window.location.origin + '/auth',
                handleCodeInApp: true
            };
            await sendEmailVerification(window.pendingVerificationUser, actionCodeSettings);
            showMessage('Verification email sent! Please check your inbox.', 'success');
        } catch (error) {
            console.error('Error resending verification:', error);
            showMessage('Failed to resend verification email. Please try again.', 'error');
        }
    };

    // Initialize everything
    console.log('🚀 Initializing auth page...');
    setupSocialLogin();
    setupPhoneAuth();
    console.log('✅ Auth page initialization complete');

    // Set initial form based on URL parameter
    const formType = urlParams.get('form');
    if (formType === 'signup' && container) {
        container.classList.add('active');
    }
});