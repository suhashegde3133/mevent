import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaEye, FaEyeSlash, FaCrown } from 'react-icons/fa';
import { updateProfile, updateCompany, updateBank, updateNotifications, saveProfile, saveCompany, saveBank, saveNotifications, loadSettings } from '../redux/slices/settingsSlice';
import Modal from '../components/Modal/Modal';
import PlanUpgradeModal from '../components/PlanUpgradeModal/PlanUpgradeModal';
import useTrialStatus from '../hooks/useTrialStatus';
import './Settings.scss';
import { useNavigate } from 'react-router-dom';
import { logout, loginSuccess } from '../redux/slices/authSlice';
import { API_BASE_URL } from '../utils/constants';
import session from '../utils/session';

const Settings = () => {
  const dispatch = useDispatch();
  const settingsState = useSelector((state) => state.settings);
  // Read authenticated user from Redux or fall back to session storage
  const authUser = useSelector((state) => state.auth && state.auth.user) || session.getUser();
  
  // Plan-based restrictions
  const { isGoldPlan, isOnTrial, isSilverPlan } = useTrialStatus();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [restrictedFeatureName, setRestrictedFeatureName] = useState('');
  
  // Cards restricted to Gold plan only (Free trial and Silver plan cannot access)
  const isRestricted = !isGoldPlan;
  
  const handleRestrictedCardClick = (featureName) => {
    if (isRestricted) {
      setRestrictedFeatureName(featureName);
      setShowUpgradeModal(true);
    }
  };
  
  useEffect(() => {
    dispatch(loadSettings());
  }, [dispatch]);

  const uploadFile = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('files', file);
    const token = session.getToken();
    const res = await fetch(`${API_BASE_URL}/uploads`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      return data.files[0].url;
    }
    console.error('Upload failed');
    return null;
  };

  const [activeModal, setActiveModal] = useState(null);
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '', designation: '', avatarPreview: null });
  const [company, setCompany] = useState({ name: '', email: '', phone: '', address: '', logoPreview: null });
  const [bank, setBank] = useState({ bankName: '', accountHolder: '', accountNumber: '', branch: '', ifsc: '', address: '', upiId: '', upiQrPreview: null });
  const [notifications, setNotifications] = useState({ overall: true, events: true, chat: true });
  const [adminCreds, setAdminCreds] = useState({ email: '', password: '' });
  const [adminError, setAdminError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Keep local component state in sync with Redux settings when they load/update
  useEffect(() => {
    if (settingsState && settingsState.profile) {
      setProfile(prev => ({
        ...prev,
        ...settingsState.profile,
        avatarPreview: settingsState.profile.avatar || prev.avatarPreview
      }));
    }
    if (settingsState && settingsState.company) {
      setCompany(prev => ({
        ...prev,
        ...settingsState.company,
        logoPreview: settingsState.company.logo || prev.logoPreview
      }));
    }
    if (settingsState && settingsState.bank) {
      setBank(prev => ({
        ...prev,
        ...settingsState.bank,
        upiQrPreview: settingsState.bank.upiQr || prev.upiQrPreview
      }));
    }
    if (settingsState && settingsState.notifications) {
      // Overall notifications are mandatory and cannot be disabled by the user.
      setNotifications(prev => ({ ...prev, ...settingsState.notifications, overall: true }));
    }
  }, [settingsState]);

  // Add UPI related state inside bank object (we'll manage with same handler)

  const openModal = (name) => setActiveModal(name);
  const closeModal = () => setActiveModal(null);

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = ev.target.result;
      setProfile(prev => ({ ...prev, avatar: file, avatarPreview: preview }));
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyChange = (field, value) => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = ev.target.result;
      setCompany(prev => ({ ...prev, logo: file, logoPreview: preview }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompany = async () => {
    const safeCompany = { ...company };
    // Upload logo if it's a File. If it's already a URL string, keep it.
    if (safeCompany.logo instanceof File) {
      const logoUrl = await uploadFile(safeCompany.logo);
      if (logoUrl) {
        safeCompany.logo = logoUrl;
      } else {
        // upload failed, remove the field
        delete safeCompany.logo;
      }
    } else {
      // keep existing URL string; if falsy remove it
      if (!safeCompany.logo) delete safeCompany.logo;
    }
    // Keep logoPreview for UI, but don't send to backend
    delete safeCompany.logoPreview;
    // update local state first, then persist to backend
    dispatch(updateCompany(safeCompany));
    dispatch(saveCompany(safeCompany));
    console.log('Save company', safeCompany);
    closeModal();
  };

  const handleBankChange = (field, value) => {
    setBank(prev => ({ ...prev, [field]: value }));
  };

  const handleUpiQrChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const preview = ev.target.result;
      setBank(prev => ({ ...prev, upiQr: file, upiQrPreview: preview }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBank = async () => {
    const safeBank = { ...bank };
    // Upload upiQr if it's a File. If it's already a URL string, keep it.
    if (safeBank.upiQr instanceof File) {
      const upiQrUrl = await uploadFile(safeBank.upiQr);
      if (upiQrUrl) {
        safeBank.upiQr = upiQrUrl;
      } else {
        // upload failed, remove field
        delete safeBank.upiQr;
      }
    } else {
      // keep existing URL string; if falsy remove it
      if (!safeBank.upiQr) delete safeBank.upiQr;
    }
    // Keep upiQrPreview for UI, but don't send to backend
    delete safeBank.upiQrPreview;
    // update local state first, then persist to backend
    dispatch(updateBank(safeBank));
    dispatch(saveBank(safeBank));
    console.log('Save bank', safeBank);
    closeModal();
  };

  const handleNotificationChange = (field, value) => {
    // Prevent changing the mandatory overall flag from the UI
    if (field === 'overall') return;
    setNotifications(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveNotifications = () => {
    // Ensure overall notifications remain enabled even if server had them off
    const payload = { ...notifications, overall: true };
    // update local state first, then persist to backend
    dispatch(updateNotifications(payload));
    dispatch(saveNotifications(payload));
    console.log('Save notifications', payload);
    closeModal();
  };

  const handleSaveProfile = async () => {
    const safeProfile = { ...profile };
    // Upload avatar if it's a File. If it's already a URL string, keep it.
    if (safeProfile.avatar instanceof File) {
      const avatarUrl = await uploadFile(safeProfile.avatar);
      if (avatarUrl) {
        safeProfile.avatar = avatarUrl;
      } else {
        // upload failed, remove field
        delete safeProfile.avatar;
      }
    } else {
      // keep existing URL string; if falsy remove it
      if (!safeProfile.avatar) delete safeProfile.avatar;
    }
    // Keep avatarPreview for UI, but don't send to backend
    delete safeProfile.avatarPreview;
    console.log('Saving profile - safeProfile to send:', safeProfile);
    // update local state first, then persist to backend
    dispatch(updateProfile(safeProfile));
    dispatch(saveProfile(safeProfile));
    closeModal();
  };

  const handleSaveSecurity = () => {
    // kept for backward compatibility; currently simply closes modal
    console.log('Save security settings');
    closeModal();
  };

  // Security action handlers (placeholders to wire up later)
  const navigate = useNavigate();

  const handleLogin = () => {
    // close modal, perform logout and then navigate shortly after to avoid unmount race
    closeModal();
    try { dispatch(logout()); } catch (e) {}
    setTimeout(() => navigate('/login'), 50);
  };

  const handleForgotPassword = () => {
    // close modal, perform logout and then navigate shortly after to avoid unmount race
    closeModal();
    try { dispatch(logout()); } catch (e) {}
    setTimeout(() => navigate('/forgot-password'), 50);
  };

  const handleAdminVerify = async () => {
    setAdminError('');
    if (!adminCreds.email || !adminCreds.password) {
      setAdminError('Email and password required');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminCreds)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.user.role === 'admin' || data.user.role === 'superadmin') {
          // Update Redux state with the admin user
          dispatch(loginSuccess({
            user: data.user,
            token: data.token
          }));

          closeModal();
          // Use a slight delay to ensure state is updated before navigation
          setTimeout(() => navigate('/admin/dashboard'), 100);
        } else {
          setAdminError('Access denied. This account is not an administrator.');
        }
      } else {
        setAdminError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setAdminError('Verification failed. Server unreachable.');
    }
  };


  return (
    <div className="settings">
      <h1 className="settings__title">Settings</h1>
      <div className="settings__cards">
        {/* Allowed for all plans: Profile */}
        <div className="settings__card" onClick={() => openModal('profile')} role="button" tabIndex={0}>
          <h3>Your Profile</h3>
          <p>Manage your account settings and preferences.</p>
        </div>

        {/* Restricted: Company Information - Gold only */}
        <div 
          className={`settings__card ${isRestricted ? 'settings__card--restricted' : ''}`} 
          onClick={() => isRestricted ? handleRestrictedCardClick('Company Information') : openModal('company')} 
          role="button" 
          tabIndex={0}
        >
          <div className="settings__card-header">
            <h3>Company Information</h3>
            {isRestricted && <FaCrown className="settings__gold-badge" title="Gold Plan Feature" />}
          </div>
          <p>Manage your company details and business information.</p>
        </div>

        {/* Restricted: Bank Details - Gold only */}
        <div 
          className={`settings__card ${isRestricted ? 'settings__card--restricted' : ''}`} 
          onClick={() => isRestricted ? handleRestrictedCardClick('Bank Details') : openModal('bank')} 
          role="button" 
          tabIndex={0}
        >
          <div className="settings__card-header">
            <h3>Bank Details</h3>
            {isRestricted && <FaCrown className="settings__gold-badge" title="Gold Plan Feature" />}
          </div>
          <p>Configure your banking information for payments.</p>
        </div>

        {/* Allowed for all plans: Notification Preferences */}
        <div className="settings__card" onClick={() => openModal('notifications')} role="button" tabIndex={0}>
          <h3>Notification Preferences</h3>
          <p>Configure how you receive notifications.</p>
        </div>

        {/* Allowed for all plans: Security */}
        <div className="settings__card" onClick={() => openModal('security')} role="button" tabIndex={0}>
          <h3>Security</h3>
          <p>Update your password and security settings.</p>
        </div>

        {/* Restricted: Super Admin - Gold only */}
        <div 
          className={`settings__card ${isRestricted ? 'settings__card--restricted' : ''}`} 
          onClick={() => isRestricted ? handleRestrictedCardClick('Super Admin') : openModal('admin')} 
          role="button" 
          tabIndex={0}
        >
          <div className="settings__card-header">
            <h3>Super Admin</h3>
            {isRestricted && <FaCrown className="settings__gold-badge" title="Gold Plan Feature" />}
          </div>
          <p>Manage administrative settings and permissions.</p>
        </div>
      </div>

      {/* Modals for each card */}
      <Modal isOpen={activeModal === 'profile'} onClose={closeModal} title="Profile Settings" size="medium">
        <div className="settings__profile-vertical">
          <div className="settings__avatar-center">
            <div className="avatar-preview">
              {profile.avatarPreview ? (
                <img src={profile.avatarPreview} alt="Avatar preview" />
              ) : (
                <div className="avatar-placeholder">No image</div>
              )}
            </div>
            <label className="avatar-upload">
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
              <span>Upload photo</span>
            </label>
          </div>

          <div className="settings__fields-vertical">
            <div className="settings__form-group">
              <label>Full Name</label>
              <input value={profile.fullName} onChange={(e) => handleProfileChange('fullName', e.target.value)} type="text" placeholder="Enter your full name" />
            </div>
            <div className="settings__form-group">
              <label>Email</label>
              <input value={profile.email} onChange={(e) => handleProfileChange('email', e.target.value)} type="email" placeholder="Enter your email" />
            </div>
            <div className="settings__form-group">
              <label>Phone</label>
              <input value={profile.phone} onChange={(e) => handleProfileChange('phone', e.target.value)} type="tel" placeholder="Enter your phone number" />
            </div>
            <div className="settings__form-group">
              <label>Designation / Role</label>
              <input value={profile.designation} onChange={(e) => handleProfileChange('designation', e.target.value)} type="text" placeholder="Enter your designation or role" />
            </div>
          </div>
        </div>
        <div className="settings__modal-footer">
          <div className="settings__modal-left">
            <button className="btn" onClick={closeModal}>Cancel</button>
          </div>
          <div className="settings__modal-right">
            <button className="btn btn--primary" onClick={handleSaveProfile}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'company'} onClose={closeModal} title="Company Information" size="medium">
        <div className="settings__company-vertical">
          <div className="settings__avatar-center">
            <div className="avatar-preview">
              {company.logoPreview ? (
                <img src={company.logoPreview} alt="Company logo preview" />
              ) : (
                <div className="avatar-placeholder">No logo</div>
              )}
            </div>
            <label className="avatar-upload">
              <input type="file" accept="image/*" onChange={handleLogoChange} />
              <span>Upload logo</span>
            </label>
          </div>

          <div className="settings__fields-vertical">
            <div className="settings__form-group">
              <label>Company Name</label>
              <input value={company.name} onChange={(e) => handleCompanyChange('name', e.target.value)} type="text" placeholder="Enter company name" />
            </div>
            <div className="settings__form-group">
              <label>Email</label>
              <input value={company.email} onChange={(e) => handleCompanyChange('email', e.target.value)} type="email" placeholder="Enter company email" />
            </div>
            <div className="settings__form-group">
              <label>Phone</label>
              <input value={company.phone} onChange={(e) => handleCompanyChange('phone', e.target.value)} type="tel" placeholder="Enter company phone" />
            </div>
            <div className="settings__form-group">
              <label>Address</label>
              <textarea value={company.address} onChange={(e) => handleCompanyChange('address', e.target.value)} placeholder="Enter company address" rows="3"></textarea>
            </div>
          </div>
        </div>
        <div className="settings__modal-footer">
          <div className="settings__modal-left">
            <button className="btn" onClick={closeModal}>Cancel</button>
          </div>
          <div className="settings__modal-right">
            <button className="btn btn--primary" onClick={handleSaveCompany}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'bank'} onClose={closeModal} title="Bank Details" size="medium">
        <div className="settings__form-group">
          <label>Bank Name</label>
          <input value={bank.bankName} onChange={(e) => handleBankChange('bankName', e.target.value)} type="text" placeholder="Enter bank name" />
        </div>
        <div className="settings__form-group">
          <label>Account Holder Name</label>
          <input value={bank.accountHolder} onChange={(e) => handleBankChange('accountHolder', e.target.value)} type="text" placeholder="Enter account holder name" />
        </div>
        <div className="settings__form-group">
          <label>Account Number</label>
          <input value={bank.accountNumber} onChange={(e) => handleBankChange('accountNumber', e.target.value)} type="text" placeholder="Enter account number" />
        </div>
        <div className="settings__form-group">
          <label>Branch</label>
          <input value={bank.branch} onChange={(e) => handleBankChange('branch', e.target.value)} type="text" placeholder="Enter branch name" />
        </div>
        <div className="settings__form-group">
          <label>IFSC</label>
          <input value={bank.ifsc} onChange={(e) => handleBankChange('ifsc', e.target.value)} type="text" placeholder="Enter IFSC code" />
        </div>
        <div className="settings__form-group">
          <label>Address</label>
          <textarea value={bank.address} onChange={(e) => handleBankChange('address', e.target.value)} placeholder="Enter branch address" rows="3"></textarea>
        </div>
        <div className="settings__form-group">
          <label>UPI ID</label>
          <input value={bank.upiId || ''} onChange={(e) => handleBankChange('upiId', e.target.value)} type="text" placeholder="Enter UPI ID (example@bank)" />
        </div>

          <div className="avatar-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="avatar-preview" style={{ width: '120px', height: '120px' }}>
              {bank.upiQrPreview ? (
                <img src={bank.upiQrPreview} alt="UPI QR preview" />
              ) : (
                <div className="avatar-placeholder">No QR</div>
              )}
            </div>
            <label className="avatar-upload">
              <input type="file" accept="image/*" onChange={handleUpiQrChange} />
              <span>Upload QR</span>
            </label>
          </div>
        
        <div className="settings__modal-footer">
          <div className="settings__modal-left">
            <button className="btn" onClick={closeModal}>Cancel</button>
          </div>
          <div className="settings__modal-right">
            <button className="btn btn--primary" onClick={handleSaveBank}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'notifications'} onClose={closeModal} title="Notification Preferences" size="small">
        <div className="settings__form-group">
          <label className="settings__checkbox-label">
            <input type="checkbox" checked={notifications.overall} disabled title="Overall notifications are always enabled" />
            Overall notifications
          </label>
        </div>
        <div className="settings__form-group">
          <label className="settings__checkbox-label">
            <input type="checkbox" checked={notifications.events} onChange={(e) => handleNotificationChange('events', e.target.checked)} />
            Quotation/Event/Billing created notifications
          </label>
        </div>
        {/* <div className="settings__form-group">
          <label className="settings__checkbox-label">
            <input type="checkbox" checked={notifications.chat} onChange={(e) => handleNotificationChange('chat', e.target.checked)} />
            Chat notifications
          </label>
        </div> */}
        <div className="settings__modal-footer">
          <div className="settings__modal-left">
            <button className="btn" onClick={closeModal}>Cancel</button>
          </div>
          <div className="settings__modal-right">
            <button className="btn btn--primary" onClick={handleSaveNotifications}>Save</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'security'} onClose={closeModal} title="Security" size="small">
        {/* Display current user's email above security actions */}
        {authUser && authUser.email ? (
          <div className="settings__security-user">Logged in as: <strong>{authUser.email}</strong></div>
        ) : null}
        <div className="settings__security-actions">
          <button className="btn btn--login" onClick={handleLogin}>Login to Another Account</button>
          <button className="btn btn--forgot" onClick={handleForgotPassword}>I Forgot My Password</button>
        </div>
        <div className="settings__modal-footer">
          <p className='caution'>Clicking any of these buttons will Logout current account immediately.</p>
          {/* <div className="settings__modal-left">
            <button className="btn" onClick={closeModal}>Cancel</button>
          </div>
          <div className="settings__modal-right">
            <button className="btn btn--primary" onClick={handleSaveSecurity}>Save</button>
          </div> */}
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'admin'} onClose={closeModal} title="Super Admin Authentication" size="small">
        <div className="settings__admin-auth">
          <p className="auth-instruction">Enter your administrative credentials to access the management panel.</p>
          
          <div className="settings__form-group">
            <label>Admin Email</label>
            <input 
              type="email" 
              placeholder="admin@mivent.com"
              value={adminCreds.email}
              onChange={(e) => setAdminCreds({ ...adminCreds, email: e.target.value })}
            />
          </div>
          
          <div className="settings__form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input 
                type={showAdminPassword ? "text" : "password"} 
                placeholder="••••••••"
                value={adminCreds.password}
                onChange={(e) => setAdminCreds({ ...adminCreds, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminVerify()}
              />
              <button 
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowAdminPassword(!showAdminPassword)}
                aria-label={showAdminPassword ? "Hide password" : "Show password"}
              >
                {showAdminPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {adminError && <div className="auth-error" style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px' }}>{adminError}</div>}
        </div>
        
        <div className="settings__modal-footer">
          <div className="settings__modal-left">
            <button className="btn" onClick={closeModal}>Cancel</button>
          </div>
          <div className="settings__modal-right">
            <button className="btn btn--primary" onClick={handleAdminVerify}>Authenticate</button>
          </div>
        </div>
      </Modal>

      {/* Plan Upgrade Modal for restricted features */}
      <PlanUpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        featureName={restrictedFeatureName}
      />
    </div>
  );
};

export default Settings;
