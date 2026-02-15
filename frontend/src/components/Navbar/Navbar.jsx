import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';
import { FaBars, FaUserCircle, FaInfoCircle, FaQuestionCircle, FaPlusCircle, FaCheck, FaArrowUp } from 'react-icons/fa';
import Modal from '../Modal/Modal';
import { toggleSidebar, addNotification } from '../../redux/slices/uiSlice';
import { logout } from '../../redux/slices/authSlice';
import { loadSettings } from '../../redux/slices/settingsSlice';
import './Navbar.scss';
import PlanCard from '../PlanCard/PlanCard';

import { GoldStar, SilverStar } from '../PlanCard/PlanCard';
import NotificationPanel from '../NotificationPanel';


const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.settings);

  const [showTutorial, setShowTutorial] = React.useState(false);
  const [showHelp, setShowHelp] = React.useState(false);
  // Help/contact form state
  const [helpForm, setHelpForm] = React.useState({ name: '', email: '', subject: '', message: '' });
  const [helpErrors, setHelpErrors] = React.useState({});
  const [helpSubmitting, setHelpSubmitting] = React.useState(false);
  const [helpSuccess, setHelpSuccess] = React.useState(false);
  const [showPlan, setShowPlan] = React.useState(false);
  const notifications = useSelector((state) => state.ui.notifications || []);

  // Pre-fill help form with user data
  React.useEffect(() => {
    if (showHelp && (user || profile)) {
      setHelpForm(prev => ({
        ...prev,
        name: prev.name || profile?.fullName || user?.name || '',
        email: prev.email || profile?.email || user?.email || ''
      }));
    }
  }, [showHelp, user, profile]);

  // logout navigation handled from settings page; keep action here if needed later

  // Helper: check if name is valid (not empty, not dummy value)
  const isValidName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    // Filter out common dummy/test names (case-insensitive)
    const dummyNames = ['user', 'test', 'demo', 'admin', 'guest', 'unknown', 'null', 'undefined', 'name'];
    return !dummyNames.includes(trimmed.toLowerCase());
  };

  // Use profile data if available; prefer uploaded `avatar` (absolute URL)
  const displayName = (isValidName(profile?.fullName) && profile.fullName) || 'Unknown';
  const displayAvatar = profile?.avatar || profile?.avatarPreview || user?.avatar || null;

  // Plan logic
  const rawPlan = (profile && (profile.plan || profile.subscription?.tier)) || user?.plan || 'none';
  const planTier = String(rawPlan || 'none').toLowerCase();
  const isGold = planTier.includes('gold');
  const isSilver = planTier.includes('silver');
  const hasPaidPlan = isGold || isSilver;
  const planTitle = planTier === 'none' || planTier === 'free' 
    ? 'Free Trial' 
    : planTier.charAt(0).toUpperCase() + planTier.slice(1);
  
  // Trial period constant (15 days)
  const TRIAL_DAYS = 15;
  
  const remainingDays = React.useMemo(() => {
    // For paid plans, calculate from plan activation date
    if (hasPaidPlan) {
      const planActivatedAt = profile?.planActivatedAt || user?.planActivatedAt;
      
      if (planActivatedAt) {
        const activationDate = new Date(planActivatedAt);
        const expiryDate = new Date(activationDate);
        expiryDate.setDate(expiryDate.getDate() + 365); // Add 365 days
        
        const now = new Date();
        const diff = expiryDate - now;
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      } else if (profile?.subscription?.daysRemaining !== undefined) {
        return profile.subscription.daysRemaining;
      } else if (profile?.subscription?.endDate) {
        const end = new Date(profile.subscription.endDate);
        const diff = end - new Date();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }
      return 365; // Default for paid plans
    }
    
    // For free/no plan users, calculate trial days remaining from registration date
    const createdAt = user?.createdAt || profile?.createdAt;
    if (createdAt) {
      const registrationDate = new Date(createdAt);
      const now = new Date();
      const diffTime = now - registrationDate;
      const daysUsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, TRIAL_DAYS - daysUsed);
    }
    
    return TRIAL_DAYS; // Default trial days if no createdAt
  }, [profile, user, hasPaidPlan]);

  // Handle plan/trial expiration notifications
  React.useEffect(() => {
    if (remainingDays === null || remainingDays > 15) return;

    // Milestones to notify (adjusted for 15-day trial)
    let milestone = null;
    if (remainingDays <= 15 && remainingDays > 7) milestone = 15;
    else if (remainingDays <= 7 && remainingDays > 3) milestone = 7;
    else if (remainingDays <= 3 && remainingDays > 0) milestone = remainingDays;
    else if (remainingDays <= 0) milestone = 0;

    if (milestone !== null) {
      const notifType = hasPaidPlan ? 'plan-expiry' : 'trial-expiry';
      const milestoneId = `${notifType}-${milestone}`;
      const alreadyNotified = notifications.some(n => n.milestoneId === milestoneId);

      if (!alreadyNotified) {
        const title = hasPaidPlan ? 'Plan Expiring Soon' : 'Free Trial Ending';
        const message = remainingDays <= 0 
          ? (hasPaidPlan 
              ? `Your ${planTitle} plan has expired. Please renew to continue using all features.`
              : 'Your free trial has ended. Subscribe to continue using all features.')
          : (hasPaidPlan 
              ? `Your ${planTitle} plan expires in ${remainingDays} days. Please renew to keep your features.`
              : `Your free trial ends in ${remainingDays} days. Subscribe to keep all features.`);
        
        dispatch(addNotification({
          title,
          message,
          type: 'billing',
          milestoneId: milestoneId,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }, [remainingDays, planTier, planTitle, notifications, dispatch]);

  // Ensure settings are loaded so navbar shows correct profile immediately
  React.useEffect(() => {
    // Trigger loadSettings once on mount; the thunk will no-op or re-sync if already loaded
    dispatch(loadSettings());
  }, [dispatch]);

  // Listen for a global event that should open the Help modal
  React.useEffect(() => {
    const handler = (e) => {
      setShowHelp(true);
    };
    try {
      window.addEventListener('openHelp', handler);
    } catch (err) {
      // ignore if window is not available in some environments
    }
    return () => {
      try {
        window.removeEventListener('openHelp', handler);
      } catch (err) {}
    };
  }, []);

  // Close plan modal when a component dispatches the 'closePlan' event
  React.useEffect(() => {
    const closeHandler = () => setShowPlan(false);
    try {
      window.addEventListener('closePlan', closeHandler);
    } catch (err) {}
    return () => {
      try { window.removeEventListener('closePlan', closeHandler); } catch (err) {}
    };
  }, []);



  return (
    <nav className="navbar">
      <div className="navbar__left">
        <button 
          className="navbar__menu-btn" 
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
        >
          <FaBars />
        </button>
        <h1 className="navbar__logo">MIVENT</h1>
      </div>

      <div className="navbar__right">
        {/* Plan button: shows tier-specific icon and label (none / silver / gold) */}
        <button
          className={`navbar__plan-btn ${remainingDays <= 0 && !hasPaidPlan ? 'navbar__plan-btn--expired' : remainingDays <= 3 && !hasPaidPlan ? 'navbar__plan-btn--critical' : ''}`}
          data-tier={planTier}
          aria-label={`${planTitle}`}
          title={remainingDays <= 0 && !hasPaidPlan ? 'Trial Expired - Click to Upgrade' : `${planTitle}`}
          onClick={() => setShowPlan(true)}
        >
          {isGold ? <GoldStar /> : isSilver ? <SilverStar /> : <FaPlusCircle />}
          <span className="navbar__plan-label">{planTitle}</span>
          {remainingDays <= 3 && !hasPaidPlan && (
            <span className="navbar__plan-badge">{remainingDays <= 0 ? '!' : remainingDays}</span>
          )}
        </button>

          <Modal
            isOpen={showPlan}
            onClose={() => setShowPlan(false)}
            title="Your Plan"
            size="large"
          >
            <div className="plan-modal">
              <div className={`plan-modal__header ${isGold ? 'plan-modal__header--gold' : isSilver ? 'plan-modal__header--silver' : 'plan-modal__header--trial'} ${remainingDays !== null && remainingDays <= 7 ? 'plan-modal__header--danger' : ''}`}>
                <div className="plan-modal__header-left">
                  <div className="plan-modal__badge">
                    {isGold ? <GoldStar /> : isSilver ? <SilverStar /> : <FaPlusCircle />}
                  </div>
                  <div>
                    <h3 className="plan-modal__title">{planTitle}</h3>
                    <p className="plan-modal__subtitle">
                      {isGold 
                        ? 'Best for established teams' 
                        : isSilver 
                          ? 'Great value for growing teams' 
                          : remainingDays <= 0 
                            ? 'Your free trial has ended. Subscribe to continue.'
                            : `${remainingDays} days remaining in your free trial`
                      }
                    </p>
                  </div>
                </div>

                <div className="plan-modal__header-right">
                  <div className="plan-modal__days">
                    <span className="plan-modal__days-count">{remainingDays}</span>
                    <span className="plan-modal__days-label">Days Remaining</span>
                  </div>
                </div>
              </div>

              <div className="plan-modal__body">
                {!hasPaidPlan ? (
                  <>
                    <p className="plan-modal__lead">
                      {remainingDays <= 0 
                        ? 'Choose a plan to unlock all features and continue your journey'
                        : 'Explore our plans — pick the one that suits your needs.'
                      }
                    </p>
                    <div className="plan-modal__options">
                      <PlanCard tier="Silver" />
                      <PlanCard tier="Gold" highlighted />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="plan-modal__centered">
                      <PlanCard tier={planTitle} highlighted={isGold} isCurrentPlan={true} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </Modal>

        <div className="navbar__notifications">
          <NotificationPanel />
        </div>

        <button
          className="navbar__icon-btn"
          aria-label="Info"
          title="Info"
          onClick={() => setShowTutorial(true)}
        >
          <FaInfoCircle />
        </button>

        <button
          className="navbar__icon-btn"
          aria-label="Help"
          title="Help"
          onClick={() => setShowHelp(true)}
        >
          <FaQuestionCircle />
        </button>

        <Modal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          title="Quick Tour"
          size="medium"
        >
          <div className='quick_tour'>
            <p>Welcome to MIVENT — here are a few quick tips to get you started:</p>
            <ol>
              <li><strong>Dashboard:</strong> Overview of recent activity and stats.</li>
              <li><strong>Quotations &amp; Billing:</strong> Create quotations and invoices from the respective pages.</li>
              <li><strong>Projects / Events:</strong> Create and manage client projects and events.</li>
              <li><strong>Service & Policy:</strong> Manage services and policies for clients.</li>
              <li><strong>Team & Chat:</strong> Add team members and manage conversations.</li>
              <li><strong>Profile:</strong> Click top right to manage your profile, company, payment and settings.</li>
            </ol>
            <br />
            <p>View complete <em>Tutorial</em> video on Youtube. Click here</p>
          </div>
        </Modal>

        <Modal
          isOpen={showHelp}
          onClose={() => {
            setShowHelp(false);
            setHelpErrors({});
            setHelpSubmitting(false);
            setHelpSuccess(false);
          }}
          title="Help & Support"
          size="medium"
        >
          <div style={{ lineHeight: 1.5 }}>
            {/* Contact form */}
            <form
              className="navbar__help-form"
              onSubmit={async (e) => {
                e.preventDefault();
                // simple validation
                const errs = {};
                if (!helpForm.name.trim()) errs.name = 'Name is required';
                if (!helpForm.email.trim()) errs.email = 'Email is required';
                else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(helpForm.email)) errs.email = 'Enter a valid email';
                if (!helpForm.message.trim()) errs.message = 'Message is required';
                setHelpErrors(errs);
                if (Object.keys(errs).length) return;

                setHelpSubmitting(true);
                try {
                  // EmailJS integration
                  const serviceId = process.env.REACT_APP_EMAILJS_SERVICE_ID;
                  const templateId = process.env.REACT_APP_EMAILJS_TEMPLATE_ID;
                  const publicKey = process.env.REACT_APP_EMAILJS_PUBLIC_KEY;

                  if (!serviceId || !templateId || !publicKey) {
                    throw new Error('EmailJS configuration missing');
                  }

                  await emailjs.send(
                    serviceId,
                    templateId,
                    {
                      to_name: 'MIVENT Support',
                      from_name: helpForm.name,
                      from_email: helpForm.email,
                      subject: helpForm.subject || 'New Support Request',
                      message: helpForm.message,
                      reply_to: helpForm.email
                    },
                    publicKey
                  );

                  setHelpSuccess(true);
                  setHelpForm({ name: '', email: '', subject: '', message: '' });
                  // Automatically close success message after 10 seconds
                  setTimeout(() => {
                    setHelpSuccess(false);
                    setShowHelp(false);
                  }, 10000);
                } catch (err) {
                  console.error('EmailJS Error:', err);
                  setHelpErrors({ form: 'Unable to send message. Please email miventsite@gmail.com' });
                } finally {
                  setHelpSubmitting(false);
                }
              }}
            >
              {helpSuccess ? (
                <div className="help-success">
                  <h4>Thanks — we received your message</h4>
                  <p>Our support team will get back to you at the email address you provided (usually within 24 hours).</p>
                </div>
              ) : (
                <>
                  <div className="help-form__row">
                    <div className="help-form__group">
                      <label htmlFor="help-name">Name</label>
                      <input
                        id="help-name"
                        name="name"
                        value={helpForm.name}
                        onChange={(e) => setHelpForm((s) => ({ ...s, name: e.target.value }))}
                        className="help-form__input"
                        placeholder="Your full name"
                      />
                      {helpErrors.name && <div className="help-form__error">{helpErrors.name}</div>}
                    </div>

                    <div className="help-form__group">
                      <label htmlFor="help-email">Email</label>
                      <input
                        id="help-email"
                        name="email"
                        value={helpForm.email}
                        onChange={(e) => setHelpForm((s) => ({ ...s, email: e.target.value }))}
                        className="help-form__input"
                        placeholder="you@company.com"
                      />
                      {helpErrors.email && <div className="help-form__error">{helpErrors.email}</div>}
                    </div>
                  </div>

                  <div className="help-form__group">
                    <label htmlFor="help-subject">Subject (optional)</label>
                    <input
                      id="help-subject"
                      name="subject"
                      value={helpForm.subject}
                      onChange={(e) => setHelpForm((s) => ({ ...s, subject: e.target.value }))}
                      className="help-form__input"
                      placeholder="Short summary"
                    />
                  </div>

                  <div className="help-form__group">
                    <label htmlFor="help-message">Message</label>
                    <textarea
                      id="help-message"
                      name="message"
                      value={helpForm.message}
                      onChange={(e) => setHelpForm((s) => ({ ...s, message: e.target.value }))}
                      className="help-form__textarea"
                      rows={6}
                      placeholder="Describe the issue or question"
                    />
                    {helpErrors.message && <div className="help-form__error">{helpErrors.message}</div>}
                  </div>

                  {helpErrors.form && <div className="help-form__error help-form__error--form">{helpErrors.form}</div>}

                  <div className="help-form__actions">
                    <button type="submit" className="help-form__submit" disabled={helpSubmitting}>
                      {helpSubmitting ? 'Sending…' : 'Send Message'}
                    </button>
                    {/* <button
                      type="button"
                      className="help-form__cancel"
                      onClick={() => {
                        setShowHelp(false);
                        setHelpErrors({});
                      }}
                    >
                      Cancel
                    </button> */}
                  </div>
                </>
              )}
            </form>

            {/* Contact details */}
            <div className="help-contact-info" style={{ marginTop: 18 }}>
              <h4>Other ways to contact us</h4>
              <p>
                Email: <a href="mailto:miventsite@gmail.com">miventsite@gmail.com</a>
              </p>
              <p>Response time: Within 24 hours (business days)</p>
              <p>For urgent issues include your account id and a short description.</p>
            </div>
          </div>
        </Modal>

        <div className="navbar__user">
          <button
            className="navbar__profile-btn"
            onClick={() => navigate('/settings')}
            aria-label="Open settings"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="Profile" className="navbar__profile-img" />
            ) : (
              <FaUserCircle />
            )}
            <span>{displayName}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
