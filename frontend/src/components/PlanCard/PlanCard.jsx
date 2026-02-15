import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaCheck } from 'react-icons/fa';
import { apiHelper } from '../../utils/api';
import useConfirm from '../../hooks/useConfirm';
import './PlanCard.scss';

export const SilverStar = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4l3.5 7.1 7.8 1.1-5.7 5.5 1.4 7.8-7-3.7-7 3.7 1.4-7.8-5.7-5.5 7.8-1.1z" fill="url(#silverStarGradient)" stroke="url(#silverStarStroke)" strokeWidth="1" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="4" fill="url(#silverInner)" opacity="0.4"/>
    <path d="M16 8l2 4 4.5 0.6-3.3 3.2 0.8 4.5-4-2.1-4 2.1 0.8-4.5-3.3-3.2 4.5-0.6z" fill="url(#silverHighlight)" opacity="0.5"/>
    <defs>
      <linearGradient id="silverStarGradient" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#E8E8E8"/>
        <stop offset="50%" stopColor="#C0C0C0"/>
        <stop offset="100%" stopColor="#A8A8A8"/>
      </linearGradient>
      <linearGradient id="silverStarStroke" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#B0B0B0"/>
        <stop offset="100%" stopColor="#808080"/>
      </linearGradient>
      <radialGradient id="silverInner" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#C0C0C0"/>
      </radialGradient>
      <linearGradient id="silverHighlight" x1="16" y1="8" x2="16" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#E0E0E0"/>
      </linearGradient>
    </defs>
  </svg>
);

export const GoldStar = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4l3.5 7.1 7.8 1.1-5.7 5.5 1.4 7.8-7-3.7-7 3.7 1.4-7.8-5.7-5.5 7.8-1.1z" fill="url(#goldStarGradient)" stroke="url(#goldStarStroke)" strokeWidth="1" strokeLinejoin="round" />
    <circle cx="16" cy="16" r="4" fill="url(#goldInner)" opacity="0.5"/>
    <path d="M16 8l2 4 4.5 0.6-3.3 3.2 0.8 4.5-4-2.1-4 2.1 0.8-4.5-3.3-3.2 4.5-0.6z" fill="url(#goldHighlight)" opacity="0.6"/>
    <circle cx="13" cy="13" r="1.5" fill="#FFF9E6" opacity="0.8"/>
    <ellipse cx="20" cy="18" rx="1.2" ry="0.8" fill="#FFF4D0" opacity="0.6"/>
    <defs>
      <linearGradient id="goldStarGradient" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFD700"/>
        <stop offset="30%" stopColor="#FFA500"/>
        <stop offset="70%" stopColor="#DAA520"/>
        <stop offset="100%" stopColor="#B8860B"/>
      </linearGradient>
      <linearGradient id="goldStarStroke" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#DAA520"/>
        <stop offset="100%" stopColor="#8B6914"/>
      </linearGradient>
      <radialGradient id="goldInner" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#FFD700"/>
      </radialGradient>
      <linearGradient id="goldHighlight" x1="16" y1="8" x2="16" y2="20" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF"/>
        <stop offset="100%" stopColor="#FFE87C"/>
      </linearGradient>
    </defs>
  </svg>
);

