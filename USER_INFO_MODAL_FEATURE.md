# Chat Header User Info Modal Feature

## Overview

Added a clickable chat header that opens a modal displaying user information with block and delete functionality.

## Changes Made

### 1. **Chat.jsx** - Component Logic

#### New State

```javascript
const [showUserInfoModal, setShowUserInfoModal] = useState(false);
```

#### New Functions

- **`handleOpenUserInfo()`**: Opens user info modal for individual chats, or group info modal for groups
- **`handleBlockUser()`**: Blocks a user and deletes the conversation (with confirmation)

#### Updated Chat Header

- Made `chat__header-info` clickable with `onClick={handleOpenUserInfo}`
- Added cursor pointer and title attribute for better UX
- Automatically routes to group info modal for group chats

#### New Modal - User Info Modal

Displays:

- **Large avatar** with user's initial
- **User name** and online status
- **Email** and **Role** information
- **Block User** button (yellow/warning style)
- **Delete Conversation** button (red/danger style)

### 2. **Chat.scss** - Styling

#### Updated Header Styles

```scss
&__header-info {
  // Added hover effect and padding
  border-radius: 8px;
  padding: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
  }
}
```

#### New User Info Modal Styles

```scss
.user-info-modal {
  // Contains three sections:

  .user-info-header {
    // 80px circular avatar with gradient
    // User name and online status indicator
  }

  .user-info-details {
    // Email and Role in info items
    // Clean, organized layout
  }

  .user-info-actions {
    // Block and Delete buttons
    // Full-width, stacked layout
    // Distinct colors for each action
  }
}
```

### 3. **Icons Added**

- Imported `FaBan` from react-icons for the block functionality

## Usage

### Opening the Modal

1. **Individual Chat**: Click anywhere on the chat header (avatar + name area)
2. **Group Chat**: Clicking the header opens the existing group info modal

### Modal Features

- **User Information**: View email and role of the team member
- **Block User**: Blocks the user and deletes the conversation (requires confirmation)
- **Delete Conversation**: Removes the conversation permanently (requires confirmation)

## User Experience Improvements

- ✅ Visual hover feedback on header (background changes to light gray)
- ✅ Cursor changes to pointer indicating clickability
- ✅ Clear visual hierarchy in the modal
- ✅ Confirmation dialogs prevent accidental blocks/deletes
- ✅ Color-coded action buttons (yellow for block, red for delete)
- ✅ Consistent design with existing modals

## Technical Notes

- Uses existing `useConfirm` hook for confirmation dialogs
- Integrates with Firestore for conversation deletion
- Fetches team member info from the `teamMembers` state
- Modal follows the same pattern as other modals (New Chat, Group Info, etc.)
- Responsive and mobile-friendly

## Future Enhancements (Optional)

- Implement actual block functionality (beyond conversation deletion)
- Add unblock feature
- Display last seen/online status
- Add more user actions (mute, pin, etc.)
- Show shared media/files in the user info modal
