import React, { useState, useEffect, useCallback } from 'react';
import {
  FaBullhorn,
  FaTimes,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBell
} from 'react-icons/fa';
import { apiHelper } from '../../utils/api';
import logger from '../../utils/logger';
import './AnnouncementBanner.scss';

// Icon map for announcement types
const ICON_MAP = {
  info: FaInfoCircle,
  announcement: FaBullhorn,
  warning: FaExclamationTriangle,
  celebration: FaCheckCircle,
  update: FaBell,
  maintenance: FaExclamationTriangle
};

/**
 * AnnouncementBanner Component
 * 
 * Displays announcements to users based on their plan and role.
 * Shows as a banner at the top of the page or as a modal.
 */
const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);

  // Fetch announcements on mount
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await apiHelper.get('/announcements/me');
        const data = response.data || [];
        setAnnouncements(data);
        
        // Check if any should be shown as modal
        const modalAnn = data.find(a => a.displayOptions?.showAsModal);
        if (modalAnn) {
          setModalAnnouncement(modalAnn);
        }
      } catch (error) {
        logger.debug('Error fetching announcements', error, 'Announcements');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  // Handle dismiss
  const handleDismiss = useCallback(async (announcementId) => {
    try {
      await apiHelper.post(`/announcements/${announcementId}/dismiss`);
      setAnnouncements(prev => prev.filter(a => a._id !== announcementId));
      
      if (modalAnnouncement?._id === announcementId) {
        setModalAnnouncement(null);
      }
    } catch (error) {
      logger.debug('Error dismissing announcement', error, 'Announcements');
    }
  }, [modalAnnouncement]);

  // Handle mark as read
  const handleMarkAsRead = useCallback(async (announcementId) => {
    try {
      await apiHelper.post(`/announcements/${announcementId}/read`);
    } catch (error) {
      logger.debug('Error marking announcement as read', error, 'Announcements');
    }
  }, []);

  // Close modal
  const handleCloseModal = useCallback(() => {
    if (modalAnnouncement) {
      handleMarkAsRead(modalAnnouncement._id);
      if (modalAnnouncement.displayOptions?.dismissible) {
        handleDismiss(modalAnnouncement._id);
      }
    }
    setModalAnnouncement(null);
  }, [modalAnnouncement, handleMarkAsRead, handleDismiss]);

  // Navigate between announcements
  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % bannerAnnouncements.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + bannerAnnouncements.length) % bannerAnnouncements.length);
  };

  // Filter for banner announcements only
  const bannerAnnouncements = announcements.filter(a => 
    a.displayOptions?.showAsBanner && !a.displayOptions?.showAsModal
  );

  if (isLoading || (bannerAnnouncements.length === 0 && !modalAnnouncement)) {
    return null;
  }

  const currentAnnouncement = bannerAnnouncements[currentIndex];
  const IconComponent = currentAnnouncement 
    ? ICON_MAP[currentAnnouncement.customStyle?.iconType] || FaBullhorn
    : FaBullhorn;

  return (
    <>
      {/* Banner */}
      {bannerAnnouncements.length > 0 && currentAnnouncement && (
        <div 
          className={`announcement-banner theme-${currentAnnouncement.theme || 'default'}`}
          style={{
            backgroundColor: currentAnnouncement.customStyle?.backgroundColor || undefined,
            color: currentAnnouncement.customStyle?.textColor || undefined,
            borderColor: currentAnnouncement.customStyle?.borderColor || undefined
          }}
        >
          <div className="announcement-banner__content">
            <div className="announcement-banner__icon">
              <IconComponent />
            </div>
            <div className="announcement-banner__text">
              <strong>{currentAnnouncement.title}</strong>
              <span>{currentAnnouncement.content}</span>
            </div>
          </div>

          <div className="announcement-banner__actions">
            {bannerAnnouncements.length > 1 && (
              <div className="announcement-banner__nav">
                <button onClick={handlePrev}>‹</button>
                <span>{currentIndex + 1} / {bannerAnnouncements.length}</span>
                <button onClick={handleNext}>›</button>
              </div>
            )}
            {currentAnnouncement.displayOptions?.dismissible && (
              <button 
                className="announcement-banner__dismiss"
                onClick={() => handleDismiss(currentAnnouncement._id)}
                aria-label="Dismiss announcement"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {modalAnnouncement && (
        <div className="announcement-modal-overlay" onClick={handleCloseModal}>
          <div 
            className={`announcement-modal theme-${modalAnnouncement.theme || 'default'}`}
            onClick={e => e.stopPropagation()}
            style={{
              borderColor: modalAnnouncement.customStyle?.borderColor || undefined
            }}
          >
            <div className="announcement-modal__header">
              <div className="announcement-modal__icon">
                {ICON_MAP[modalAnnouncement.customStyle?.iconType] 
                  ? React.createElement(ICON_MAP[modalAnnouncement.customStyle.iconType])
                  : <FaBullhorn />
                }
              </div>
              <h2>{modalAnnouncement.title}</h2>
              {modalAnnouncement.displayOptions?.dismissible && (
                <button 
                  className="announcement-modal__close"
                  onClick={handleCloseModal}
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <div className="announcement-modal__body">
              <p>{modalAnnouncement.content}</p>
            </div>
            <div className="announcement-modal__footer">
              <button 
                className="btn-primary"
                onClick={handleCloseModal}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnnouncementBanner;
