import React, { useState, useEffect } from 'react';
import { 
  FaSave, 
  FaPercent,
  FaRupeeSign,
  FaCalendarAlt,
  FaTag,
  FaGift,
  FaToggleOn,
  FaToggleOff,
  FaEdit,
  FaTimes,
  FaCheck,
  FaHistory,
  FaStar
} from 'react-icons/fa';
import { GoldStar, SilverStar } from '../../components/PlanCard/PlanCard';
import { apiHelper } from '../../utils/api';
import './Admin.scss';

const DEFAULT_PLANS = {
  silver: {
    planId: 'silver',
    name: 'Silver',
    price: 999,
    originalPrice: 999,
    discountPercentage: 0,
    offerStartDate: null,
    offerEndDate: null,
    offerEnabled: false,
    offerLabel: '',
    features: [
      'All Free features',
      '10GB storage',
      'Priority support',
      'Advanced analytics'
    ],
    billingCycle: 'yearly',
    isActive: true
  },
  gold: {
    planId: 'gold',
    name: 'Gold',
    price: 1999,
    originalPrice: 1999,
    discountPercentage: 0,
    offerStartDate: null,
    offerEndDate: null,
    offerEnabled: false,
    offerLabel: '',
    features: [
      'All Silver features',
      'Unlimited storage',
      '24/7 support',
      'Custom branding',
      'API access'
    ],
    billingCycle: 'yearly',
    isActive: true
  }
};

