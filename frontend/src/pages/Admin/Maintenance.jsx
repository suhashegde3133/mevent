import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiTool, FiPower, FiUsers, FiClock, FiEdit3, FiRefreshCw,
  FiAlertTriangle, FiCheck, FiX, FiInfo
} from 'react-icons/fi';
import api from '../../utils/api';
import { showToast } from '../../utils/toast';
import './Admin.scss';

const Maintenance = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    isEnabled: false,
    affectedTiers: ['all'],
    title: 'System Maintenance',
    message: "We're currently performing maintenance. Please check back soon.",
    estimatedEndTime: '',
    allowAdminAccess: true,
    enabledBy: null,
    enabledAt: null
  });
  const [affectedCount, setAffectedCount] = useState(0);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, countRes] = await Promise.all([
        api.get('/maintenance/settings'),
        api.get('/maintenance/affected-count')
      ]);
      
      const data = settingsRes.data;
      setSettings({
        isEnabled: data.isEnabled || false,
        affectedTiers: data.affectedTiers || ['all'],
        title: data.title || 'System Maintenance',
        message: data.message || "We're currently performing maintenance. Please check back soon.",
        estimatedEndTime: data.estimatedEndTime ? new Date(data.estimatedEndTime).toISOString().slice(0, 16) : '',
        allowAdminAccess: data.allowAdminAccess !== false,
        enabledBy: data.enabledBy,
        enabledAt: data.enabledAt
      });
      
      setAffectedCount(countRes.data.affectedCount || 0);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch maintenance settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Recalculate affected count when tiers change
  useEffect(() => {
    const getAffectedCount = async () => {
      try {
        const res = await api.get('/maintenance/affected-count');
        setAffectedCount(res.data.affectedCount || 0);
      } catch (err) {
        console.error('Failed to get affected count');
      }
    };
    
    if (!loading) {
      getAffectedCount();
    }
  }, [settings.affectedTiers, loading]);

  const handleToggleMaintenance = async () => {
    if (!settings.isEnabled) {
      // Confirm before enabling
      const confirm = window.confirm(
        `Are you sure you want to enable maintenance mode?\n\nThis will affect ${affectedCount} users.`
      );
      if (!confirm) return;
    }
    
    setSaving(true);
    try {
      await api.post('/maintenance/toggle');
      showToast('success', settings.isEnabled ? 'Maintenance mode disabled' : 'Maintenance mode enabled');
      fetchSettings();
    } catch (err) {
      showToast('error', 'Failed to toggle maintenance mode');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/maintenance/settings', {
        ...settings,
        estimatedEndTime: settings.estimatedEndTime || null
      });
      showToast('success', 'Maintenance settings saved');
      fetchSettings();
    } catch (err) {
      showToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTierChange = (tier) => {
    setSettings(prev => {
      let newTiers = [...prev.affectedTiers];
      
      if (tier === 'all') {
        // Toggle between 'all' and no selection
        newTiers = newTiers.includes('all') ? [] : ['all'];
      } else {
        // Remove 'all' if selecting specific tiers
        newTiers = newTiers.filter(t => t !== 'all');
        
        if (newTiers.includes(tier)) {
          newTiers = newTiers.filter(t => t !== tier);
        } else {
          newTiers.push(tier);
        }
        
        // If no tiers selected, default to 'all'
        if (newTiers.length === 0) {
          newTiers = ['all'];
        }
      }
      
      return { ...prev, affectedTiers: newTiers };
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="admin-maintenance">
        <div className="admin-page-header">
          <div className="admin-page-header__left">
            <h2>Maintenance Mode</h2>
            <p>Loading settings...</p>
          </div>
        </div>
        <div className="admin-loading">
          <FiRefreshCw className="spin" /> Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="admin-maintenance">
      <div className="admin-page-header">
        <div className="admin-page-header__left">
          <h2>Maintenance Mode</h2>
          <p>Temporarily pause user access during system maintenance</p>
        </div>
        <div className="admin-page-header__right">
          <button className="btn btn--outline" onClick={fetchSettings} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="maintenance-status-panel">
        <div className={`maintenance-status-indicator ${settings.isEnabled ? 'active' : 'inactive'}`}>
          <div className="maintenance-status-indicator__icon">
            {settings.isEnabled ? <FiAlertTriangle /> : <FiCheck />}
          </div>
          <div className="maintenance-status-indicator__text">
            <h3>{settings.isEnabled ? 'Maintenance Mode Active' : 'System Online'}</h3>
            <p>
              {settings.isEnabled 
                ? `Enabled by ${settings.enabledBy?.name || 'Unknown'} on ${formatDate(settings.enabledAt)}`
                : 'All users have normal access'
              }
            </p>
          </div>
          <button 
            className={`maintenance-toggle-btn ${settings.isEnabled ? 'active' : ''}`}
            onClick={handleToggleMaintenance}
            disabled={saving}
          >
            <FiPower />
            {settings.isEnabled ? 'Disable' : 'Enable'} Maintenance
          </button>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="maintenance-settings-form">
        <div className="admin-card">
          <div className="admin-card__header">
            <FiUsers /> Affected Users
          </div>
          <div className="admin-card__body">
            <p className="maintenance-affected-info">
              <FiInfo /> Select which user tiers will see the maintenance message.
              Currently <strong>{affectedCount}</strong> users would be affected.
            </p>
            
            <div className="maintenance-tier-selector">
              <label className={`tier-checkbox ${settings.affectedTiers.includes('all') ? 'selected' : ''}`}>
                <input
                  type="checkbox"
                  checked={settings.affectedTiers.includes('all')}
                  onChange={() => handleTierChange('all')}
                />
                <span className="tier-checkbox__box">
                  {settings.affectedTiers.includes('all') ? <FiCheck /> : null}
                </span>
                <span className="tier-checkbox__label">
                  <strong>All Users</strong>
                  <small>Affects everyone (except admins if enabled)</small>
                </span>
              </label>
              
              <div className="tier-divider">or select specific tiers:</div>
              
              <div className="tier-options">
                <label className={`tier-checkbox ${settings.affectedTiers.includes('free') ? 'selected' : ''} ${settings.affectedTiers.includes('all') ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={settings.affectedTiers.includes('free')}
                    onChange={() => handleTierChange('free')}
                    disabled={settings.affectedTiers.includes('all')}
                  />
                  <span className="tier-checkbox__box">
                    {settings.affectedTiers.includes('free') ? <FiCheck /> : null}
                  </span>
                  <span className="tier-checkbox__label">
                    <strong>Free Tier</strong>
                    <small>Trial and free plan users</small>
                  </span>
                </label>
                
                <label className={`tier-checkbox ${settings.affectedTiers.includes('silver') ? 'selected' : ''} ${settings.affectedTiers.includes('all') ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={settings.affectedTiers.includes('silver')}
                    onChange={() => handleTierChange('silver')}
                    disabled={settings.affectedTiers.includes('all')}
                  />
                  <span className="tier-checkbox__box">
                    {settings.affectedTiers.includes('silver') ? <FiCheck /> : null}
                  </span>
                  <span className="tier-checkbox__label">
                    <strong>Silver Tier</strong>
                    <small>Silver plan subscribers</small>
                  </span>
                </label>
                
                <label className={`tier-checkbox ${settings.affectedTiers.includes('gold') ? 'selected' : ''} ${settings.affectedTiers.includes('all') ? 'disabled' : ''}`}>
                  <input
                    type="checkbox"
                    checked={settings.affectedTiers.includes('gold')}
                    onChange={() => handleTierChange('gold')}
                    disabled={settings.affectedTiers.includes('all')}
                  />
                  <span className="tier-checkbox__box">
                    {settings.affectedTiers.includes('gold') ? <FiCheck /> : null}
                  </span>
                  <span className="tier-checkbox__label">
                    <strong>Gold Tier</strong>
                    <small>Gold plan subscribers</small>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__header">
            <FiEdit3 /> Maintenance Message
          </div>
          <div className="admin-card__body">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                value={settings.title}
                onChange={(e) => setSettings(prev => ({ ...prev, title: e.target.value }))}
                placeholder="System Maintenance"
                maxLength={100}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                value={settings.message}
                onChange={(e) => setSettings(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter maintenance message..."
                rows={4}
                maxLength={500}
              />
              <small>{settings.message.length}/500 characters</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="estimatedEndTime">Estimated End Time (optional)</label>
              <input
                type="datetime-local"
                id="estimatedEndTime"
                value={settings.estimatedEndTime}
                onChange={(e) => setSettings(prev => ({ ...prev, estimatedEndTime: e.target.value }))}
              />
              <small>Leave empty if unknown</small>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card__header">
            <FiTool /> Additional Options
          </div>
          <div className="admin-card__body">
            <label className="toggle-option">
              <input
                type="checkbox"
                checked={settings.allowAdminAccess}
                onChange={(e) => setSettings(prev => ({ ...prev, allowAdminAccess: e.target.checked }))}
              />
              <span className="toggle-option__switch"></span>
              <span className="toggle-option__label">
                <strong>Allow Admin Access</strong>
                <small>Admins can still access the system during maintenance</small>
              </span>
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className="admin-card maintenance-preview">
          <div className="admin-card__header">
            <FiAlertTriangle /> Message Preview
          </div>
          <div className="admin-card__body">
            <div className="maintenance-preview-box">
              <div className="maintenance-preview-box__icon">
                <FiTool />
              </div>
              <h4>{settings.title || 'System Maintenance'}</h4>
              <p>{settings.message || 'No message set'}</p>
              {settings.estimatedEndTime && (
                <p className="maintenance-preview-box__time">
                  <FiClock /> Estimated completion: {formatDate(settings.estimatedEndTime)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="maintenance-form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? <><FiRefreshCw className="spin" /> Saving...</> : <><FiCheck /> Save Settings</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Maintenance;
