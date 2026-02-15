import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBell,
  FaCheck,
  FaCheckDouble,
  FaTimes,
  FaTrash,
  FaBullhorn,
  FaCreditCard,
  FaUsers,
  FaCalendarAlt,
  FaInfoCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { apiHelper } from '../../utils/api';
import logger from '../../utils/logger';
import { showNotification } from '../../utils/notifications';
import './NotificationPanel.scss';

// Icon map for notification types
const NOTIFICATION_ICONS = {
  announcement: FaBullhorn,
  payment: FaCreditCard,
  team: FaUsers,
  event: FaCalendarAlt,
  system: FaInfoCircle,
  plan: FaExclamationTriangle,
  security: FaExclamationTriangle,
  info: FaInfoCircle,
  success: FaCheck,
  warning: FaExclamationTriangle,
  error: FaTimes,
  quotation: FaInfoCircle, // Using info icon for quotations
};

/**
 * NotificationPanel Component
 * 
 * A dropdown panel that shows user notifications.
 * Includes bell icon with unread badge.
 */
const NotificationPanel = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [filter, setFilter] = useState('all');
  const panelRef = useRef(null);
  const lastCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await apiHelper.get('/notifications/unread-count');
      const newCount = response.data?.count || 0;

      // If count increased, fetch latest notification and show toast
      if (!isFirstLoadRef.current && newCount > lastCountRef.current) {
        try {
          // Fetch only the most recent unread notification
          const latestResponse = await apiHelper.get('/notifications?limit=1&unreadOnly=true');
          if (latestResponse.data && latestResponse.data.length > 0) {
            const latest = latestResponse.data[0];
            showNotification(latest.message, {
              title: latest.title,
              type: latest.type === 'error' ? 'error' : (latest.type === 'warning' ? 'warning' : 'info'),
              duration: 5000
            });
          }
        } catch (err) {
          logger.debug('Error fetching latest notification for toast', err);
        }
      }

      setUnreadCount(newCount);
      lastCountRef.current = newCount;
      isFirstLoadRef.current = false;
    } catch (error) {
      logger.debug('Error fetching unread count', error, 'Notifications');
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const response = await apiHelper.get(`/notifications${params}`);
      const data = response.data || [];
      setNotifications(data);
      
      // Update count contextually
      const count = response.unreadCount !== undefined ? response.unreadCount : (data.filter(n => !n.read).length);
      setUnreadCount(count);
      lastCountRef.current = count;
    } catch (error) {
      logger.debug('Error fetching notifications', error, 'Notifications');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Initial fetch of unread count
  useEffect(() => {
    fetchUnreadCount();
    
    // Poll for new notifications every 15 seconds for "instant" feel
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, filter, fetchNotifications]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single as read
  const handleMarkAsRead = async (id) => {
    try {
      await apiHelper.post(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => {
        const next = Math.max(0, prev - 1);
        lastCountRef.current = next;
        return next;
      });
    } catch (error) {
      logger.debug('Error marking as read', error, 'Notifications');
    }
  };

  // Handle notification item click
  const handleItemClick = (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }

    if (notification.actionUrl) {
      const [path, query] = notification.actionUrl.split('?');
      const params = new URLSearchParams(query);
      const id = params.get('id');

      // Navigate to path
      navigate(path);

      // Dispatch event to open specific view
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ui:notification', {
          detail: {
            path: path,
            state: { openViewId: id }
          }
        }));
      }, 150);

      setIsOpen(false);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await apiHelper.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      lastCountRef.current = 0;
    } catch (error) {
      logger.debug('Error marking all as read', error, 'Notifications');
    }
  };

  // Dismiss notification
  const handleDismiss = async (id) => {
    try {
      await apiHelper.post(`/notifications/${id}/dismiss`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error) {
      logger.debug('Error dismissing notification', error, 'Notifications');
    }
  };

  // Clear all notifications (dismiss each and remove from UI)
  const handleClearAll = async () => {
    if (!notifications || notifications.length === 0) return;
    setIsClearing(true);
    try {
      const ids = notifications.map(n => n._id);
      await Promise.all(ids.map(id => apiHelper.post(`/notifications/${id}/dismiss`)));
      setNotifications([]);
      setUnreadCount(0);
      lastCountRef.current = 0;
      showNotification('All notifications cleared', { type: 'success', duration: 2500 });
    } catch (error) {
      logger.debug('Error clearing notifications', error, 'Notifications');
      showNotification('Failed to clear notifications', { type: 'error' });
    } finally {
      setIsClearing(false);
    }
  };

  // Format relative time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Get icon component for notification
  const getIcon = (notification) => {
    const iconKey = notification.icon || notification.type;
    const IconComponent = NOTIFICATION_ICONS[iconKey] || FaBell;
    return <IconComponent />;
  };

  return (
    <div className="notification-panel-container" ref={panelRef}>
      {/* Bell Button */}
      <button 
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel__header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
              >
                <FaCheckDouble /> Mark all read
              </button>
            )}
          </div>

          {/* <div className="notification-panel__filters">
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={filter === 'announcement' ? 'active' : ''}
              onClick={() => setFilter('announcement')}
            >
              Announcements
            </button>
            <button 
              className={filter === 'system' ? 'active' : ''}
              onClick={() => setFilter('system')}
            >
              System
            </button>
          </div> */}

          <div className="notification-panel__list">
            {isLoading ? (
              <div className="notification-loading">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <FaBell />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification._id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.actionUrl ? 'clickable' : ''}`}
                  onClick={() => handleItemClick(notification)}
                >
                  <div className={`notification-item__icon type-${notification.type}`}>
                    {getIcon(notification)}
                  </div>
                  <div className="notification-item__content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-item__time">
                      {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <div className="notification-item__actions">
                    {!notification.read && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification._id);
                        }}
                        title="Mark as read"
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification._id);
                      }}
                      title="Dismiss"
                      className="dismiss-btn"
                    >
                      <FaTimes />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-panel__footer">
              <button
                className="clear-all-btn"
                onClick={handleClearAll}
                disabled={isClearing}
                title="Clear all notifications"
              >
                <FaTrash /> Clear all
              </button>
              <button onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
