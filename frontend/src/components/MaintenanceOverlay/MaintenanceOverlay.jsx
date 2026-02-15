import React from 'react';
import { FaTools, FaClock, FaEnvelope } from 'react-icons/fa';
import './MaintenanceOverlay.scss';

/**
 * MaintenanceOverlay - Full-screen blocking overlay shown during maintenance mode
 * Displays a maintenance message to users whose tier is affected
 */
const MaintenanceOverlay = ({ 
  isVisible, 
  title = 'System Maintenance',
  message = "We're currently performing maintenance. Please check back soon.",
  estimatedEndTime = null
}) => {
  if (!isVisible) {
    return null;
  }

  const formatEstimatedTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if the estimated time has passed
    if (date < now) return null;
    
    // Format the date nicely
    const options = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString('en-US', options);
  };

  const estimatedTimeFormatted = formatEstimatedTime(estimatedEndTime);

  const handleContactClick = () => {
    try {
      window.dispatchEvent(new Event('openHelp'));
    } catch (err) {
      console.error('Failed to open help:', err);
    }
  };

  return (
    <div className="maintenance-overlay">
      <div className="maintenance-overlay__backdrop" />
      
      <div className="maintenance-overlay__content">
        <div className="maintenance-overlay__icon-wrapper">
          <div className="maintenance-overlay__icon-bg">
            <FaTools className="maintenance-overlay__icon" />
          </div>
          <div className="maintenance-overlay__gears">
            <span className="gear gear-1">⚙</span>
            <span className="gear gear-2">⚙</span>
          </div>
        </div>
        
        <h1 className="maintenance-overlay__title">{title}</h1>
        
        <p className="maintenance-overlay__message">{message}</p>
        
        {estimatedTimeFormatted && (
          <div className="maintenance-overlay__estimated">
            <FaClock className="maintenance-overlay__estimated-icon" />
            <span>Expected completion: {estimatedTimeFormatted}</span>
          </div>
        )}
        
        <div className="maintenance-overlay__divider">
          <span></span>
        </div>
        
        <div className="maintenance-overlay__info">
          <p>We apologize for any inconvenience. Our team is working to complete the maintenance as quickly as possible.</p>
        </div>
        
        <button
          className="maintenance-overlay__contact"
          onClick={handleContactClick}
          type="button"
          aria-label="Open contact form"
        >
          <a href="mailto:miventsite@gmail.com"><span>Any Questions? Contact Support<br />miventsite@gmail.com</span></a>
        </button>

        <div className="maintenance-overlay__animation">
          <div className="progress-bar">
            <div className="progress-bar__fill"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceOverlay;