const PlanSettings = () => {
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current plan settings
  useEffect(() => {
    fetchPlanSettings();
  }, []);

  const fetchPlanSettings = async () => {
    try {
      setLoading(true);
      const data = await apiHelper.get('/admin/plan-settings');
      if (data && data.plans) {
        const plansObj = {};
        data.plans.forEach(plan => {
          plansObj[plan.planId] = {
            ...DEFAULT_PLANS[plan.planId],
            ...plan,
            offerStartDate: plan.offerStartDate ? plan.offerStartDate.split('T')[0] : '',
            offerEndDate: plan.offerEndDate ? plan.offerEndDate.split('T')[0] : ''
          };
        });
        // Merge with defaults for any missing plans
        setPlans({
          ...DEFAULT_PLANS,
          ...plansObj
        });
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching plan settings:', err);
      // Use defaults if API fails
      setPlans(DEFAULT_PLANS);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (planId) => {
    try {
      setSaving(true);
      const plan = plans[planId];
      
      // Calculate discounted price
      const discountedPrice = plan.offerEnabled && plan.discountPercentage > 0
        ? Math.round(plan.originalPrice * (1 - plan.discountPercentage / 100))
        : plan.originalPrice;

      await apiHelper.put('/admin/plan-settings', {
        planId,
        name: plan.name,
        price: discountedPrice,
        originalPrice: plan.originalPrice,
        discountPercentage: plan.discountPercentage,
        offerStartDate: plan.offerStartDate || null,
        offerEndDate: plan.offerEndDate || null,
        offerEnabled: plan.offerEnabled,
        offerLabel: plan.offerLabel,
        features: plan.features,
        billingCycle: plan.billingCycle,
        isActive: plan.isActive
      });

      setEditingPlan(null);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      await fetchPlanSettings();
    } catch (err) {
      console.error('Error saving plan:', err);
      setError('Failed to save plan settings');
    } finally {
      setSaving(false);
    }
  };

  const handlePlanChange = (planId, field, value) => {
    setPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        [field]: value
      }
    }));
  };

  const handleFeatureChange = (planId, index, value) => {
    setPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        features: prev[planId].features.map((f, i) => i === index ? value : f)
      }
    }));
  };

  const addFeature = (planId) => {
    setPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        features: [...prev[planId].features, '']
      }
    }));
  };

  const removeFeature = (planId, index) => {
    setPlans(prev => ({
      ...prev,
      [planId]: {
        ...prev[planId],
        features: prev[planId].features.filter((_, i) => i !== index)
      }
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateDiscountedPrice = (plan) => {
    if (!plan.offerEnabled || !plan.discountPercentage) return plan.originalPrice;
    return Math.round(plan.originalPrice * (1 - plan.discountPercentage / 100));
  };

  const isOfferActive = (plan) => {
    if (!plan.offerEnabled) return false;
    const now = new Date();
    const start = plan.offerStartDate ? new Date(plan.offerStartDate) : null;
    const end = plan.offerEndDate ? new Date(plan.offerEndDate) : null;
    
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  const getPlanIcon = (planId) => {
    return planId === 'gold' ? <GoldStar /> : <SilverStar />;
  };

  if (loading) {
    return (
      <div className="admin-plan-settings">
        <div className="admin-loading">
          <div className="admin-loading__spinner" />
          <p>Loading plan settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-plan-settings">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header__left">
          <h2>Plan Settings</h2>
          <p>Manage subscription plan pricing and offers</p>
        </div>
        {showSuccessMessage && (
          <div className="admin-success-message">
            <FaCheck /> Plan settings saved successfully!
          </div>
        )}
      </div>

      {error && (
        <div className="admin-error-banner">
          {error}
          <button onClick={() => setError(null)}><FaTimes /></button>
        </div>
      )}

      {/* Plan Cards */}
      <div className="plan-settings-grid">
        {['silver', 'gold'].map((planId) => {
          const plan = plans[planId];
          const isEditing = editingPlan === planId;
          const discountedPrice = calculateDiscountedPrice(plan);
          const offerActive = isOfferActive(plan);

          return (
            <div 
              key={planId} 
              className={`plan-settings-card plan-settings-card--${planId} ${isEditing ? 'plan-settings-card--editing' : ''}`}
            >
              {/* Card Header */}
              <div className="plan-settings-card__header">
                <div className="plan-settings-card__icon">
                  {getPlanIcon(planId)}
                </div>
                <div className="plan-settings-card__title">
                  <h3>{plan.name} Plan</h3>
                  {offerActive && plan.offerLabel && (
                    <span className="plan-settings-card__offer-badge">
                      <FaGift /> {plan.offerLabel}
                    </span>
                  )}
                </div>
                {!isEditing ? (
                  <button 
                    className="plan-settings-card__edit-btn"
                    onClick={() => setEditingPlan(planId)}
                  >
                    <FaEdit /> Edit
                  </button>
                ) : (
                  <button 
                    className="plan-settings-card__cancel-btn"
                    onClick={() => {
                      setEditingPlan(null);
                      fetchPlanSettings();
                    }}
                  >
                    <FaTimes /> Cancel
                  </button>
                )}
              </div>

              {/* Price Section */}
              <div className="plan-settings-card__price-section">
                {isEditing ? (
                  <div className="plan-settings-card__price-edit">
                    <div className="plan-settings-field">
                      <label><FaRupeeSign /> Base Price (INR)</label>
                      <input
                        type="number"
                        value={plan.originalPrice}
                        onChange={(e) => handlePlanChange(planId, 'originalPrice', parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div className="plan-settings-field">
                      <label>Billing Cycle</label>
                      <select
                        value={plan.billingCycle}
                        onChange={(e) => handlePlanChange(planId, 'billingCycle', e.target.value)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="plan-settings-card__price-display">
                    {plan.offerEnabled && plan.discountPercentage > 0 ? (
                      <>
                        <span className="plan-settings-card__original-price">
                          {formatCurrency(plan.originalPrice)}
                        </span>
                        <span className="plan-settings-card__current-price">
                          {formatCurrency(discountedPrice)}
                        </span>
                      </>
                    ) : (
                      <span className="plan-settings-card__current-price">
                        {formatCurrency(plan.originalPrice)}
                      </span>
                    )}
                    <span className="plan-settings-card__billing-cycle">
                      / {plan.billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                )}
              </div>

              {/* Offer Section */}
              <div className="plan-settings-card__offer-section">
                <div className="plan-settings-card__section-header">
                  <h4><FaGift /> Special Offer</h4>
                  {isEditing && (
                    <button 
                      className={`plan-settings-toggle ${plan.offerEnabled ? 'active' : ''}`}
                      onClick={() => handlePlanChange(planId, 'offerEnabled', !plan.offerEnabled)}
                    >
                      {plan.offerEnabled ? <FaToggleOn /> : <FaToggleOff />}
                      {plan.offerEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  )}
                </div>

                {isEditing && plan.offerEnabled && (
                  <div className="plan-settings-card__offer-fields">
                    <div className="plan-settings-field">
                      <label><FaPercent /> Discount Percentage</label>
                      <input
                        type="number"
                        value={plan.discountPercentage}
                        onChange={(e) => handlePlanChange(planId, 'discountPercentage', parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                      />
                    </div>
                    <div className="plan-settings-field">
                      <label><FaTag /> Offer Label</label>
                      <input
                        type="text"
                        value={plan.offerLabel}
                        onChange={(e) => handlePlanChange(planId, 'offerLabel', e.target.value)}
                        placeholder="e.g., New Year Sale"
                      />
                    </div>
                    <div className="plan-settings-field">
                      <label><FaCalendarAlt /> Start Date</label>
                      <input
                        type="date"
                        value={plan.offerStartDate || ''}
                        onChange={(e) => handlePlanChange(planId, 'offerStartDate', e.target.value)}
                      />
                    </div>
                    <div className="plan-settings-field">
                      <label><FaCalendarAlt /> End Date</label>
                      <input
                        type="date"
                        value={plan.offerEndDate || ''}
                        onChange={(e) => handlePlanChange(planId, 'offerEndDate', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {!isEditing && plan.offerEnabled && (
                  <div className="plan-settings-card__offer-info">
                    <div className="plan-settings-card__offer-stat">
                      <span className="label">Discount</span>
                      <span className="value">{plan.discountPercentage}% OFF</span>
                    </div>
                    {plan.offerStartDate && (
                      <div className="plan-settings-card__offer-stat">
                        <span className="label">Valid From</span>
                        <span className="value">{new Date(plan.offerStartDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {plan.offerEndDate && (
                      <div className="plan-settings-card__offer-stat">
                        <span className="label">Valid Until</span>
                        <span className="value">{new Date(plan.offerEndDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className={`plan-settings-card__offer-status ${offerActive ? 'active' : 'inactive'}`}>
                      {offerActive ? 'Offer Active' : 'Offer Inactive'}
                    </div>
                  </div>
                )}

                {!isEditing && !plan.offerEnabled && (
                  <div className="plan-settings-card__no-offer">
                    No active offer
                  </div>
                )}
              </div>

              {/* Features Section */}
              <div className="plan-settings-card__features-section">
                <h4>Features</h4>
                {isEditing ? (
                  <div className="plan-settings-card__features-edit">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="plan-settings-feature-input">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => handleFeatureChange(planId, index, e.target.value)}
                          placeholder="Feature description"
                        />
                        <button 
                          className="remove-feature-btn"
                          onClick={() => removeFeature(planId, index)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ))}
                    <button 
                      className="add-feature-btn"
                      onClick={() => addFeature(planId)}
                    >
                      + Add Feature
                    </button>
                  </div>
                ) : (
                  <ul className="plan-settings-card__features-list">
                    {plan.features.map((feature, index) => (
                      <li key={index}><FaCheck /> {feature}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Save Button */}
              {isEditing && (
                <div className="plan-settings-card__actions">
                  <button 
                    className="admin-btn admin-btn--primary"
                    onClick={() => handleSavePlan(planId)}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : <><FaSave /> Save Changes</>}
                  </button>
                </div>
              )}

              {/* Last Updated */}
              {plan.updatedAt && (
                <div className="plan-settings-card__updated">
                  <FaHistory /> Last updated: {new Date(plan.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview Section */}
      <div className="plan-settings-preview">
        <h3>Pricing Preview (As users will see)</h3>
        <div className="plan-preview-cards">
          {['silver', 'gold'].map((planId) => {
            const plan = plans[planId];
            const discountedPrice = calculateDiscountedPrice(plan);
            const offerActive = isOfferActive(plan);

            return (
              <div key={planId} className={`plan-preview-card plan-preview-card--${planId}`}>
                {offerActive && plan.offerLabel && (
                  <div className="plan-preview-card__badge">{plan.offerLabel}</div>
                )}
                <div className="plan-preview-card__icon">{getPlanIcon(planId)}</div>
                <h4>{plan.name}</h4>
                <div className="plan-preview-card__price">
                  {offerActive && plan.discountPercentage > 0 ? (
                    <>
                      <span className="original">{formatCurrency(plan.originalPrice)}</span>
                      <span className="discounted">{formatCurrency(discountedPrice)}</span>
                    </>
                  ) : (
                    <span className="regular">{formatCurrency(plan.originalPrice)}</span>
                  )}
                  <span className="cycle">/{plan.billingCycle === 'yearly' ? 'year' : 'month'}</span>
                </div>
                {offerActive && plan.discountPercentage > 0 && (
                  <div className="plan-preview-card__savings">
                    Save {formatCurrency(plan.originalPrice - discountedPrice)}!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlanSettings;
