import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaPaperPlane, FaImage, FaPaperclip, FaPhone, FaVideo, 
  FaTimes, FaMicrophone, FaUsers, FaUser,
  FaUserPlus, FaUserMinus, FaTrash, FaReply,
  FaShare, FaCheck, FaCheckDouble, FaCrown, FaSignOutAlt,
  FaSearch, FaInfoCircle, FaClock, FaHistory, FaCheckSquare, FaDownload,
  FaBan, FaEnvelope, FaBriefcase
} from 'react-icons/fa';
import { FaArrowLeft } from 'react-icons/fa';
import { FaRegCopy } from 'react-icons/fa';
import { FaEllipsisV } from 'react-icons/fa';
import './Chat.scss';
import Modal from '../components/Modal/Modal';
import { storage } from '../utils/storage';
import useConfirm from '../hooks/useConfirm';
import { showToast } from '../utils/toast';
import { STORAGE_KEYS, API_BASE_URL, API_ENDPOINTS } from '../utils/constants';
import { apiHelper } from '../utils/api';
import * as chatApi from '../utils/chatApi';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDocs,
  getDoc,
  writeBatch,
  deleteField
} from 'firebase/firestore';
import { signInAnonymouslyToFirebase, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { setChatUnreadCount } from '../redux/slices/uiSlice';

const Chat = () => {
  const [message, setMessage] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [messageContextMenu, setMessageContextMenu] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messagesToForward, setMessagesToForward] = useState([]);
  const [lastResetTime, setLastResetTime] = useState(Date.now());
  const [showAutoResetNotice, setShowAutoResetNotice] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showResetInfoModal, setShowResetInfoModal] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStreamRef = useRef(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef(null);
  
  // Get current logged-in user from Redux
  const authUser = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  // Helper to normalize user ID - prefer email as it's most consistent
  const normalizeUserId = (user) => {
    if (!user) return 'anonymous';
    // Prefer email as primary identifier for consistency
    return user.email || user.id || user._id || 'anonymous';
  };
  const currentUserId = normalizeUserId(authUser);
  const currentUserName = authUser?.name || authUser?.email || 'You';

  // Helper to get the other participant's info from a conversation
  // Priority: 1) teamMembers lookup (only show details if they're in your team), 2) Show as "Unknown User"
  const getOtherParticipantInfo = (conv, teamMembersList = []) => {
    if (!conv) return null;
    
    // Find the other participant (not current user)
    const otherParticipantId = conv.participants?.find(p => p !== currentUserId) || conv.memberId || conv.memberEmail;
    
    // FIRST: Check if the other participant is in current user's team members list
    // This ensures you only see full details of people you've added as team members
    const memberFromTeam = teamMembersList.find(m => 
      (m.id || m._id) === conv.memberId || 
      m.email === conv.memberEmail ||
      (m.id || m._id) === otherParticipantId ||
      m.email === otherParticipantId
    );
    
    if (memberFromTeam) {
      // They're in your team - show full details
      return {
        id: memberFromTeam.id || memberFromTeam._id,
        name: memberFromTeam.name,
        email: memberFromTeam.email,
        phone: memberFromTeam.phone || '',
        role: memberFromTeam.role || '',
        isInTeam: true
      };
    }
    
    // NOT in team members - show as Unknown User but still show real email
    // The email is needed for chat functionality and should always be visible
    let realEmail = '';
    
    // Try to get email from various sources
    if (conv.memberEmail) {
      realEmail = conv.memberEmail;
    } else if (otherParticipantId && otherParticipantId.includes('@')) {
      // If otherParticipantId is an email
      realEmail = otherParticipantId;
    } else if (conv.participantsInfo && otherParticipantId && conv.participantsInfo[otherParticipantId]) {
      realEmail = conv.participantsInfo[otherParticipantId].email || '';
    }
    
    // Also check participants array for email format
    if (!realEmail && conv.participants) {
      const emailParticipant = conv.participants.find(p => p !== currentUserId && p.includes('@'));
      if (emailParticipant) realEmail = emailParticipant;
    }
    
    return {
      id: otherParticipantId || conv.memberId,
      name: 'Unknown User',
      email: realEmail,
      phone: '',
      role: '',
      isInTeam: false
    };
  };
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [firebaseUser, setFirebaseUser] = useState(null);

  // Search query for the "Start New Chat" modal member list
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');

  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [mobileShowMain, setMobileShowMain] = useState(false);
  const confirm = useConfirm();
  const messagesContainerRef = useRef(null);
  
  // User info modal state
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);

  const isSupportedAttachment = (attachment) => {
    if (!attachment) return false;
    const typeValue = (attachment.type || attachment.mimeType || '').toString().toLowerCase();
    const mime = (attachment.mimeType || attachment.type || '').toString().toLowerCase();
    const fileName = (attachment.name || '').toString().toLowerCase();

    const isImage = typeValue.startsWith('image/') || mime.startsWith('image/') || typeValue === 'image';
    if (isImage) return true;

    const isAudio = typeValue.startsWith('audio/') || mime.startsWith('audio/') || typeValue === 'audio';
    if (isAudio) return true;

    const isPdfMime = typeValue === 'application/pdf' || mime === 'application/pdf';
    const isPdfByName = fileName.endsWith('.pdf');
    if (isPdfMime || isPdfByName) return true;

    if (typeValue === 'file' && fileName.endsWith('.pdf')) return true;
    if (typeValue === 'pdf') return true;

    return false;
  };

  const normalizeMediaItems = (media) => {
    if (!media) return null;
    const mediaArray = Array.isArray(media) ? media : [media];
    const filtered = mediaArray.filter(isSupportedAttachment);
    if (filtered.length === 0) return null;
    return filtered.length === 1 ? filtered[0] : filtered;
  };

  // Load team members and conversations from Firestore with real-time sync
  useEffect(() => {
    if (!currentUserId || currentUserId === 'anonymous') return;

    // Ensure user is signed into Firebase Auth for Firestore access
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
      } else {
        // Sign in anonymously to Firebase if not already signed in
        try {
          const fbUser = await signInAnonymouslyToFirebase();
          setFirebaseUser(fbUser);
        } catch (error) {
          console.error('Failed to authenticate with Firebase:', error);
        }
      }
    });

    const fetchTeamMembers = async () => {
      try {
        // Load team members from backend
        const loadedMembers = await apiHelper.get('/team');
        console.log('Team members loaded:', loadedMembers.map(m => ({ id: m.id, _id: m._id, name: m.name, email: m.email })));
        setTeamMembers(loadedMembers);
      } catch (error) {
        console.error('Error fetching team members:', error);
        const loadedMembers = storage.getJSON(STORAGE_KEYS.TEAM, []);
        setTeamMembers(loadedMembers);
      }
    };

    fetchTeamMembers();

    return () => {
      unsubscribeAuth();
      // Cleanup: stop any ongoing recording on unmount
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingStreamRef.current) {
        recordingStreamRef.current.getTracks()?.forEach(t => t.stop());
      }
    };
  }, [currentUserId]);

  // Real-time listener for conversations - only set up after Firebase user is authenticated
  useEffect(() => {
    if (!currentUserId || currentUserId === 'anonymous' || !firebaseUser) return;

    // Real-time listener for conversations where current user is a participant
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );

    const unsubscribeConversations = onSnapshot(conversationsQuery, (snapshot) => {
      const convos = snapshot.docs.map(doc => {
        const data = doc.data();
        // Get unread count for current user only (from unreadBy object)
        const unreadForCurrentUser = data.unreadBy?.[currentUserId] || 0;
        return {
          id: doc.id,
          ...data,
          unread: unreadForCurrentUser, // Override with user-specific unread count
          lastMessageTime: data.lastMessageTime?.toDate ? data.lastMessageTime.toDate().toISOString() : data.lastMessageTime
        };
      });
      console.log('Conversations loaded for user', currentUserId, ':', convos.length, 'conversations');
      console.log('Conversation participants:', convos.map(c => ({ id: c.id, participants: c.participants })));
      setConversations(convos);
      storage.setJSON(STORAGE_KEYS.CONVERSATIONS, convos);
    }, (error) => {
      console.error('Firestore conversations listener error:', error);
      // Fallback to backend
      chatApi.getConversations().then(backendConvos => {
        setConversations(backendConvos);
      }).catch(() => {
        const existingConvos = storage.getJSON(STORAGE_KEYS.CONVERSATIONS, []);
        setConversations(existingConvos);
      });
    });

    return () => unsubscribeConversations();
  }, [currentUserId, firebaseUser]);

  // Save conversations to storage as backup (backend is primary)
  useEffect(() => {
    if (conversations.length > 0) {
      storage.setJSON(STORAGE_KEYS.CONVERSATIONS, conversations);
    }
  }, [conversations]);

  // Save messages to storage as backup
  useEffect(() => {
    if (Object.keys(messagesByConversation).length > 0) {
      storage.setJSON(STORAGE_KEYS.CHAT_MESSAGES, messagesByConversation);
    }
  }, [messagesByConversation]);

