import api from "./api";
import logger from "./logger";

/**
 * Chat API utilities for managing conversations and messages
 */

// ============ Conversation APIs ============

/**
 * Get all conversations
 */
export const getConversations = async () => {
  try {
    const response = await api.get("/chat/conversations");
    return response.data;
  } catch (error) {
    logger.error("Error fetching conversations", error, "ChatAPI");
    throw error;
  }
};

/**
 * Get a single conversation by ID
 */
export const getConversation = async (conversationId) => {
  try {
    const response = await api.get(`/chat/conversations/${conversationId}`);
    return response.data;
  } catch (error) {
    logger.error("Error fetching conversation", error, "ChatAPI");
    throw error;
  }
};

/**
 * Create a new conversation
 */
export const createConversation = async (conversationData) => {
  try {
    const response = await api.post("/chat/conversations", conversationData);
    return response.data;
  } catch (error) {
    logger.error("Error creating conversation", error, "ChatAPI");
    throw error;
  }
};

/**
 * Update a conversation
 */
export const updateConversation = async (conversationId, updates) => {
  try {
    const response = await api.put(
      `/chat/conversations/${conversationId}`,
      updates,
    );
    return response.data;
  } catch (error) {
    // Silently fail for 404s (backend chat routes not implemented)
    if (error.response?.status !== 404) {
      logger.error("Error updating conversation", error, "ChatAPI");
    }
    throw error;
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (conversationId) => {
  try {
    const response = await api.delete(`/chat/conversations/${conversationId}`);
    return response.data;
  } catch (error) {
    logger.error("Error deleting conversation", error, "ChatAPI");
    throw error;
  }
};

// ============ Message APIs ============

/**
 * Get all messages for a conversation
 */
export const getMessages = async (conversationId) => {
  try {
    const response = await api.get(
      `/chat/conversations/${conversationId}/messages`,
    );
    return response.data;
  } catch (error) {
    logger.error("Error fetching messages", error, "ChatAPI");
    throw error;
  }
};

/**
 * Create a new message
 */
export const createMessage = async (conversationId, messageData) => {
  try {
    // If there are attachments with a local `_file`, upload them first
    if (messageData && messageData.media) {
      const mediaArray = Array.isArray(messageData.media)
        ? messageData.media
        : [messageData.media];
      const filesToUpload = mediaArray
        .filter((m) => m && m._file)
        .map((m) => m._file);
      if (filesToUpload.length > 0) {
        const form = new FormData();
        filesToUpload.forEach((f) => form.append("files", f));
        const uploadResp = await api.post("/uploads", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploaded = uploadResp.data?.files || [];
        // Replace local media items with uploaded info (match order)
        let idx = 0;
        for (let i = 0; i < mediaArray.length; i++) {
          const m = mediaArray[i];
          if (m && m._file) {
            const u = uploaded[idx++] || {};
            m.url = u.url || m.url;
            m.name = u.originalName || m.name;
            m.size = u.size || m.size;
            delete m._file;
          }
        }
        // ensure messageData.media keeps original shape (array or single)
        messageData.media = Array.isArray(messageData.media)
          ? mediaArray
          : mediaArray[0];
      }
    }

    const response = await api.post(
      `/chat/conversations/${conversationId}/messages`,
      messageData,
    );
    return response.data;
  } catch (error) {
    // Silently fail for 404s (backend chat routes not implemented)
    if (error.response?.status !== 404) {
      logger.error("Error creating message", error, "ChatAPI");
    }
    throw error;
  }
};

/**
 * Update a message (e.g., mark as read)
 */
export const updateMessage = async (conversationId, messageId, updates) => {
  try {
    const response = await api.put(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
      updates,
    );
    return response.data;
  } catch (error) {
    logger.error("Error updating message", error, "ChatAPI");
    throw error;
  }
};

/**
 * Delete a message
 */
export const deleteMessage = async (conversationId, messageId) => {
  try {
    const response = await api.delete(
      `/chat/conversations/${conversationId}/messages/${messageId}`,
    );
    return response.data;
  } catch (error) {
    logger.error("Error deleting message", error, "ChatAPI");
    throw error;
  }
};

/**
 * Delete all messages in a conversation
 */
export const deleteAllMessages = async (conversationId) => {
  try {
    const response = await api.delete(
      `/chat/conversations/${conversationId}/messages`,
    );
    return response.data;
  } catch (error) {
    logger.error("Error deleting all messages", error, "ChatAPI");
    throw error;
  }
};

// ============ Utility APIs ============

/**
 * Reset all chats (for 24-hour auto-reset feature)
 */
export const resetAllChats = async () => {
  try {
    const response = await api.post("/chat/reset");
    return response.data;
  } catch (error) {
    logger.error("Error resetting chats", error, "ChatAPI");
    throw error;
  }
};

/**
 * Sync local conversations to database
 */
export const syncConversations = async (conversations) => {
  try {
    const promises = conversations.map((conv) => createConversation(conv));
    return await Promise.all(promises);
  } catch (error) {
    logger.error("Error syncing conversations", error, "ChatAPI");
    throw error;
  }
};

/**
 * Sync local messages to database
 */
export const syncMessages = async (messagesByConversation) => {
  try {
    const promises = [];
    Object.keys(messagesByConversation).forEach((convId) => {
      const messages = messagesByConversation[convId];
      messages.forEach((msg) => {
        promises.push(createMessage(convId, msg));
      });
    });
    return await Promise.all(promises);
  } catch (error) {
    logger.error("Error syncing messages", error, "ChatAPI");
    throw error;
  }
};
