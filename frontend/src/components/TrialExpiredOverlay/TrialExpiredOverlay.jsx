import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaExclamationTriangle } from 'react-icons/fa';
import PlanCard from '../PlanCard/PlanCard';
import { GoldStar, SilverStar } from '../PlanCard/PlanCard';
import './TrialExpiredOverlay.scss';

/**
 * TrialExpiredOverlay - Full-screen blocking overlay when trial has expired
 * Forces user to choose a plan before they can continue using the platform
 */
const TrialExpiredOverlay = ({ isVisible, daysExpired = 0 }) => {
  const navigate = useNavigate();

  if (!isVisible) {
    return null;
  }

  return (
    <div className="trial-expired-overlay">
      <div className="trial-expired-overlay__backdrop" />
      
      <div className="trial-expired-overlay__content">
        <div className="trial-expired-overlay__header">
          <div className="trial-expired-overlay__icon-wrapper">
            <FaExclamationTriangle className="trial-expired-overlay__icon" />
          </div>
          <h1 className="trial-expired-overlay__title">Your Free Trial Has Ended</h1>
          <p className="trial-expired-overlay__subtitle">
            {daysExpired > 0 
              ? `Your trial expired ${daysExpired} ${daysExpired === 1 ? 'day' : 'days'} ago.`
              : 'Your 15-day free trial period has ended.'
            }
          </p>
          <p className="trial-expired-overlay__description">
            Subscribe to one of our plans to continue using all platform features.
          </p>
        </div>

        <div className="trial-expired-overlay__body">
          <div className="trial-expired-overlay__plans">
            <PlanCard tier="Silver" />
            <PlanCard tier="Gold" highlighted />
          </div>

          <div className="trial-expired-overlay__features">
            <div className="trial-expired-overlay__feature-item">
              <SilverStar />
              <span><strong>Silver Plan</strong> - Perfect for individuals and small teams</span>
            </div>
            <div className="trial-expired-overlay__feature-item">
              <GoldStar />
              <span><strong>Gold Plan</strong> - Best for growing businesses with advanced needs</span>
            </div>
          </div>
        </div>

        <div className="trial-expired-overlay__footer">
          <div className="trial-expired-overlay__locked-notice">
            <FaLock />
            <span>All features are locked until you activate a plan</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialExpiredOverlay;
