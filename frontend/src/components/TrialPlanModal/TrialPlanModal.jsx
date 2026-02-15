import React, { useMemo } from 'react';
import { FaClock, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import PlanCard from '../PlanCard/PlanCard';
import { GoldStar, SilverStar } from '../PlanCard/PlanCard';
import './TrialPlanModal.scss';

const TRIAL_DAYS = 15;

/**
 * TrialPlanModal - Shows trial period info and plan options for new/unactivated users
 * 
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Callback to close the modal
 * @param {Date|string} createdAt - User's registration date
 * @param {string} currentPlan - User's current plan (e.g., 'free', 'none', 'silver', 'gold')
 */
const TrialPlanModal = ({ isOpen, onClose, createdAt, currentPlan = 'free' }) => {
  // Calculate remaining trial days
  const trialInfo = useMemo(() => {
    if (!createdAt) {
      return { daysRemaining: TRIAL_DAYS, daysUsed: 0, isExpired: false, percentRemaining: 100 };
    }

    const registrationDate = new Date(createdAt);
    const now = new Date();
    const diffTime = now - registrationDate;
    const daysUsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, TRIAL_DAYS - daysUsed);
    const isExpired = daysRemaining <= 0;
    const percentRemaining = Math.round((daysRemaining / TRIAL_DAYS) * 100);

    return { daysRemaining, daysUsed, isExpired, percentRemaining };
  }, [createdAt]);

  // Check if user has an active paid plan
  const hasPaidPlan = useMemo(() => {
    const plan = String(currentPlan || '').toLowerCase();
    return plan === 'silver' || plan === 'gold';
  }, [currentPlan]);

  // Don't show modal if user has a paid plan
  if (!isOpen || hasPaidPlan) {
    return null;
  }

  const { daysRemaining, isExpired, percentRemaining } = trialInfo;

  // Determine urgency level for styling
  const urgencyClass = isExpired 
    ? 'trial-modal--expired' 
    : daysRemaining <= 3 
      ? 'trial-modal--critical' 
      : daysRemaining <= 7 
        ? 'trial-modal--warning' 
        : '';

  return (
    <div className="trial-modal-overlay" onClick={onClose}>
      <div className={`trial-modal ${urgencyClass}`} onClick={(e) => e.stopPropagation()}>
        <button className="trial-modal__close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        {/* Header with trial days info */}
        <div className="trial-modal__header">
          <div className="trial-modal__header-content">
            <div className="trial-modal__icon-wrapper">
              {isExpired ? (
                <FaExclamationTriangle className="trial-modal__icon trial-modal__icon--expired" />
              ) : (
                <FaClock className="trial-modal__icon" />
              )}
            </div>
            <div className="trial-modal__header-text">
              <h2 className="trial-modal__title">
                {isExpired ? 'Free Trial Ended' : 'Free Trial Period'}
              </h2>
              <p className="trial-modal__subtitle">
                {isExpired 
                  ? 'Your 15-day free trial has ended. Subscribe to continue using all features.'
                  : 'Explore all features during your trial period'
                }
              </p>
            </div>
          </div>

          {/* Days counter */}
          <div className="trial-modal__days-container">
            <div className={`trial-modal__days-circle ${isExpired ? 'trial-modal__days-circle--expired' : ''}`}>
              <span className="trial-modal__days-number">{daysRemaining}</span>
              <span className="trial-modal__days-label">Days Left</span>
            </div>
            {!isExpired && (
              <div className="trial-modal__progress-bar">
                <div 
                  className="trial-modal__progress-fill" 
                  style={{ width: `${percentRemaining}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Plan cards */}
        <div className="trial-modal__body">
          <p className="trial-modal__lead">
            {isExpired 
              ? 'Choose a plan to unlock all features and continue your journey'
              : 'Choose a plan to continue after your trial ends'
            }
          </p>

          <div className="trial-modal__plans">
            <PlanCard tier="Silver" />
            <PlanCard tier="Gold" highlighted />
          </div>

          <div className="trial-modal__features-note">
            <div className="trial-modal__feature-item">
              <SilverStar />
              <span>Silver - Perfect for individuals and small teams</span>
            </div>
            <div className="trial-modal__feature-item">
              <GoldStar />
              <span>Gold - Best for growing businesses with advanced needs</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="trial-modal__footer">
          <button className="trial-modal__skip-btn" onClick={onClose}>
            {isExpired ? 'Continue with Limited Access' : 'Continue Trial'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialPlanModal;
