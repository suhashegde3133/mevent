/**
 * Enhanced Notification System
 *
 * Provides a robust notification system with:
 * - Multiple notification types (success, error, warning, info)
 * - Customizable duration and positioning
 * - Action buttons support
 * - Queue management
 * - Accessibility support
 */

// Notification types with their styles
const NOTIFICATION_TYPES = {
  success: {
    icon: "✓",
    background: "#10b981",
    borderColor: "#059669",
    textColor: "#ffffff",
    title: "Success",
  },
  error: {
    icon: "✕",
    background: "#ef4444",
    borderColor: "#dc2626",
    textColor: "#ffffff",
    title: "Error",
  },
  warning: {
    icon: "⚠",
    background: "#f59e0b",
    borderColor: "#d97706",
    textColor: "#ffffff",
    title: "Warning",
  },
  info: {
    icon: "ℹ",
    background: "#3b82f6",
    borderColor: "#2563eb",
    textColor: "#ffffff",
    title: "Information",
  },
};

// Default options
const DEFAULT_OPTIONS = {
  type: "info",
  duration: 4000,
  position: "top-right",
  dismissible: true,
  showIcon: true,
  showTitle: true,
  action: null, // { label: 'Undo', onClick: () => {} }
};

// Container ID
const CONTAINER_ID = "mivent-notification-container";

// Notification queue for managing multiple notifications
let notificationQueue = [];
let isProcessing = false;

/**
 * Get or create the notification container
 */
const getContainer = (position = "top-right") => {
  if (typeof document === "undefined") return null;

  let container = document.getElementById(CONTAINER_ID);

  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.setAttribute("role", "alert");
    container.setAttribute("aria-live", "polite");

    // Position styles
    const positionStyles = {
      "top-right": { top: "72px", right: "20px" },
      "top-left": { top: "72px", left: "20px" },
      "bottom-right": { bottom: "20px", right: "20px" },
      "bottom-left": { bottom: "20px", left: "20px" },
      "top-center": { top: "72px", left: "50%", transform: "translateX(-50%)" },
    };

    Object.assign(container.style, {
      position: "fixed",
      zIndex: 10000,
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      maxWidth: "400px",
      pointerEvents: "none",
      ...positionStyles[position],
    });

    document.body.appendChild(container);
  }

  return container;
};

/**
 * Create a notification element
 */
const createNotificationElement = (message, options) => {
  const config = NOTIFICATION_TYPES[options.type] || NOTIFICATION_TYPES.info;

  const notification = document.createElement("div");
  notification.className = "mivent-notification";
  notification.setAttribute("role", "status");
  notification.setAttribute("aria-live", "polite");

  Object.assign(notification.style, {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    minWidth: "280px",
    maxWidth: "400px",
    background: config.background,
    color: config.textColor,
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    padding: "14px 16px",
    border: `1px solid ${config.borderColor}`,
    opacity: "0",
    transform: "translateX(100%)",
    transition: "opacity 300ms ease, transform 300ms ease",
    cursor: options.dismissible ? "pointer" : "default",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  });

  // Icon
  if (options.showIcon) {
    const iconWrapper = document.createElement("div");
    Object.assign(iconWrapper.style, {
      width: "24px",
      height: "24px",
      borderRadius: "50%",
      background: "rgba(255,255,255,0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
      fontSize: "14px",
      fontWeight: "bold",
    });
    iconWrapper.textContent = config.icon;
    notification.appendChild(iconWrapper);
  }

  // Content
  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.minWidth = "0";

  if (options.showTitle) {
    const title = document.createElement("div");
    title.style.fontWeight = "600";
    title.style.marginBottom = "4px";
    title.style.fontSize = "0.95rem";
    title.textContent = options.title || config.title;
    content.appendChild(title);
  }

  const messageEl = document.createElement("div");
  messageEl.style.fontSize = "0.9rem";
  messageEl.style.lineHeight = "1.4";
  messageEl.style.opacity = "0.95";
  messageEl.textContent = message;
  content.appendChild(messageEl);

  // Action button
  if (options.action) {
    const actionBtn = document.createElement("button");
    Object.assign(actionBtn.style, {
      marginTop: "8px",
      padding: "6px 12px",
      background: "rgba(255,255,255,0.2)",
      border: "1px solid rgba(255,255,255,0.3)",
      borderRadius: "6px",
      color: "#fff",
      fontSize: "0.85rem",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background 150ms ease",
    });
    actionBtn.textContent = options.action.label;
    actionBtn.onmouseover = () =>
      (actionBtn.style.background = "rgba(255,255,255,0.3)");
    actionBtn.onmouseout = () =>
      (actionBtn.style.background = "rgba(255,255,255,0.2)");
    actionBtn.onclick = (e) => {
      e.stopPropagation();
      options.action.onClick?.();
    };
    content.appendChild(actionBtn);
  }

  notification.appendChild(content);

  // Close button
  if (options.dismissible) {
    const closeBtn = document.createElement("button");
    Object.assign(closeBtn.style, {
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.7)",
      fontSize: "18px",
      cursor: "pointer",
      padding: "0",
      lineHeight: "1",
      marginLeft: "8px",
      transition: "color 150ms ease",
    });
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Close notification");
    closeBtn.onmouseover = () => (closeBtn.style.color = "#fff");
    closeBtn.onmouseout = () =>
      (closeBtn.style.color = "rgba(255,255,255,0.7)");
    notification.appendChild(closeBtn);
  }

  return notification;
};

/**
 * Show a notification
 * @param {string} message - The message to display
 * @param {Object} options - Configuration options
 */
export const showNotification = (message, options = {}) => {
  try {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const container = getContainer(mergedOptions.position);

    if (!container) return null;

    const notification = createNotificationElement(message, mergedOptions);
    container.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateX(0)";
    });

    // Hide function
    const hide = () => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => {
        try {
          container.removeChild(notification);
          if (container.childElementCount === 0) {
            container.parentNode?.removeChild(container);
          }
        } catch (e) {
          // Element already removed
        }
      }, 300);
    };

    // Auto-dismiss timer
    let timer = null;
    if (mergedOptions.duration > 0) {
      timer = setTimeout(hide, mergedOptions.duration);
    }

    // Click to dismiss
    if (mergedOptions.dismissible) {
      notification.addEventListener("click", () => {
        if (timer) clearTimeout(timer);
        hide();
      });
    }

    return { hide, element: notification };
  } catch (err) {
    // Non-critical - swallow errors
    return null;
  }
};

/**
 * Convenience methods for different notification types
 */
export const notify = {
  success: (message, options = {}) =>
    showNotification(message, { ...options, type: "success" }),

  error: (message, options = {}) =>
    showNotification(message, { ...options, type: "error" }),

  warning: (message, options = {}) =>
    showNotification(message, { ...options, type: "warning" }),

  info: (message, options = {}) =>
    showNotification(message, { ...options, type: "info" }),
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = () => {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.innerHTML = "";
  }
};

export default notify;