// Load messages when conversation changes with Firestore Real-time listener
  useEffect(() => {
    if (!activeConversation) return;
    
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', activeConversation),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore timestamp to ISO string for compatibility with existing code
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          isOwn: data.senderId === currentUserId
        };
      });

      const sanitizedMessages = messages.map((msg) => ({
        ...msg,
        media: normalizeMediaItems(msg.media)
      }));

      setMessagesByConversation(prev => ({
        ...prev,
        [activeConversation]: sanitizedMessages
      }));
    }, (error) => {
      console.error("Firestore listener error:", error);
      
      // If index is building, try without orderBy as fallback
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log("Index building - loading messages without sorting...");
        const fallbackQuery = query(
          collection(db, 'messages'),
          where('conversationId', '==', activeConversation)
        );
        
        onSnapshot(fallbackQuery, (snapshot) => {
          const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
              isOwn: data.senderId === currentUserId
            };
          });

          const sanitizedMessages = messages.map((msg) => ({
            ...msg,
            media: normalizeMediaItems(msg.media)
          }));

          setMessagesByConversation(prev => ({
            ...prev,
            [activeConversation]: sanitizedMessages
          }));
        });
      } else {
        // Fallback to local storage for other errors
        const backup = storage.getJSON(STORAGE_KEYS.CHAT_MESSAGES, {})[activeConversation] || [];
        setMessagesByConversation(prev => ({
          ...prev,
          [activeConversation]: backup
        }));
      }
    });

    return () => unsubscribe();
  }, [activeConversation, currentUserId]);

  // Auto-reset chat every 30 days
  useEffect(() => {
    const checkAndResetChat = async () => {
      const now = Date.now();
      const timeSinceLastReset = now - lastResetTime;
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (timeSinceLastReset >= thirtyDays) {
        try {
          // Delete all messages from Firebase
          const batch = writeBatch(db);
          let deleteCount = 0;

          for (const conv of conversations) {
            // Delete all messages in this conversation from Firestore
            const messagesQuery = query(
              collection(db, 'messages'),
              where('conversationId', '==', conv.id)
            );
            const messagesSnapshot = await getDocs(messagesQuery);
            
            messagesSnapshot.forEach((messageDoc) => {
              batch.delete(messageDoc.ref);
              deleteCount++;
            });

            // Delete the conversation from Firestore
            const convRef = doc(db, 'conversations', conv.id);
            batch.delete(convRef);
          }

          // Commit all deletions
          await batch.commit();
          console.log(`Auto-reset: Deleted ${deleteCount} messages and ${conversations.length} conversations from Firebase`);

          // Clear local state
          setConversations([]);
          setMessagesByConversation({});
          storage.remove(STORAGE_KEYS.CHAT_CONVERSATIONS);
          storage.remove(STORAGE_KEYS.CHAT_MESSAGES);

          setLastResetTime(now);
          setShowAutoResetNotice(true);
          
          // Hide notice after 5 seconds
          setTimeout(() => setShowAutoResetNotice(false), 5000);
        } catch (error) {
          console.error('Failed to auto-reset chat:', error);
          showToast('Failed to auto-reset chat. Please try again later.', 'error');
        }
      }
    };

    // Check immediately on mount
    checkAndResetChat();

    // Check every hour
    const interval = setInterval(checkAndResetChat, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [lastResetTime, conversations, messagesByConversation]);

  // Calculate time until next reset
  const getTimeUntilReset = () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const timeSinceLastReset = Date.now() - lastResetTime;
    const timeRemaining = thirtyDays - timeSinceLastReset;
    
    if (timeRemaining <= 0) return 'Resetting soon...';
    
    const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    return `${days}d ${hours}h`;
  };

  // Format timestamps into readable strings. Prefer ISO timestamp inputs.
  const formatTimestamp = (input) => {
    if (!input) return '';
    const d = (typeof input === 'string' || typeof input === 'number') ? new Date(input) : input;
    if (!(d instanceof Date) || isNaN(d)) return '';

    const pad = (n) => String(n).padStart(2, '0');
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const timeStr = `${hours}:${minutes}`;

    const today = new Date();
    if (today.toDateString() === d.toDateString()) return `Today ${timeStr}`;

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (yesterday.toDateString() === d.toDateString()) return `Yesterday ${timeStr}`;

    // For older dates include localized date + time
    try {
      const dateStr = d.toLocaleDateString();
      return `${dateStr} ${timeStr}`;
    } catch (err) {
      return `${d.toISOString().split('T')[0]} ${timeStr}`;
    }
  };

  const getConversationDisplayTime = (conv) => {
    try {
      const msgs = messagesByConversation[conv.id];
      if (msgs && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.createdAt) return formatTimestamp(lastMsg.createdAt);
        if (lastMsg.timestamp) return formatTimestamp(lastMsg.timestamp);
        // If only a time string is present, assume same-day
        if (lastMsg.time) return `Today ${lastMsg.time.replace(':', ':')}`;
      }

      // Try common conversation timestamp fields returned by various backends
      const possibleFields = ['lastMessageAt','lastActivityAt','updatedAt','lastUpdated','last_message_at','last_message_time','lastMessageCreatedAt','lastMessageTime','time'];
      for (const f of possibleFields) {
        const val = conv[f];
        if (!val) continue;
        // If the value is the literal string 'Now' or similar, just return 'Now'
        if (typeof val === 'string' && val.trim().toLowerCase() === 'now') return 'Now';
        const parsed = Date.parse(val);
        if (!isNaN(parsed)) return formatTimestamp(parsed);
        // If field looks like a simple time (eg. "14:05"), show as Today 14:05
        if (typeof val === 'string' && /^\d{1,2}:\d{2}$/.test(val.trim())) return `Today ${val.trim()}`;
      }

      // Fallback to conv.time (could be friendly string) or empty
      if (conv.time) return conv.time;
      return '';
    } catch (err) {
      return '';
    }
  };

  // Compute a friendly preview for the conversation list.
  // Prefer the last loaded message (from `messagesByConversation`) and
  // fall back to `conv.lastMessage` while sanitizing common media markers
  // like "img", "image", "media" to more user-friendly labels.
  const getConversationPreview = (conv) => {
    try {
      const msgs = messagesByConversation[conv.id];
      
      // If we have loaded the messages and there are none, show empty state
      if (msgs !== undefined && (!msgs || msgs.length === 0)) {
        return 'No messages yet';
      }
      
      if (msgs && msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.content && lastMsg.content.toString().trim()) return lastMsg.content;
        if (lastMsg.media) {
          const media = Array.isArray(lastMsg.media) ? lastMsg.media[lastMsg.media.length - 1] : lastMsg.media;
          if (media && media.type) {
            const t = (media.type || '').toString().toLowerCase();
            if (t === 'image') return 'Photo';
            if (t === 'video') return 'Video';
            if (t === 'audio') return 'Audio';
            if (t === 'file') return media.name || 'File';
          }
          return 'Media';
        }
        return '';
      }

      const lm = (conv.lastMessage || '').toString().trim();
      if (!lm) return 'Start chatting';
      const low = lm.toLowerCase();
      if (['img', 'image', 'photo'].includes(low)) return 'Photo';
      if (low === 'video') return 'Video';
      if (low === 'audio') return 'Audio';
      if (low === 'file' || low === 'media') return 'Media';
      if (low === 'start chatting') return 'Start chatting';
      return lm;
    } catch (err) {
      return conv.lastMessage || 'Start chatting';
    }
  };


  const activeConv = conversations.find(c => c.id === activeConversation);
  // Ensure messages are displayed oldest-first (WhatsApp style)
  const sortMessagesAsc = (arr = []) => {
    return (arr || []).slice().sort((a, b) => {
      const getTime = (m) => {
        if (!m) return 0;
        if (m.createdAt) {
          const t = Date.parse(m.createdAt);
          if (!isNaN(t)) return t;
        }
        if (m.timestamp) {
          const t = Date.parse(m.timestamp);
          if (!isNaN(t)) return t;
        }
        if (m.time && typeof m.time === 'string') {
          const t = Date.parse(m.time);
          if (!isNaN(t)) return t;
        }
        if (m.id) return Number(m.id);
        return 0;
      };
      return getTime(a) - getTime(b);
    });
  };

  // Get raw messages and filter out blocked users
  const rawMessages = messagesByConversation[activeConversation] || [];
  const blockedUsers = activeConv?.blockedUsers || {};
  const otherUserId = activeConv?.participants?.find(p => p !== currentUserId);
  
  // Helper to check if a user is blocked (handles multiple ID formats)
  const isBlockedByMe = (senderId) => {
    const blockedId = blockedUsers[currentUserId];
    if (!blockedId) return false;
    // Check if blocked ID matches sender (could be email or other ID format)
    return blockedId === senderId || blockedId === otherUserId;
  };
  
  const senderBlockedMe = (senderId) => {
    // Check if the sender has blocked the current user
    const blockedId = blockedUsers[senderId] || blockedUsers[otherUserId];
    return blockedId === currentUserId;
  };
  
  // Filter messages: exclude if I blocked sender OR sender blocked me
  const filteredMessages = rawMessages.filter(msg => {
    // Don't filter system messages
    if (msg.isSystem) return true;
    
    // If I blocked the sender, hide their messages
    if (isBlockedByMe(msg.senderId)) return false;
    
    // If sender blocked me, hide their messages
    if (senderBlockedMe(msg.senderId)) return false;
    
    return true;
  });

  const messages = sortMessagesAsc(filteredMessages);
  const isAdmin = false; // Groups removed; admin not applicable

  // Calculate total unread messages and update Redux for sidebar badge
  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread || 0), 0);
    dispatch(setChatUnreadCount(totalUnread));
  }, [conversations, dispatch]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (!activeConversation || !currentUserId || currentUserId === 'anonymous') return;
    
    const markMessagesAsRead = async () => {
      const currentMessages = messagesByConversation[activeConversation] || [];
      const unreadMessages = currentMessages.filter(
        msg => !msg.isOwn && !msg.readBy?.includes(currentUserId)
      );
      
      if (unreadMessages.length === 0) return;
      
      try {
        // Update each unread message to mark as read
        const batch = writeBatch(db);
        
        for (const msg of unreadMessages) {
          const msgRef = doc(db, 'messages', msg.id);
          const readBy = msg.readBy || [];
          if (!readBy.includes(currentUserId)) {
            batch.update(msgRef, {
              readBy: [...readBy, currentUserId],
              read: true
            });
          }
        }
        
        await batch.commit();
        
        // Reset unread count for current user only (not for others)
        const convRef = doc(db, 'conversations', activeConversation);
        const convDoc = await getDoc(convRef);
        const existingUnreadBy = convDoc.exists() ? (convDoc.data().unreadBy || {}) : {};
        
        await updateDoc(convRef, {
          unreadBy: {
            ...existingUnreadBy,
            [currentUserId]: 0 // Reset only current user's unread count
          }
        }).catch(() => {});
        
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    };
    
    // Small delay to ensure messages are loaded
    const timer = setTimeout(markMessagesAsRead, 500);
    return () => clearTimeout(timer);
  }, [activeConversation, messagesByConversation, currentUserId]);

  // Auto-scroll to bottom when messages change or conversation changes
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const scrollToBottom = () => {
      try {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      } catch (err) {
        el.scrollTop = el.scrollHeight;
      }
    };
    // Delay slightly to let new message DOM paint
    const t = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(t);
  }, [activeConversation, messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeConversation) return;
    
    // Check if Firebase is authenticated
    if (!firebaseUser) {
      showToast('Initializing chat system, please try again in a moment', 'info');
      return;
    }
    
    // Check if user is a participant in this conversation
    const activeConvData = conversations.find(c => c.id === activeConversation);
    if (activeConvData && activeConvData.participants && !activeConvData.participants.includes(currentUserId)) {
      showToast('You are not authorized to send messages in this conversation.', 'error');
      return;
    }

    // Check if the conversation status is active (for invitation-based chats)
    if (activeConvData && activeConvData.status === 'pending') {
      showToast('This chat is not yet active. The invitation needs to be accepted first.', 'warning');
      return;
    }
    
    // Check if blocked - WhatsApp style
    const blockedUsers = activeConvData?.blockedUsers || {};
    const otherUserId = activeConvData?.participants?.find(p => p !== currentUserId);
    
    // Check if I blocked them
    if (blockedUsers[currentUserId]) {
      showToast('You have blocked this user. Unblock to send messages.', 'warning');
      return;
    }
    
    // Check if they blocked me
    if (blockedUsers[otherUserId] === currentUserId) {
      // Don't reveal that they blocked me - just fail silently or show generic error
      showToast('Message could not be delivered.', 'warning');
      return;
    }
    
    if (message.trim()) {
      // Get other participants to track unread for them
      const otherParticipants = activeConvData?.participants?.filter(p => p !== currentUserId) || [];
      
      const newMessage = {
        conversationId: activeConversation,
        senderId: currentUserId,
        senderName: currentUserName,
        sender: currentUserName,
        content: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: serverTimestamp(),
        read: false,
        readBy: [currentUserId], // Sender has already "read" their own message
        replyTo: replyingTo
      };

      try {
        // Save to Firestore
        const messageRef = await addDoc(collection(db, 'messages'), newMessage);
        console.log('Message sent:', messageRef.id, 'to conversation:', activeConversation);
        
        // Update conversation last message and increment unread for other participants only
        const convDocRef = doc(db, 'conversations', activeConversation);
        const convDoc = await getDoc(convDocRef);
        const existingUnreadBy = convDoc.exists() ? (convDoc.data().unreadBy || {}) : {};
        
        // Increment unread count only for other participants (not the sender)
        const updatedUnreadBy = { ...existingUnreadBy };
        otherParticipants.forEach(participantId => {
          updatedUnreadBy[participantId] = (updatedUnreadBy[participantId] || 0) + 1;
        });
        
        await updateDoc(convDocRef, {
          lastMessage: message || '',
          lastMessageTime: serverTimestamp(),
          unreadBy: updatedUnreadBy // Track unread per user
        }).catch((err) => {
          // Conversation doc might not exist yet, that's ok
          console.log('Could not update conversation lastMessage:', err.message);
        });
        
        // Backend sync disabled - using Firestore as primary database

        setMessage('');
        setReplyingTo(null);
      } catch (error) {
        console.error('Failed to send message:', error);
        showToast('Failed to send message. Please try again.');
      }
    }
  };



  const startRecording = async () => {
    if (!activeConversation) {
      showToast('Please select a conversation first', 'warning');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      setRecordingDuration(0);
      
      // Start duration timer (updates every second)
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at 5 minutes (300 seconds)
          if (newDuration >= 300) {
            stopRecording();
            showToast('Maximum recording length (5 minutes) reached', 'info');
          }
          return newDuration;
        });
      }, 1000);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      
      recorder.onstop = async () => {
        // Clear the timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        
        // Send the voice message
        if (blob.size > 0 && activeConversation) {
          const activeConvData = conversations.find(c => c.id === activeConversation);
          const otherParticipants = activeConvData?.participants?.filter(p => p !== currentUserId) || [];
          
          const voiceMessage = {
            conversationId: activeConversation,
            senderId: currentUserId,
            senderName: currentUserName,
            sender: currentUserName,
            content: '🎤 Voice message',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            createdAt: serverTimestamp(),
            read: false,
            readBy: [currentUserId],
            media: {
              id: Date.now() + Math.random(),
              name: `voice-${new Date().toISOString()}.webm`,
              type: 'audio',
              url,
              size: blob.size,
              duration: recordingDuration
            }
          };

          try {
            // Save to Firestore
            await addDoc(collection(db, 'messages'), voiceMessage);
            
            // Update conversation
            const convDocRef = doc(db, 'conversations', activeConversation);
            const convDoc = await getDoc(convDocRef);
            const existingUnreadBy = convDoc.exists() ? (convDoc.data().unreadBy || {}) : {};
            
            const updatedUnreadBy = { ...existingUnreadBy };
            otherParticipants.forEach(participantId => {
              updatedUnreadBy[participantId] = (updatedUnreadBy[participantId] || 0) + 1;
            });
            
            await updateDoc(convDocRef, {
              lastMessage: '🎤 Voice message',
              lastMessageTime: serverTimestamp(),
              unreadBy: updatedUnreadBy
            }).catch((err) => {
              console.log('Could not update conversation:', err.message);
            });
            
            showToast('Voice message sent');
          } catch (error) {
            console.error('Failed to send voice message:', error);
            showToast('Failed to send voice message', 'error');
          }
        }
        
        setRecordingDuration(0);
      };
      
      mediaRecorderRef.current = recorder;
      recordingStreamRef.current = stream;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied or not available', err);
      showToast('Unable to access microphone', 'error');
    }
  };

  const stopRecording = () => {
    try {
      // Clear timer first
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
      // stop the captured stream tracks
      try {
        recordingStreamRef.current?.getTracks()?.forEach(t => t.stop());
      } catch (e) {}
    } catch (err) {
      console.error('Error stopping recorder', err);
    } finally {
      setIsRecording(false);
      mediaRecorderRef.current = null;
      recordingStreamRef.current = null;
    }
  };



  const startCall = (type) => {
    setCallType(type);
    setShowCallModal(true);
  };

  const endCall = () => {
    setShowCallModal(false);
    setCallType(null);
  };

  // Message Actions
  const deleteMessage = async (messageId) => {
    const ok4 = await confirm('Delete this message?');
    if (!ok4) return;
    
    // Check if Firebase is authenticated
    if (!firebaseUser) {
      showToast('Initializing chat system, please try again in a moment', 'info');
      return;
    }
    
    try {
      // Delete from Firestore
      if (typeof messageId === 'string' && messageId) {
        console.log('Deleting message from Firebase:', messageId);
        await deleteDoc(doc(db, 'messages', messageId));
        console.log('Message deleted successfully from Firebase');
        
        // Update conversation lastMessage after deletion
        if (activeConversation) {
          const remainingMsgs = (messagesByConversation[activeConversation] || [])
            .filter(m => m.id !== messageId);
          
          if (remainingMsgs.length > 0) {
            const lastMsg = remainingMsgs[remainingMsgs.length - 1];
            await updateDoc(doc(db, 'conversations', activeConversation), {
              lastMessage: lastMsg.content || 'Media',
              lastMessageTime: serverTimestamp()
            });
          } else {
            // No messages left
            await updateDoc(doc(db, 'conversations', activeConversation), {
              lastMessage: '',
              lastMessageTime: serverTimestamp()
            });
          }
        }
        
        showToast('Message deleted');
      }
      
      setMessageContextMenu(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
      showToast('Failed to delete message. Please try again.');
    }
  };

  const replyToMessage = (msg) => {
    setReplyingTo(msg);
    setMessageContextMenu(null);
  };

  const copyMessage = (msg) => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content).then(() => {
        showToast('Message copied to clipboard');
      }).catch(() => {
        showToast('Failed to copy message', 'error');
      });
    }
    setMessageContextMenu(null);
  };

  const forwardMessage = (msg) => {
    setMessagesToForward([msg]);
    setShowForwardModal(true);
    setMessageContextMenu(null);
  };

  const downloadMedia = (msg, mediaItem = null) => {
    // If specific media item provided, download only that one
    const items = mediaItem ? [mediaItem] : (msg && msg.media ? (Array.isArray(msg.media) ? msg.media : [msg.media]) : []);

    if (!items || items.length === 0) {
      showToast('No media to download', 'error');
      setMessageContextMenu(null);
      return;
    }

    items.forEach((m, index) => {
      if (m && m.url) {
        const link = document.createElement('a');
        link.href = m.url;
        link.download = m.name || `media-${Date.now()}-${index}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });

    showToast(`Downloaded ${items.length} file(s)`);
    setMessageContextMenu(null);
  };

  const forwardSelectedMessages = () => {
    const msgs = messages.filter(m => selectedMessages.includes(m.id));
    setMessagesToForward(msgs);
    setShowForwardModal(true);
  };

  const confirmForward = async (targetConvId) => {
    if (!targetConvId || messagesToForward.length === 0) return;

    // Check if Firebase is authenticated
    if (!firebaseUser) {
      showToast('Initializing chat system, please try again in a moment', 'info');
      return;
    }

    try {
      const forwardedCount = [];

      for (const msg of messagesToForward) {
        const messageData = {
          conversationId: targetConvId,
          senderId: currentUserId,
          sender: 'You',
          content: msg.content,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          createdAt: serverTimestamp(),
          read: false,
          media: msg.media || null,
          forwarded: true,
          originalSender: msg.sender || 'Unknown'
        };

        // Save to Firestore
        await addDoc(collection(db, 'messages'), messageData);

        // Backend sync disabled - using Firestore as primary database

        // Update conversation preview (lastMessage/time)
        setConversations(prev => {
          const updated = prev.map(conv => conv.id === targetConvId ? { ...conv, lastMessage: msg.content || (msg.media ? 'Media' : ''), time: 'Now' } : conv);
          storage.setJSON(STORAGE_KEYS.CONVERSATIONS, updated);
          return updated;
        });

        forwardedCount.push(messageData);
      }

      showToast(`Forwarded ${forwardedCount.length} message(s)`);
      setShowForwardModal(false);
      setMessagesToForward([]);
      exitSelectionMode();
    } catch (error) {
      console.error('Forward error:', error);
      showToast('Failed to forward messages', 'error');
    }
  };

  

  const openContextMenuAtElement = (element, msg, media = null) => {
    if (!element) {
      // fallback to center of viewport
      setMessageContextMenu({ x: window.innerWidth / 2, y: window.innerHeight / 2, message: msg });
      return;
    }

    const offset = 8;
    const rect = element.getBoundingClientRect();

    // Estimate menu width but cap to viewport so we can clamp positioning
    const estMenuWidth = 240;
    const menuWidth = Math.min(estMenuWidth, Math.max(160, window.innerWidth - 16));

    // Prefer placing menu to the left of the message bubble
    let x = rect.left - menuWidth - offset;
    // If not enough space on left, place to the right of the bubble
    if (x < 8) {
      x = rect.right + offset;
    }

    // Clamp horizontally so menu never overflows viewport
    const maxX = window.innerWidth - menuWidth - 8;
    if (x > maxX) x = maxX;
    if (x < 8) x = 8;

    // Try to align menu top with message top, but keep within viewport vertically
    let y = rect.top + offset;
    const maxY = window.innerHeight - 48; // leave some margin
    if (y > maxY) y = maxY;
    if (y < 8) y = 8;

    setMessageContextMenu({ x, y, message: msg, media });
  };

  const handleMessageContextMenu = (e, msg) => {
    e.preventDefault();
    // e.currentTarget should be the .message element because handler is attached there
    const el = e.currentTarget || e.target.closest?.('.message');
    openContextMenuAtElement(el, msg);
  };

  // Scroll to and highlight the original message referenced by a reply
  const jumpToOriginal = (originalId) => {
    try {
      const container = messagesContainerRef.current || document;
      const selector = `[data-msg-id="${originalId}"]`;
      const el = container.querySelector ? container.querySelector(selector) : document.querySelector(selector);
      if (!el) {
        showToast('Original message not found', 'info');
        return;
      }

      // Scroll into view centered
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight class then remove after timeout
      el.classList.add('message--highlight');
      setTimeout(() => {
        el.classList.remove('message--highlight');
      }, 2200);
    } catch (err) {
      console.error('jumpToOriginal error:', err);
    }
  };

  const toggleMessageSelection = (msgId) => {
    setSelectedMessages(prev => 
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const enterSelectionMode = (msgId) => {
    setIsSelectionMode(true);
    setSelectedMessages([msgId]);

    // On small screens the main chat pane is hidden by default.
    // Ensure the main pane is shown so the selection toolbar is visible.
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 425) {
        setMobileShowMain(true);
      }
    } catch (err) {
      // ignore
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedMessages([]);
  };

  const deleteSelectedMessages = async () => {
    const ok = await confirm(`Delete ${selectedMessages.length} message(s)?`);
    if (!ok) return;

    // Check if Firebase is authenticated
    if (!firebaseUser) {
      showToast('Initializing chat system, please try again in a moment', 'info');
      return;
    }

    try {
      for (const msgId of selectedMessages) {
        // Delete from Firestore
        if (typeof msgId === 'string') {
          await deleteDoc(doc(db, 'messages', msgId));
        }
      }

      // Update conversation lastMessage after bulk deletion
      if (activeConversation) {
        const remainingMsgs = (messagesByConversation[activeConversation] || [])
          .filter(m => !selectedMessages.includes(m.id));
        
        if (remainingMsgs.length > 0) {
          const lastMsg = remainingMsgs[remainingMsgs.length - 1];
          await updateDoc(doc(db, 'conversations', activeConversation), {
            lastMessage: lastMsg.content || 'Media',
            lastMessageTime: serverTimestamp()
          });
        } else {
          // No messages left
          await updateDoc(doc(db, 'conversations', activeConversation), {
            lastMessage: '',
            lastMessageTime: serverTimestamp()
          });
        }
      }

      showToast(`Deleted ${selectedMessages.length} message(s)`);
      exitSelectionMode();
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete messages', 'error');
    }
  };

  const copySelectedMessages = () => {
    const textToCopy = messages
      .filter(m => selectedMessages.includes(m.id))
      .map(m => `${m.sender}: ${m.content}`)
      .join('\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('Messages copied to clipboard');
      exitSelectionMode();
    }).catch(() => {
      showToast('Failed to copy messages', 'error');
    });
  };

  const startNewChat = async (memberId) => {
    // Check if Firebase is authenticated
    if (!firebaseUser) {
      showToast('Initializing chat system, please try again in a moment', 'info');
      return;
    }
    
    const member = teamMembers.find(m => (m.id || m._id) === memberId);
    if (!member) {
      showToast('Selected user is not available as a team member.');
      return;
    }
    
    const normalizedMemberId = normalizeUserId(member);
    
    // Check for existing chat with this member (check both normalized and original IDs)
    const existingChat = conversations.find(c => 
      c.type === 'individual' && 
      (c.memberId === memberId || c.memberId === normalizedMemberId || 
       c.participants?.includes(memberId) || c.participants?.includes(normalizedMemberId))
    );
    if (existingChat) {
      console.log('Found existing chat:', existingChat.id);
      setActiveConversation(existingChat.id);
      setShowNewChatModal(false);
      return;
    }
    
    // Validate email before creating chat
    if (!member.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(member.email)) {
      showToast('Cannot start chat: Team member must have a valid email address.');
      return;
    }
    
    console.log('Creating conversation:', {
      currentUserId,
      normalizedMemberId,
      memberEmail: member.email
    });

    // Generate a unique conversation ID for Firestore using normalized IDs
    const conversationId = `chat_${[currentUserId, normalizedMemberId].sort().join('_')}`;
    
    // Store participant info so both users can see each other's details
    // This ensures Account B can see Account A's info and vice versa
    const participantsInfo = {
      [currentUserId]: {
        id: currentUserId,
        name: currentUserName,
        email: authUser?.email || '',
        phone: authUser?.phone || '',
        role: authUser?.role || ''
      },
      [normalizedMemberId]: {
        id: normalizedMemberId,
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        role: member.role || ''
      }
    };
    
    const newChat = {
      name: member.name,
      type: 'individual',
      lastMessage: 'Start chatting',
      lastMessageTime: serverTimestamp(),
      time: 'Now',
      unread: 0,
      memberId: normalizedMemberId,
      memberEmail: member.email,
      online: member.online || false,
      participants: [currentUserId, normalizedMemberId],
      participantsInfo: participantsInfo,
      createdBy: currentUserId,
      createdAt: serverTimestamp()
    };

    try {
      // Save to Firestore conversations collection
      await setDoc(doc(db, 'conversations', conversationId), newChat);
      
      console.log('Conversation created successfully:', conversationId, 'Participants:', newChat.participants);
      
      setActiveConversation(conversationId);
      setShowNewChatModal(false);
      showToast('Chat started successfully');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      showToast('Failed to start chat. Please try again.');
    }
  };

  const handleConversationClick = (convId) => {
    const isPhone = typeof window !== 'undefined' && window.innerWidth <= 425;
    setActiveConversation(convId);
    if (isPhone) setMobileShowMain(true);
  };

  // Delete a conversation (confirm -> backend -> update local state)
  const handleDeleteConversation = async (convId) => {
    const ok = await confirm('Delete this conversation? All messages will be permanently deleted. This action cannot be undone.');
    if (!ok) return;

    try {
      // First, delete all messages in this conversation
      const messagesQuery = query(
        collection(db, 'messages'),
        where('conversationId', '==', convId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      // Delete each message
      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach((msgDoc) => {
        batch.delete(msgDoc.ref);
      });
      await batch.commit();
      
      // Then delete the conversation
      await deleteDoc(doc(db, 'conversations', convId));
      
      // Clear local messages for this conversation
      setMessagesByConversation(prev => {
        const updated = { ...prev };
        delete updated[convId];
        return updated;
      });
      
      // If the deleted conversation was active, switch to first available
      if (activeConversation === convId) {
        const remaining = conversations.filter(c => c.id !== convId);
        setActiveConversation(remaining[0]?.id || null);
        setMobileShowMain(false);
      }

      showToast('Conversation and messages deleted');
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      showToast('Failed to delete conversation. Please try again.');
    }
  };

  // Block a user - WhatsApp style: only blocker knows they blocked, blocked user can't send messages
  const handleBlockUser = async () => {
    const otherParticipant = getOtherParticipantInfo(activeConv, teamMembers);
    const displayName = otherParticipant?.name || 'this user';
    
    const ok = await confirm(`Block ${displayName}? They won't be able to send you messages, and you won't receive messages from them.`);
    if (!ok) return;

    try {
      // Get current blockedUsers array or create empty one
      const convRef = doc(db, 'conversations', activeConversation);
      const convDoc = await getDoc(convRef);
      const existingBlockedUsers = convDoc.exists() ? (convDoc.data().blockedUsers || {}) : {};
      
      // Add current user's block entry - stores who they blocked
      // Format: { blockerId: blockedUserId }
      // IMPORTANT: Use email as the ID since messages use email as senderId for consistency
      const otherUserIdFromParticipants = activeConv?.participants?.find(p => p !== currentUserId);
      // Prefer email for consistency with senderId in messages
      const otherUserIdNormalized = otherParticipant?.email || otherUserIdFromParticipants || otherParticipant?.id;
      existingBlockedUsers[currentUserId] = otherUserIdNormalized;
      
      await updateDoc(convRef, {
        blockedUsers: existingBlockedUsers,
        [`blockedAt_${currentUserId}`]: serverTimestamp()
      });
      
      setShowUserInfoModal(false);
      showToast(`${displayName} has been blocked`);
    } catch (err) {
      console.error('Failed to block user:', err);
      showToast('Failed to block user. Please try again.');
    }
  };

  // Unblock a user - only the blocker can unblock
  const handleUnblockUser = async () => {
    const otherParticipant = getOtherParticipantInfo(activeConv, teamMembers);
    const displayName = otherParticipant?.name || 'this user';
    
    const ok = await confirm(`Unblock ${displayName}? You'll be able to send and receive messages from this user again.`);
    if (!ok) return;

    try {
      // Remove current user's block entry from blockedUsers
      const convRef = doc(db, 'conversations', activeConversation);
      const convDoc = await getDoc(convRef);
      const existingBlockedUsers = convDoc.exists() ? (convDoc.data().blockedUsers || {}) : {};
      
      // Remove this user's block
      delete existingBlockedUsers[currentUserId];
      
      await updateDoc(convRef, {
        blockedUsers: existingBlockedUsers,
        [`blockedAt_${currentUserId}`]: deleteField()
      });
      
      setShowUserInfoModal(false);
      showToast(`${displayName} has been unblocked`);
    } catch (err) {
      console.error('Failed to unblock user:', err);
      showToast('Failed to unblock user. Please try again.');
    }
  };

  // Open user info modal (for clicking on header)
  const handleOpenUserInfo = () => {
    setShowUserInfoModal(true);
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 425 && mobileShowMain) {
        setMobileShowMain(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [mobileShowMain]);

  // Filtered list for the "Start New Chat" modal (search by name or role)
  const filteredNewChatMembers = teamMembers
    .filter(m => (m.id || m._id) !== currentUserId)
    .filter((m) => {
      const q = (newChatSearchQuery || '').trim().toLowerCase();
      if (!q) return true;
      return (m.name || '').toLowerCase().includes(q) || (m.role || '').toLowerCase().includes(q);
    });

  return (
    <div className={`chat ${mobileShowMain ? 'chat--mobile-main-visible' : ''}`}>
      {showAutoResetNotice && (
        <div className="chat__reset-notice">
          <FaHistory />
          <span>Chat has been automatically reset! Previous messages are archived.</span>
          <button onClick={() => setShowAutoResetNotice(false)}>
            <FaTimes />
          </button>
        </div>

        
      )}
      <div className="chat__sidebar">
        <div className="chat__sidebar-header">
          <h2>Team Chat</h2>
          <div className="header-actions">
            <button 
              className="btn-new-chat" 
              onClick={() => setShowNewChatModal(true)}
              title="New Chat"
            >
              <FaUser />
            </button>
          </div>
        </div>
        <div className="chat__search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="chat__conversations">
          {conversations.length === 0 ? (
            <div className="chat__empty-state">
              <FaUser size={48} />
              <p>No conversations yet</p>
              {teamMembers.length === 0 ? (
                <span>You can receive messages from others, or add team members from the Team page to start chatting</span>
              ) : (
                <span>Click the + button to start a new chat</span>
              )}
            </div>
          ) : (
            conversations
              .filter(conv => {
                const q = (searchQuery || '').toString().trim().toLowerCase();
                // Get proper name for searching using the helper function
                const otherParticipant = getOtherParticipantInfo(conv, teamMembers);
                const displayName = otherParticipant?.name || conv.name || '';
                return displayName.toLowerCase().includes(q);
              })
              .map((conv) => {
                // Get the display name using the helper function for proper cross-account support
                const otherParticipant = getOtherParticipantInfo(conv, teamMembers);
                const displayName = otherParticipant?.name || conv.name || 'Unknown';
                
                // Check if current user blocked this conversation
                const isBlockedByMe = conv.blockedUsers && conv.blockedUsers[currentUserId];
                
                return (
                  <div 
                    key={conv.id} 
                    className={`conversation-item ${activeConversation === conv.id ? 'conversation-item--active' : ''} ${isBlockedByMe ? 'conversation-item--blocked' : ''}`}
                    onClick={() => handleConversationClick(conv.id)}
                  >
                    <div className="conversation-item__avatar">
                      {isBlockedByMe && <FaBan className="blocked-icon" />}
                      {displayName.charAt(0)}
                    </div>
                    <div className="conversation-item__content">
                      <h3>
                        {displayName}
                        {isBlockedByMe && <span className="blocked-label">Blocked</span>}
                      </h3>
                      <p>{getConversationPreview(conv)}</p>
                    </div>
                    <div className="conversation-item__meta">
                      <span className="time">{getConversationDisplayTime(conv) || conv.time}</span>
                      {conv.unread > 0 && (
                        <span className="unread-badge">{conv.unread}</span>
                      )}
                      {/* <button
                        className="conversation-item__delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                        title="Delete conversation"
                        aria-label={`Delete conversation ${displayName}`}
                      >
                        <FaTrash />
                      </button> */}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div className="chat__main">
        {!activeConversation ? (
          <div className="chat__welcome">
            <div className="welcome-art" aria-hidden>
              <div className="bubble bubble--lg"></div>
              <div className="bubble bubble--md"></div>
              <div className="bubble bubble--sm"></div>
              <div className="chat-illustration">
                <svg width="260" height="160" viewBox="0 0 260 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="20" width="220" height="100" rx="12" fill="#EEF2FF"/>
                  <circle cx="40" cy="70" r="26" fill="#6366F1" />
                  <rect x="80" y="48" width="110" height="12" rx="6" fill="#C7D2FE" />
                  <rect x="80" y="70" width="70" height="12" rx="6" fill="#C7D2FE" />
                  <rect x="80" y="92" width="50" height="8" rx="4" fill="#EDE9FE" />
                </svg>
              </div>
            </div>

            <div className="welcome-content">
              <h1>Welcome to Team Chat</h1>
              <p>Connect with your team in one place. Start a direct message or create a group to collaborate instantly.</p>

              <div className="welcome-actions">
                <button className="btn-primary" onClick={() => setShowNewChatModal(true)}>Start a Chat</button>
              </div>

              <ul className="welcome-features">
                <li>Private 30-day auto-reset for privacy</li>
                <li>Chat with individual team members</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="chat__header">
              {mobileShowMain && (
                <button
                  className="chat__back-btn"
                  onClick={() => setMobileShowMain(false)}
                  aria-label="Back to conversations"
                >
                  <FaArrowLeft />
                </button>
              )}
              <div 
                className="chat__header-info" 
                onClick={handleOpenUserInfo}
                style={{ cursor: 'pointer' }}
                title="View info"
              >
                {(() => {
                  const otherParticipant = getOtherParticipantInfo(activeConv, teamMembers);
                  const headerDisplayName = otherParticipant?.name || activeConv?.name || 'Unknown';
                  const headerRole = otherParticipant?.role || 'Unknown role';
                  return (
                    <>
                      <div>
                        <h2>
                          {headerDisplayName}
                        </h2>
                        <p className="chat__header-role">{headerRole}</p>
                      </div>
                      <div className="chat__header-avatar">
                        {(headerDisplayName || 'U').charAt(0)}
                      </div>
                    </>
                  );
                })()}
              </div>
              {/* Reset timer moved under header */}
            </div>

            {/* Auto-reset timer placed under the chat header */}
            <div className="chat__reset-timer chat__reset-timer--sub">
              <FaClock />
              <span>Auto-reset in: {getTimeUntilReset()}</span>
              <button
                type="button"
                className="btn-info"
                title="Chats reset every 30 days"
                aria-label="View auto-reset details"
                onClick={() => setShowResetInfoModal(true)}
              >
                <FaInfoCircle />
              </button>
            </div>

            <div className="chat__messages" ref={messagesContainerRef} onClick={() => setMessageContextMenu(null)}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  data-msg-id={msg.id}
                  className={`message ${msg.isOwn ? 'message--own' : ''} ${msg.isSystem ? 'message--system' : ''} ${selectedMessages.includes(msg.id) ? 'message--selected' : ''} ${isSelectionMode ? 'message--selectable' : ''}`}
                  onContextMenu={(e) => !msg.isSystem && handleMessageContextMenu(e, msg)}
                  onClick={() => isSelectionMode && !msg.isSystem && toggleMessageSelection(msg.id)}
                >
                  {isSelectionMode && !msg.isSystem && (
                    <div className="message__checkbox">
                      <input 
                        type="checkbox" 
                        checked={selectedMessages.includes(msg.id)}
                        onChange={() => toggleMessageSelection(msg.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select message ${msg.id}`}
                      />
                    </div>
                  )}
                  {!msg.isOwn && !msg.isSystem && activeConv?.type === 'group' && (
                    <div className="message__sender">{msg.sender}</div>
                  )}
                  <div className="message__content">
                    {(!(msg.media && (Array.isArray(msg.media) ? msg.media.length > 0 : true))) && (
                      <button
                        className="message__ellipsis"
                        onClick={(e) => {
                          e.stopPropagation();
                          const messageEl = e.currentTarget.closest('.message');
                          openContextMenuAtElement(messageEl, msg);
                        }}
                        aria-label="Message actions"
                        title="Message actions"
                      >
                        <FaEllipsisV />
                      </button>
                    )}
                    {msg.replyTo && (
                      <div className="message__reply-to" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); if (msg.replyTo?.id) jumpToOriginal(msg.replyTo.id); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); if (msg.replyTo?.id) jumpToOriginal(msg.replyTo.id); } }}>
                        <FaReply />
                        <span className="reply-preview">{msg.replyTo.sender}: {msg.replyTo.content}</span>
                      </div>
                    )}
                    {msg.forwarded && (
                      <div className="message__forwarded">
                        <FaShare /> Forwarded
                      </div>
                    )}
                    {msg.media && (
                      <div className="message__media">
                        {(Array.isArray(msg.media) ? msg.media : [msg.media]).map((m) => (
                          <div key={m.id} className={`media-wrapper media-wrapper--${m.type}`}>
                            {m.type === 'image' && (
                              <div className="media-inline media-inline--image">
                                <img 
                                  src={m.url} 
                                  alt={m.name || 'Image'} 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(m.url, '_blank');
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                                {m.name && <span className="media-caption">{m.name}</span>}
                              </div>
                            )}
                            {m.type === 'video' && (
                              <div className="media-inline media-inline--video">
                                <video 
                                  controls 
                                  src={m.url}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Your browser does not support video playback.
                                </video>
                                {m.name && <span className="media-caption">{m.name}</span>}
                              </div>
                            )}
                            {m.type === 'audio' && (
                              <div className="media-inline media-inline--audio">
                                <div className="audio-player-wrapper">
                                  <FaMicrophone className="audio-icon" />
                                  <audio 
                                    controls 
                                    src={m.url}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Your browser does not support audio playback.
                                  </audio>
                                </div>
                                {m.name && <span className="media-caption">{m.name}</span>}
                              </div>
                            )}
                            {m.type === 'file' && (
                              <a 
                                href={m.url} 
                                download={m.name}
                                className="media-inline media-inline--file"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="file-icon-wrapper">
                                  <FaPaperclip />
                                </div>
                                <div className="file-info">
                                  <span className="file-name">{m.name || 'Download file'}</span>
                                  {m.size && (
                                    <span className="file-size">
                                      {(m.size / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                </div>
                              </a>
                            )}

                            {/* Per-media actions (ellipsis) for bulk/media-specific operations */}
                            <button
                              className="media__ellipsis"
                              onClick={(e) => {
                                e.stopPropagation();
                                const mediaEl = e.currentTarget.closest('.media-wrapper');
                                openContextMenuAtElement(mediaEl, msg, m);
                              }}
                              aria-label="Media actions"
                              title="Media actions"
                            >
                              <FaEllipsisV />
                            </button>

                          </div>
                        ))}
                      </div>
                    )}
                    {msg.content && (
                      <p>
                        {msg.content}
                        {msg.edited && <span className="message__edited"> (edited)</span>}
                      </p>
                    )}
                    <div className="message__footer">
                      <span className="message__time">{msg.createdAt ? formatTimestamp(msg.createdAt) : (msg.time ? (msg.time.includes(':') ? `Today ${msg.time.replace(':', ' : ')}` : msg.time) : '')}</span>
                      {msg.isOwn && (
                        <span className="message__status">
                          {(msg.read || (msg.readBy && msg.readBy.length > 0 && msg.readBy.some(r => r !== currentUserId))) ? (
                            <FaCheck className="read" />
                          ) : (
                            <FaCheck />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isSelectionMode && selectedMessages.length > 0 && (
              <div className="chat__selection-toolbar">
                <div className="toolbar-info">
                  <button className="btn-close" onClick={exitSelectionMode}>
                    <FaTimes />
                  </button>
                  <span>{selectedMessages.length} selected</span>
                </div>
                <div className="toolbar-actions">
                  <button onClick={copySelectedMessages} title="Copy">
                    <FaRegCopy />
                  </button>
                  <button onClick={forwardSelectedMessages} title="Forward">
                    <FaShare />
                  </button>
                  <button onClick={deleteSelectedMessages} className="btn-delete" title="Delete">
                    <FaTrash />
                  </button>
                </div>
              </div>
            )}

            <div className="chat__input-wrapper">
              {activeConv?.blockedUsers && activeConv.blockedUsers[currentUserId] ? (
                <div className="chat__blocked-notice">
                  <FaBan />
                  <span>You blocked this user. <button onClick={handleUnblockUser} className="unblock-link">Unblock</button> to send messages.</span>
                </div>
              ) : (
                <>
                  {replyingTo && (
                    <div className="chat__reply-preview">
                      <div className="reply-info">
                        <FaReply />
                        <div>
                          <strong>{replyingTo.sender}</strong>
                          <p>{replyingTo.content}</p>
                        </div>
                      </div>
                      <button onClick={() => setReplyingTo(null)}>
                        <FaTimes />
                      </button>
                    </div>
                  )}

                  {isRecording && (
                    <div className="chat__recording-indicator">
                      <div className="recording-pulse"></div>
                      <span>Recording... {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')} / 5:00</span>
                    </div>
                  )}

                  <form className="chat__input" onSubmit={handleSend}>

                    <button
                      type="button"
                      className={`btn-record ${isRecording ? 'recording' : ''}`}
                      onClick={() => {
                        if (!isRecording) startRecording(); else stopRecording();
                      }}
                      title={isRecording ? 'Stop recording' : 'Record voice message'}
                    >
                      <FaMicrophone />
                    </button>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <button type="submit" className="btn-send">
                      <FaPaperPlane />
                    </button>
                  </form>

                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Call Modal */}
      <Modal 
        isOpen={showCallModal}
        onClose={endCall}
        title={`${callType === 'video' ? 'Video' : 'Voice'} Call`}
        size="medium"
      >
        <div className="call-modal">
          <div className="call-modal__video">
            {callType === 'video' ? (
              <div className="video-placeholder">
                <FaVideo />
                <p>Video call with {activeConv?.name}</p>
              </div>
            ) : (
              <div className="audio-placeholder">
                <div className="audio-avatar">
                  {activeConv?.name.charAt(0)}
                </div>
                <h3>{activeConv?.name}</h3>
                <p>Calling...</p>
              </div>
            )}
          </div>
          <div className="call-modal__controls">
            <button className="btn-call-control btn-call-control--mute" title="Mute">
              <FaMicrophone />
            </button>
            {callType === 'video' && (
              <button className="btn-call-control" title="Toggle video">
                <FaVideo />
              </button>
            )}
            <button className="btn-call-control btn-call-control--end" onClick={endCall} title="End call">
              <FaPhone />
            </button>
          </div>
        </div>
      </Modal>

      {/* New Chat Modal */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        title="Start New Chat"
        size="small"
      >
        <div className="group-modal">
          <div className="modal-search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by name or role..."
              value={newChatSearchQuery}
              onChange={(e) => setNewChatSearchQuery(e.target.value)}
            />
          </div>
          <div className="member-list">
            {filteredNewChatMembers.length === 0 ? (
              <div className="chat__empty-state">
                <FaUsers size={48} />
                <p>No team members yet</p>
                <span>Add team members from the Team page to start chatting</span>
              </div>
            ) : (
              filteredNewChatMembers
                .map((member) => {
                  const memberId = member.id || member._id;
                  const hasValidEmail = member.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(member.email);
                  const hasExistingChat = conversations.some(c => c.type === 'individual' && (c.memberId === memberId || c.memberEmail === member.email));
                  return (
                    <div 
                      key={memberId} 
                      className={`member-item ${hasExistingChat ? 'member-item--existing' : ''} ${!hasValidEmail ? 'member-item--disabled' : ''}`}
                      onClick={() => {
                        if (hasValidEmail) {
                          startNewChat(memberId);
                          setShowNewChatModal(false);
                        }
                      }}
                      title={!hasValidEmail ? 'This member needs a valid email to start chat' : ''}
                    >
                      <div className="member-avatar">
                        {member.name.charAt(0)}
                        {member.online && <span className="online-dot"></span>}
                      </div>
                      <div className="member-info">
                        <strong>{member.name}</strong>
                        <span>{member.role}</span>
                        {!hasValidEmail && <span className="no-email-badge">No valid email</span>}
                      </div>
                      {hasExistingChat && <span className="existing-badge">Active</span>}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResetInfoModal}
        onClose={() => setShowResetInfoModal(false)}
        title="Retention Details"
        size="medium"
      >
        <div className="chat-reset-info">
          <p>Every conversation is automatically cleared to protect your privacy. Here is how the retention cycle works:</p>
          <ul>
            <li>Messages and media attachments are stored for a rolling 30-day window before the auto-reset removes them.</li>
            <li>All data is permanently deleted from Firebase and local storage after 30 days.</li>
            <li>If you need to keep a record longer than 30 days, download files or copy important notes before the reset.</li>
          </ul>
        </div>
      </Modal>

      {/* Message Context Menu */}
      {messageContextMenu && (
        <div 
          className="message-context-menu"
          style={{ top: messageContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={() => replyToMessage(messageContextMenu.message)}>
            <FaReply /> Reply
          </button>
          <button onClick={() => copyMessage(messageContextMenu.message)}>
            <FaRegCopy /> Copy
          </button>
          <button onClick={() => forwardMessage(messageContextMenu.message)}>
            <FaShare /> Forward
          </button>
          {messageContextMenu.media ? (
            <button onClick={() => downloadMedia(messageContextMenu.message, messageContextMenu.media)}>
              <FaDownload /> Download
            </button>
          ) : (messageContextMenu.message.media && (
            <button onClick={() => downloadMedia(messageContextMenu.message)}>
              <FaDownload /> Download Media
            </button>
          ))}
          <button onClick={() => {
            enterSelectionMode(messageContextMenu.message.id);
            setMessageContextMenu(null);
          }}>
            <FaCheckSquare /> Select
          </button>
          {messageContextMenu.message.isOwn && (
            <>
              <hr />
              
              <button 
                className="danger" 
                onClick={() => deleteMessage(messageContextMenu.message.id)}
              >
                <FaTrash /> Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* Forward Modal */}
      <Modal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setMessagesToForward([]);
        }}
        title="Forward Message"
        size="small"
      >
        <div className="forward-modal">
          <p className="forward-info">Forward to:</p>
          <div className="conversation-list">
            {conversations
              .filter(c => c.id !== activeConversation)
              .map(conv => (
                <div 
                  key={conv.id} 
                  className="forward-conversation-item"
                  onClick={() => confirmForward(conv.id)}
                >
                  <div className="conversation-avatar">
                    {conv.type === 'group' && <FaUsers className="group-icon" />}
                    {conv.name.charAt(0)}
                  </div>
                  <div className="conversation-name">
                    <strong>{conv.name}</strong>
                    {conv.type === 'group' && <span className="member-count"> ({conv.members})</span>}
                  </div>
                </div>
              ))}
          </div>
          {conversations.filter(c => c.id !== activeConversation).length === 0 && (
            <div className="chat__empty-state">
              <FaUsers size={48} />
              <p>No other conversations</p>
              <span>Create more conversations to forward messages</span>
            </div>
          )}
        </div>
      </Modal>

      {/* User Info Modal (for individual chats) */}
      <Modal
        isOpen={showUserInfoModal}
        onClose={() => setShowUserInfoModal(false)}
        title="User Info"
        size="small"
      >
        <div className="user-info-modal">
          {activeConv && (() => {
            // Use the helper function to get the other participant's info
            const otherParticipant = getOtherParticipantInfo(activeConv, teamMembers);
            
            // Debug: Log what we found
            console.log('Other participant info:', otherParticipant);
            console.log('Is in team:', otherParticipant?.isInTeam);
            
            // Get display values from the helper function result
            const displayName = otherParticipant?.name || 'Unknown User';
            const displayEmail = otherParticipant?.email || '';
            const displayPhone = otherParticipant?.phone || '';
            const displayRole = otherParticipant?.role || '';
            const isInTeam = otherParticipant?.isInTeam || false;
            
            return (
              <>
                <div className="user-info-header">
                  <div className="user-info-avatar">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <h3>{displayName}</h3>
                </div>

                {/* {!isInTeam && (
                  <div className="info-warning">
                    <FaInfoCircle /> This user is not in your team members list. Add them from the Team page to see their full details.
                  </div>
                )} */}

                <div className="user-info-details">
                  {displayEmail && (
                    <div className="info-item">
                      <label><FaEnvelope /> Email</label>
                      <span>{displayEmail}</span>
                    </div>
                  )}
                  {displayPhone && (
                    <div className="info-item">
                      <label><FaPhone /> Phone</label>
                      <span>{displayPhone}</span>
                    </div>
                  )}
                  {displayRole && (
                    <div className="info-item">
                      <label><FaBriefcase /> Role</label>
                      <span>{displayRole}</span>
                    </div>
                  )}
                  {!displayEmail && !displayPhone && !displayRole && (
                    <div className="info-item">
                      <span className="no-info">No additional information available</span>
                    </div>
                  )}
                </div>

                <div className="user-info-actions">
                  {activeConv.blockedUsers && activeConv.blockedUsers[currentUserId] ? (
                    <button 
                      className="btn-unblock" 
                      onClick={handleUnblockUser}
                      title="Unblock user"
                    >
                      <FaCheck /> Unblock User
                    </button>
                  ) : (
                    <button 
                      className="btn-block" 
                      onClick={handleBlockUser}
                      title="Block user"
                    >
                      <FaBan /> Block User
                    </button>
                  )}
                  <button 
                    className="btn-delete-chat" 
                    onClick={() => {
                      setShowUserInfoModal(false);
                      handleDeleteConversation(activeConversation);
                    }}
                    title="Delete conversation"
                  >
                    <FaTrash /> Delete Chat
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
};

export default Chat;
