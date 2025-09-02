
// Email verification and password management utilities
import { getAuth, sendEmailVerification, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const auth = getAuth();

// Send email verification
export async function sendVerificationEmail(user) {
    try {
        await sendEmailVerification(user);
        return { success: true, message: 'Verification email sent successfully!' };
    } catch (error) {
        console.error('Email verification error:', error);
        return { success: false, message: 'Failed to send verification email.' };
    }
}

// Update email address
export async function changeEmailAddress(newEmail, currentPassword) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user logged in');

        // Re-authenticate user before changing email
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        await updateEmail(user, newEmail);
        await sendEmailVerification(user);
        
        return { success: true, message: 'Email updated successfully! Please verify your new email.' };
    } catch (error) {
        console.error('Email update error:', error);
        let errorMessage = 'Failed to update email.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already in use.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect.';
        }
        return { success: false, message: errorMessage };
    }
}

// Update password
export async function changePassword(currentPassword, newPassword) {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('No user logged in');

        // Re-authenticate user before changing password
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        
        await updatePassword(user, newPassword);
        
        return { success: true, message: 'Password updated successfully!' };
    } catch (error) {
        console.error('Password update error:', error);
        let errorMessage = 'Failed to update password.';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak.';
        }
        return { success: false, message: errorMessage };
    }
}
