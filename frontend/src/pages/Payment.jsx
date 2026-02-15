import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { updateUser } from '../redux/slices/authSlice';
import PayPolicy from '../components/PayPolicy/PayPolicy';
import { apiHelper } from '../utils/api';
import './Payment.scss';

const PRICE_MAP = {
  silver: {
    price: '₹ 3,048',
    priceNumber: 3048,
    period: 'per Year (incl. all tax and fees)',
    billing: 'Annual billing',
    features: [
      'Add Unlimited Services',
      'Chat with Team Members',
      'Add Unlimited Team Members',
      'Unlimited Events Creation and Tracking',
      'Unlimited Projects Creation and Tracking'
    ],
  },
  gold: {
    price: '₹ 4,272',
    priceNumber: 4272,
    period: 'per Year (incl. all tax and fees)',
    billing: 'Annual billing',
    features: [
      'All Silver Benefits',
      'Unlimited policy Creation',
      'High priority Email support',
      'Unlimited Bill Creation and Tracking',
      'Unlimited Quotation Creation and Tracking'
    ],
  },
};

const Payment = () => {
  const [searchParams] = useSearchParams();
  const plan = (searchParams.get('plan') || 'silver').toLowerCase();
  const meta = PRICE_MAP[plan] || PRICE_MAP.silver;

  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [planSettings, setPlanSettings] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Fetch admin-configured plan settings
  useEffect(() => {
    const fetchPlanSettings = async () => {
      try {
        const response = await apiHelper.get('/plans/settings');
        if (response && response.plans) {
          const planData = response.plans.find(p => p.planId === plan);
          if (planData) {
            setPlanSettings(planData);
          }
        }
      } catch (err) {
        console.error('Failed to fetch plan settings:', err);
      }
    };

    fetchPlanSettings();
  }, [plan]);

  // Use admin settings if available, otherwise fall back to defaults
  const formatPrice = (amount) => `₹ ${amount.toLocaleString('en-IN')}`;
  
  // Calculate yearly price from monthly: (monthly * 12) + 2% tax
  const calculateYearlyPrice = (monthlyPrice) => {
    const baseYearly = monthlyPrice * 12;
    const withTax = baseYearly * 1.02; // Add 2% tax
    return Math.round(withTax);
  };
  
  let displayPrice, displayOriginalPrice, yearlyPrice, yearlyOriginalPrice, discountPercentage, offerLabel, isOfferActive, displayFeatures;
  
  if (planSettings) {
    // Calculate yearly prices from monthly prices
    yearlyPrice = calculateYearlyPrice(planSettings.price);
    yearlyOriginalPrice = planSettings.originalPrice !== planSettings.price 
      ? calculateYearlyPrice(planSettings.originalPrice) 
      : null;
    
    displayPrice = formatPrice(yearlyPrice);
    displayOriginalPrice = yearlyOriginalPrice ? formatPrice(yearlyOriginalPrice) : null;
    discountPercentage = planSettings.discountPercentage || 0;
    offerLabel = planSettings.offerLabel || '';
    isOfferActive = planSettings.isOfferActive || false;
    displayFeatures = planSettings.features || meta.features;
  } else {
    displayPrice = meta.price;
    displayOriginalPrice = null;
    yearlyPrice = meta.priceNumber;
    yearlyOriginalPrice = null;
    discountPercentage = 0;
    offerLabel = '';
    isOfferActive = false;
    displayFeatures = meta.features;
  }

  const handlePay = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      alert('Please enter name, email and phone number');
      return;
    }

    if (!window.Razorpay) {
      alert('Razorpay SDK failed to load. Please check your internet connection.');
      setLoading(false);
      return;
    }

    const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      alert('Razorpay Key is missing. Please restart your frontend development server after updating the .env file.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Create order on backend
      // Use calculated yearly price from admin settings if available, otherwise use default
      const amount = planSettings ? yearlyPrice : meta.priceNumber;
      const order = await apiHelper.post('/payments/order', {
        amount,
        receipt: `receipt_${Date.now()}`
      });

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "MIVENT",
        description: `${plan.toUpperCase()} Plan Subscription`,
        order_id: order.id,
        handler: async (response) => {
          try {
            // 3. Verify payment on backend
            const verifyData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan
            };
            const result = await apiHelper.post('/payments/verify', verifyData);
            if (result.success) {
              dispatch(updateUser({ plan }));
              setSuccess(true);
              try { window.dispatchEvent(new CustomEvent('closePlan')); } catch (e) {}
            } else {
              alert("Payment verification failed");
            }
          } catch (err) {
            console.error(err);
            alert("Error during payment verification");
          }
        },
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
          method: 'upi'
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [
                  {
                    method: "upi",
                    vpa: true,
                    upi_qr: true
                  }
                ]
              }
            },
            sequence: ["block.upi", "block.cards", "block.netbanking", "block.wallet"],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        notes: {
          plan: plan
        },
        theme: {
          color: "#007bff",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert("Payment Failed: " + response.error.description);
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Payment initialization failed. Try again later.';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-card">
        <div className={`payment-card__left ${plan}`}>
          {/* Discount Badge */}
          {isOfferActive && discountPercentage > 0 && (
            <div className="payment-discount-badge">
              {offerLabel || `${discountPercentage}% OFF`}
            </div>
          )}
          
          <div className={`payment-plan ${plan}`}>
            <div className="badge">{plan === 'gold' ? 'Gold' : 'Silver'}</div>
            <h3 className="plan-title">{plan.charAt(0).toUpperCase() + plan.slice(1)} Plan</h3>
            
            {/* Price with discount */}
            <div className="price-section">
              {isOfferActive && displayOriginalPrice && (
                <div className="original-price">{displayOriginalPrice}</div>
              )}
              <div className={`price ${isOfferActive ? 'price--discounted' : ''}`}>{displayPrice}</div>
            </div>
            <div className="period">{meta.period}</div>

            <ul className="benefits">
              {displayFeatures.map((f) => (
                <li key={f}>
                  <span className="check">✓</span> {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="payment-security-note">
            <p>🔒 Secure payment powered by Razorpay.</p>
          </div>

          <div className="payment-cta">
            <button className="btn btn--outline" onClick={() => navigate(-1)}>Back</button>
            <button className="btn btn--light" onClick={() => navigate('/dashboard')}>Manage Plan</button>
          </div>
        </div>

        <div className="payment-card__right">
          {!success ? (
            <form className="payment-form" onSubmit={handlePay}>
              <h2 className="form-title">Order Summary</h2>
              
              <div className="summary-item">
                <span>Selected Plan</span>
                <strong>{plan.charAt(0).toUpperCase() + plan.slice(1)}</strong>
              </div>
              <div className="summary-item">
                <span>Billing Cycle</span>
                <strong>Annual</strong>
              </div>

              <hr className="divider" />

              <h3 className="section-subtitle">Billing Information</h3>
              <p className="section-desc">Razorpay will use these details for the receipt.</p>

              <label className="input-group">
                <span>Full Name</span>
                <input 
                  required
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g. John Doe" 
                />
              </label>

              <label className="input-group">
                <span>Email Address</span>
                <input 
                  required
                  type="email" 
                  value={form.email} 
                  onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  placeholder="e.g. john@example.com" 
                />
              </label>

              <label className="input-group">
                <span>Phone Number</span>
                <input 
                  required
                  type="tel" 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  placeholder="e.g. 9876543210" 
                />
              </label>

              <div className="payment-total">
                <div className="total-label">Payable Amount<br/>(incl. all tax and fees)</div>
                <div className="total-value">{displayPrice}</div>
              </div>

              <div className="payment-actions-container">
                <label className="terms-checkbox">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
                  <span>I agree to the <span className="terms-link" onClick={(e) => { e.stopPropagation(); setPolicyOpen(true); }}>Terms and Conditions</span></span>
                </label>
                <div className="payment-buttons-stack">
                  <button type="submit" className="btn btn--primary btn--large w-100" disabled={loading || !agreed}>
                    {loading ? 'Initializing...' : `Securely Pay ${displayPrice}`}
                  </button>
                </div>
              </div>

              <div className="trust-badges">
                <img src="https://img.shields.io/badge/Razorpay-Verified-blue.svg" alt="Razorpay" />
                <span>PCI-DSS Compliant</span>
              </div>
            </form>
          ) : (
            <div className="payment-success">
              <div className="success-icon">✅</div>
              <h2>Subscription Active!</h2>
              <p>Your {plan} plan has been successfully activated. Enjoy full access to all features.</p>
              <div className="payment-success__actions">
                <button className="btn btn--primary" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <PayPolicy open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </div>
  );
};

export default Payment;
