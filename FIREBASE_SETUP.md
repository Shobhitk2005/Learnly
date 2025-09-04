
# Firebase Configuration Setup

## Step 1: Get Your Firebase Credentials

1. Go to your Firebase Console (https://console.firebase.google.com)
2. Select your project
3. Click on the gear icon (Settings) → Project settings
4. Scroll down to "Your apps" section
5. Click on the web app (</> icon) or create one if you haven't
6. Copy the config object values

## Step 2: Update the .env file

Replace the placeholder values in `.env` with your actual Firebase credentials:

```
FIREBASE_API_KEY=your_actual_api_key_here
FIREBASE_AUTH_DOMAIN=your_actual_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_actual_project_id
FIREBASE_STORAGE_BUCKET=your_actual_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
FIREBASE_APP_ID=your_actual_app_id
```

## Step 3: Restart Your Application

After updating the .env file, restart your application by clicking the "Run" button.

## Security Notes

- Never commit the .env file to version control
- The .env file is already added to .gitignore
- Your credentials are now securely stored on the server side
- The frontend only receives the necessary config values via API