const PlanCard = ({ tier = 'Silver', price, period, benefits = [], onContact, onActivate, highlighted = false, isCurrentPlan = false }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.settings || {});
  
  const rawUserPlan = (profile && (profile.plan || profile.subscription?.tier)) || user?.plan || 'none';
  const currentUserPlan = String(rawUserPlan || 'none').toLowerCase();
  
  const tierKey = String(tier || 'silver').toLowerCase();

  // State for admin-configured plan settings
  const [planSettings, setPlanSettings] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Fetch admin-configured plan settings
  useEffect(() => {
    const fetchPlanSettings = async () => {
      try {
        const response = await apiHelper.get('/plans/settings');
        if (response && response.plans) {
          const planData = response.plans.find(p => p.planId === tierKey);
          if (planData) {
            setPlanSettings(planData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch plan settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchPlanSettings();
  }, [tierKey]);

  const defaults = {
    silver: {
      price: '₹ 249',
      period: 'Per Month',
      benefits: [
        'Add Unlimited Services',
        'Chat with Team Members',
        'Add Unlimited Team Members',
        'Unlimited Events Creation and Tracking',
        'Unlimited Projects Creation and Tracking'
      ]
    },
    gold: {
      price: '₹ 349',
      period: 'Per Month',
      benefits: [
        'All Silver Benefits',
        'Unlimited policy Creation',
        'High priority Email support',
        'Unlimited Bill Creation and Tracking',
        'Unlimited Quotation Creation and Tracking'
      ]
    }
  };

  const meta = defaults[tierKey] || {};
  
  // Use admin settings if available, otherwise fall back to props or defaults
  const formatPrice = (amount) => `₹ ${amount.toLocaleString('en-IN')}`;
  
  let finalPrice, finalOriginalPrice, discountPercentage, offerLabel, isOfferActive;
  
  if (planSettings) {
    finalPrice = formatPrice(planSettings.price);
    finalOriginalPrice = planSettings.originalPrice !== planSettings.price ? formatPrice(planSettings.originalPrice) : null;
    discountPercentage = planSettings.discountPercentage || 0;
    offerLabel = planSettings.offerLabel || '';
    isOfferActive = planSettings.isOfferActive || false;
  } else {
    finalPrice = price || meta.price || '';
    finalOriginalPrice = null;
    discountPercentage = 0;
    offerLabel = '';
    isOfferActive = false;
  }
  
  const finalPeriod = period || (planSettings?.billingCycle === 'yearly' ? 'Per Year' : 'Per Month') || meta.period || '';
  const finalBenefits = (planSettings?.features?.length > 0 ? planSettings.features : null) || 
                        (Array.isArray(benefits) && benefits.length ? benefits : (meta.benefits || []));

  const defaultContact = () => {
    try {
      window.dispatchEvent(new CustomEvent('closePlan'));
      window.dispatchEvent(new CustomEvent('openHelp'));
    } catch (e) {
      try { navigate(`/plans?plan=${tierKey}`); } catch (err) {}
    }
  };

  const defaultActivate = async () => {
    if (isCurrentPlan) {
      if (tierKey === 'silver') {
        // Handle "Upgrade to Gold" case
        const confirmed = await confirm("Are you sure you want to upgrade to the Gold plan?", {
          title: 'Upgrade Plan',
          confirmText: 'Upgrade',
          cancelText: 'Cancel'
        });
        if (!confirmed) {
          return;
        }
        try {
          window.dispatchEvent(new CustomEvent('closePlan'));
        } catch (e) {}
        navigate('/payment?plan=gold');
        return;
      }

      if (tierKey === 'gold') {
        // Handle "Downgrade to Silver" case
        const confirmed = await confirm("Are you sure you want to downgrade to the Silver plan?", {
          title: 'Downgrade Plan',
          confirmText: 'Downgrade',
          cancelText: 'Cancel'
        });
        if (!confirmed) {
          return;
        }
        try {
          window.dispatchEvent(new CustomEvent('closePlan'));
        } catch (e) {}
        navigate('/payment?plan=silver');
        return;
      }
      
      // Already has the plan (fallback)
      try {
        window.dispatchEvent(new CustomEvent('closePlan'));
        navigate('/dashboard');
      } catch (e) {
        navigate('/dashboard');
      }
      return;
    }

    // Non-current plan interactions

    // 1. Alert if user tries to activate the same plan (e.g. if isCurrentPlan was false but tier as user plan)
    if (tierKey === currentUserPlan) {
      await confirm(`The ${tier} plan is already active on your account.`, {
        title: 'Plan Active',
        confirmText: 'OK',
        cancelText: ''
      });
      return;
    }

    // 2. Alert if changing plan
    if (currentUserPlan !== 'none' && tierKey !== currentUserPlan) {
      const confirmChange = await confirm(`Are you sure you want to change your plan from ${currentUserPlan.toUpperCase()} to ${tier.toUpperCase()}?`, {
        title: 'Change Plan',
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      });
      if (!confirmChange) return;
    }

    console.log('[PlanCard] Activate clicked, tierKey:', tierKey);
    try {
      window.dispatchEvent(new CustomEvent('closePlan'));
    } catch (e) {
      console.error('[PlanCard] Error dispatching closePlan:', e);
    }
    
    const url = `/payment?plan=${tierKey}`;
    console.log('[PlanCard] Navigating to:', url);
    navigate(url);
  };

  const handleContact = onContact || defaultContact;
  const handleActivate = onActivate || defaultActivate;

  const isGold = tierKey.includes('gold');
  const isSilver = tierKey.includes('silver');

  return (
    <div className={`plan-card ${isGold ? 'plan-card--gold' : isSilver ? 'plan-card--silver' : ''} ${highlighted ? 'plan-card--highlight':''}`}>
      {/* Discount Badge */}
      {isOfferActive && discountPercentage > 0 && (
        <div className="plan-card__discount-badge">
          {offerLabel || `${discountPercentage}% OFF`}
        </div>
      )}
      
      <div className="plan-card__header">
        <div className="plan-card__badge">{isGold ? <GoldStar /> : isSilver ? <SilverStar /> : null}</div>
        <div className="plan-card__meta">
          <h4 className='plan'>{tier}</h4>
          <div className="plan-card__note">{isGold ? 'Unlimited features' : isSilver ? 'Limited Features' : ''}</div>
        </div>
        <div className="plan-card__price-block">
          {isOfferActive && finalOriginalPrice && (
            <div className="plan-card__original-price">{finalOriginalPrice}</div>
          )}
          <div className={`plan-card__price-amount ${isOfferActive ? 'plan-card__price-amount--discounted' : ''}`}>
            {finalPrice}
          </div>
          <div className="plan-card__price-period">{finalPeriod}</div>
        </div>
      </div>

      <ul className="plan-card__list">
        {finalBenefits.map((b, i) => (
          <li key={i}><FaCheck className="plan-modal__benefit-icon" />{b}</li>
        ))}
      </ul>

      <div className="plan-card__actions">
        <button className="btn btn--outline" onClick={handleContact} type="button">Contact Us</button>
        <button className="btn btn--primary" onClick={handleActivate} type="button">
          {isCurrentPlan 
            ? (tierKey === 'silver' ? 'Upgrade to Gold' : (tierKey === 'gold' ? 'Downgrade to Silver' : 'Manage Plan')) 
            : `Activate ${tier}`}
        </button>
      </div>
    </div>
  );
};

export default PlanCard;
