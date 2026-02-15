import React from 'react';
import { FaCrown, FaLock, FaTimes } from 'react-icons/fa';
import PlanCard from '../PlanCard/PlanCard';
import { GoldStar } from '../PlanCard/PlanCard';
import './PlanUpgradeModal.scss';

/**
 * PlanUpgradeModal - Shows when user tries to access Gold-only features
 * Prompts user to upgrade their plan
 */
const PlanUpgradeModal = ({ isOpen, onClose, featureName = 'this feature', currentPlan = 'silver' }) => {
  if (!isOpen) {
    return null;
  }

  const planLabel = currentPlan === 'silver' ? 'Silver' : 'Free Trial';

  return (
    <div className="plan-upgrade-overlay" onClick={onClose}>
      <div className="plan-upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="plan-upgrade-modal__close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        {/* Header */}
        <div className="plan-upgrade-modal__header">
          <div className="plan-upgrade-modal__icon-wrapper">
            <FaCrown className="plan-upgrade-modal__icon" />
          </div>
          <h2 className="plan-upgrade-modal__title">Upgrade to Gold</h2>
          <p className="plan-upgrade-modal__subtitle">
            <FaLock className="plan-upgrade-modal__lock" />
            <span><strong>{featureName}</strong> requires the Gold plan</span>
          </p>
        </div>

        {/* Body */}
        <div className="plan-upgrade-modal__body">
          <div className="plan-upgrade-modal__current">
            <span className="plan-upgrade-modal__current-label">Your current plan:</span>
            <span className="plan-upgrade-modal__current-plan">{planLabel}</span>
          </div>

          <p className="plan-upgrade-modal__description">
            Unlock advanced features like Quotations, Billing, and Policy management with our Gold plan.
          </p>

          <div className="plan-upgrade-modal__card">
            <PlanCard tier="Gold" highlighted />
          </div>

          <div className="plan-upgrade-modal__benefits">
            <h4>Gold Plan Exclusive Features:</h4>
            <ul>
              <li><GoldStar /> Unlimited Quotation Creation and Tracking</li>
              <li><GoldStar /> Unlimited Bill Creation and Tracking</li>
              <li><GoldStar /> Unlimited Policy Creation</li>
              <li><GoldStar /> High Priority Email Support</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="plan-upgrade-modal__footer">
          <button className="plan-upgrade-modal__cancel" onClick={onClose}>
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanUpgradeModal;
