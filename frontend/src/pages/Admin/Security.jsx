import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiShield, FiLock, FiMonitor, FiClock, FiActivity, 
  FiRefreshCw, FiTrash2, FiUserCheck, FiUserX, FiSettings 
} from 'react-icons/fi';
import api from '../../utils/api';
import { showToast } from '../../utils/toast';
import './Admin.scss';

const Security = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    failedLogins24h: 0,
    activeSessions: 0,
    lockedAccounts: 0,
    systemHealth: 'Loading...'
  });
  const [settings, setSettings] = useState({
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    passwordMinLength: 8,
    requireSpecialChar: true,
    requireNumber: true,
    requireUppercase: true,
    sessionTimeout: 24,
    twoFactorEnabled: false
  });
  const [sessions, setSessions] = useState([]);
  const [attempts, setAttempts] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, settingsRes, sessionsRes, attemptsRes] = await Promise.all([
        api.get('/security/stats'),
        api.get('/security/settings'),
        api.get('/security/sessions'),
        api.get('/security/attempts')
      ]);

      setStats(statsRes.data);
      setSettings(settingsRes.data);
      setSessions(sessionsRes.data);
      setAttempts(attemptsRes.data);
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateSettings = async (e) => {
    if (e) e.preventDefault();
    try {
      await api.post('/security/settings', settings);
      showToast('success', 'Security settings updated successfully');
    } catch (err) {
      showToast('error', 'Failed to update settings');
    }
  };

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to revoke this session?')) return;
    try {
      await api.delete(`/security/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      showToast('success', 'Session revoked');
      setStats(prev => ({ ...prev, activeSessions: prev.activeSessions - 1 }));
    } catch (err) {
      showToast('error', 'Failed to revoke session');
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!window.confirm('Are you sure you want to revoke ALL sessions? You will be logged out too.')) return;
    try {
      await api.delete('/security/sessions');
      showToast('success', 'All sessions revoked');
      fetchData();
    } catch (err) {
      showToast('error', 'Failed to revoke all sessions');
    }
  };

  const handleUnlockUser = async (email) => {
    try {
      await api.post('/security/unlock-user', { email });
      showToast('success', `User ${email} has been unlocked`);
      fetchData();
    } catch (err) {
      showToast('error', 'Failed to unlock user');
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="security-stat-card">
      <div className={`security-stat-card__icon ${color}`}>
        <Icon />
      </div>
      <div className="security-stat-card__content">
        <h4>{value}</h4>
        <p>{label}</p>
      </div>
    </div>
  );

  return (
    <div className="admin-security">
      <div className="admin-page-header">
        <div className="admin-page-header__left">
          <h2>Security Center</h2>
          <p>Monitor system health and manage access controls</p>
        </div>
        <div className="admin-page-header__right">
          <button className="btn btn--outline" onClick={fetchData} disabled={loading}>
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="security-stats-grid">
        <StatCard 
          icon={FiUserX} 
          label="Failed Logins (24h)" 
          value={stats.failedLogins24h} 
          color="danger" 
        />
        <StatCard 
          icon={FiMonitor} 
          label="Active Sessions" 
          value={stats.activeSessions} 
          color="primary" 
        />
        <StatCard 
          icon={FiLock} 
          label="Locked Accounts" 
          value={stats.lockedAccounts} 
          color="warning" 
        />
        <StatCard 
          icon={FiShield} 
          label="System Status" 
          value={stats.systemHealth} 
          color="success" 
        />
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiActivity /> Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <FiMonitor /> Active Sessions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FiSettings /> Policy Settings
        </button>
        <button 
          className={`tab-btn ${activeTab === 'attempts' ? 'active' : ''}`}
          onClick={() => setActiveTab('attempts')}
        >
          <FiClock /> Login History
        </button>
      </div>

      <div className="security-content">
        {activeTab === 'overview' && (
          <div className="security-tab-panel overview-panel">
            <div className="security-info-grid">
              <div className="info-card">
                <h3>Security Overview</h3>
                <div className="security-checklist">
                  <div className="checklist-item success">
                    <FiUserCheck /> <span>JWT Authentication Active</span>
                  </div>
                  <div className="checklist-item success">
                    <FiLock /> <span>Brute-force Protection Enabled</span>
                  </div>
                  <div className="checklist-item info">
                    <FiShield /> <span>IP Whitelisting: Global</span>
                  </div>
                  <div className="checklist-item warning">
                    <FiActivity /> <span>2FA: {settings.twoFactorEnabled ? 'Enabled' : 'Disabled (Recommended)'}</span>
                  </div>
                </div>
              </div>
              <div className="info-card">
                <h3>Quick Actions</h3>
                <div className="quick-actions-btns">
                  <button className="btn btn--danger btn--full" onClick={handleRevokeAllSessions}>
                    <FiTrash2 /> Revoke All Sessions
                  </button>
                  <button className="btn btn--outline btn--full" onClick={() => setActiveTab('settings')}>
                    <FiSettings /> Adjust Lockout Thresholds
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="security-tab-panel">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Device / Browser</th>
                    <th>IP Address</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length > 0 ? sessions.map(session => (
                    <tr key={session._id}>
                      <td>
                        <div className="user-info-cell">
                          <strong>{session.userId?.name || 'Unknown'}</strong>
                          <span>{session.userId?.email || 'N/A'}</span>
                        </div>
                      </td>
                      <td>{session.device || 'Unknown Device'}</td>
                      <td>{session.ipAddress}</td>
                      <td>{new Date(session.lastActive).toLocaleString()}</td>
                      <td>
                        <button 
                          className="btn-icon btn-icon--danger" 
                          onClick={() => handleRevokeSession(session._id)}
                          title="Revoke Session"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center">No active sessions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="security-tab-panel">
            <form className="security-settings-form" onSubmit={handleUpdateSettings}>
              <div className="form-section">
                <h3>Authentication Controls</h3>
                <div className="settings-grid">
                  <div className="form-group">
                    <label>Max Login Attempts</label>
                    <input 
                      type="number" 
                      value={settings.maxLoginAttempts || ''}
                      onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value) || 0})}
                    />
                    <small>Number of failed attempts before account lockout</small>
                  </div>
                  <div className="form-group">
                    <label>Lockout Duration (Minutes)</label>
                    <input 
                      type="number" 
                      value={settings.lockoutDuration || ''}
                      onChange={(e) => setSettings({...settings, lockoutDuration: parseInt(e.target.value) || 0})}
                    />
                    <small>How long the account remains locked</small>
                  </div>
                  <div className="form-group">
                    <label>Session Timeout (Hours)</label>
                    <input 
                      type="number" 
                      value={settings.sessionTimeout || ''}
                      onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Password Complexity</h3>
                <div className="checkbox-grid">
                  <label className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={settings.requireUppercase}
                      onChange={(e) => setSettings({...settings, requireUppercase: e.target.checked})}
                    />
                    Require Uppercase Letters
                  </label>
                  <label className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={settings.requireNumber}
                      onChange={(e) => setSettings({...settings, requireNumber: e.target.checked})}
                    />
                    Require Numbers
                  </label>
                  <label className="checkbox-item">
                    <input 
                      type="checkbox" 
                      checked={settings.requireSpecialChar}
                      onChange={(e) => setSettings({...settings, requireSpecialChar: e.target.checked})}
                    />
                    Require Special Characters
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn--primary">Save Security Policy</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'attempts' && (
          <div className="security-tab-panel">
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>IP Address</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.length > 0 ? attempts.map(attempt => (
                    <tr key={attempt._id}>
                      <td>{attempt.email}</td>
                      <td>
                        <span className={`status-badge status-badge--${attempt.status === 'success' ? 'active' : 'inactive'}`}>
                          {attempt.status}
                        </span>
                      </td>
                      <td>{attempt.reason || '-'}</td>
                      <td>{attempt.ipAddress}</td>
                      <td>{new Date(attempt.timestamp).toLocaleString()}</td>
                      <td>
                        {attempt.reason === 'account_locked' && (
                          <button 
                            className="btn btn--xs btn--outline"
                            onClick={() => handleUnlockUser(attempt.email)}
                          >
                            Unlock
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="6" className="text-center">No login history available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Security;

