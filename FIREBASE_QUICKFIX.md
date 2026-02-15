# ⚡ Quick Fix - Firebase Permissions

## 🔥 Firebase Console Steps (5 minutes)

### Step 1: Enable Anonymous Authentication

```
Firebase Console → Authentication → Sign-in method
→ Anonymous → Toggle ON → Save
```

### Step 2: Update Security Rules

```
Firebase Console → Firestore Database → Rules
→ Copy rules below → Publish
```

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }

    match /conversations/{conversationId} {
      allow read, write: if isAuthenticated();

      match /messages/{messageId} {
        allow read, write: if isAuthenticated();
      }
    }

    match /messages/{messageId} {
      allow read, write: if isAuthenticated();
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## ✅ Done!

Reload your app - permission errors should be gone.

## 🔗 Links

- Firebase Console: https://console.firebase.google.com/
- Your Project: realtime-chat-7daae

## 📝 What Changed?

- ✅ Added Firebase anonymous authentication
- ✅ Chat functionality now authenticates before querying Firestore
- ✅ Security rules allow authenticated users

## ⚠️ Note

Current setup uses anonymous auth for quick fix. For production, implement custom tokens linked to your backend user IDs. See full guide in `FIREBASE_CHAT_PERMISSIONS_FIX.md`.
