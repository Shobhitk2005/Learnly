
// Email verification and password management utilities
import { 
    getAuth, 
    sendEmailVerification, 
    updatePassword, 
    EmailAuthProvider, 
    reauthenticateWithCredential,
    sendPasswordResetEmail 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const auth = getAuth();

// Send email verification
export async function sendVerificationEmail() {
    try {
        const user = auth.currentUser;
        if (user && !user.emailVerified) {
            await sendEmailVerification(user);
            return { success: true, message: 'Verification email sent!' };
        } else if (user && user.emailVerified) {
            return { success: false, message: 'Email is already verified!' };
        } else {
            return { success: false, message: 'No user signed in!' };
        }
    } catch (error) {
        console.error('Email verification error:', error);
        return { success: false, message: 'Failed to send verification email.' };
    }
}

// Change password
export async function changePassword(currentPassword, newPassword) {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, message: 'No user signed in!' };
        }

        // Re-authenticate user first
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        // Update password
        await updatePassword(user, newPassword);
        return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
        console.error('Password change error:', error);
        let errorMessage = 'Failed to change password.';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak.';
        }
        return { success: false, message: errorMessage };
    }
}

// Check email verification status
export function checkEmailVerification() {
    const user = auth.currentUser;
    return user ? user.emailVerified : false;
}
