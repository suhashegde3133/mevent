import React, { useState, useEffect, useCallback } from 'react';
import {
  FaBullhorn,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaCalendarAlt,
  FaPaperPlane,
  FaArchive,
  FaUsers,
  FaTimes,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaBell,
  FaFilter
} from 'react-icons/fa';
import { apiHelper } from '../../utils/api';
import { notify } from '../../utils/notifications';
import logger from '../../utils/logger';
import errorHandler from '../../utils/errorHandler';
import './Admin.scss';

// Theme options for announcements
const THEMES = [
  { value: 'default', label: 'Default', color: '#6366f1' },
  { value: 'info', label: 'Information', color: '#3b82f6' },
  { value: 'success', label: 'Success', color: '#10b981' },
  { value: 'warning', label: 'Warning', color: '#f59e0b' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444' }
];

// Icon options
const ICON_OPTIONS = [
  { value: 'none', label: 'None', icon: null },
  { value: 'info', label: 'Info', icon: <FaInfoCircle /> },
  { value: 'announcement', label: 'Announcement', icon: <FaBullhorn /> },
  { value: 'warning', label: 'Warning', icon: <FaExclamationTriangle /> },
  { value: 'celebration', label: 'Celebration', icon: <FaCheckCircle /> },
  { value: 'update', label: 'Update', icon: <FaBell /> }
];

// Plan options
const PLAN_OPTIONS = [
  { value: 'all', label: 'All Plans' },
  { value: 'free', label: 'Free' },
  { value: 'silver', label: 'Silver' },
  { value: 'gold', label: 'Gold' }
];

// Role options
const ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'photographer', label: 'Photographers' },
  { value: 'admin', label: 'Admins' },
  { value: 'superadmin', label: 'Super Admins' }
];

// Status badge component
const StatusBadge = ({ status }) => {
  const statusStyles = {
    draft: { bg: '#6b7280', label: 'Draft' },
    scheduled: { bg: '#8b5cf6', label: 'Scheduled' },
    published: { bg: '#10b981', label: 'Published' },
    expired: { bg: '#ef4444', label: 'Expired' },
    archived: { bg: '#374151', label: 'Archived' }
  };

  const style = statusStyles[status] || statusStyles.draft;

  return (
    <span 
      className="announcement-status-badge"
      style={{ backgroundColor: style.bg }}
    >
      {style.label}
    </span>
  );
};

// Announcement form component
const AnnouncementForm = ({ announcement, onSave, onCancel, isLoading }) => {
  const [form, setForm] = useState({
    title: '',
    content: '',
    targetPlans: ['all'],
    targetRoles: ['all'],
    publishAt: '',
    expiresAt: '',
    status: 'draft',
    theme: 'default',
    customStyle: {
      backgroundColor: '',
      textColor: '',
      borderColor: '',
      iconType: 'announcement'
    },
    displayOptions: {
      dismissible: true,
      showAsModal: true,
      showAsBanner: true,
      priority: 0
    },
    sendNotification: {
      email: false,
      push: false,
      inApp: true
    }
  });

  const [targetedCount, setTargetedCount] = useState(null);
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    if (announcement) {
      setForm({
        ...form,
        ...announcement,
        publishAt: announcement.publishAt 
          ? new Date(announcement.publishAt).toISOString().slice(0, 16) 
          : '',
        expiresAt: announcement.expiresAt 
          ? new Date(announcement.expiresAt).toISOString().slice(0, 16) 
          : ''
      });
    }
  }, [announcement]);

  // Fetch targeted user count when targeting changes
  useEffect(() => {
    const fetchTargetedCount = async () => {
      try {
        const plans = form.targetPlans.join(',');
        const roles = form.targetRoles.join(',');
        const response = await apiHelper.get(`/announcements/segment-preview?plans=${plans}&roles=${roles}`);
        setTargetedCount(response.data.count);
      } catch (error) {
        logger.debug('Error fetching targeted count', error, 'Announcements');
      }
    };

    fetchTargetedCount();
  }, [form.targetPlans, form.targetRoles]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setForm(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleMultiSelect = (field, value) => {
    setForm(prev => {
      const current = prev[field];
      if (value === 'all') {
        return { ...prev, [field]: ['all'] };
      }
      
      let newValues = current.filter(v => v !== 'all');
      if (newValues.includes(value)) {
        newValues = newValues.filter(v => v !== value);
      } else {
        newValues.push(value);
      }
      
      if (newValues.length === 0) {
        newValues = ['all'];
      }
      
      return { ...prev, [field]: newValues };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const selectedTheme = THEMES.find(t => t.value === form.theme);

  return (
    <div className="announcement-form-overlay">
      <div className="announcement-form-modal">
        <div className="announcement-form-header">
          <h2>{announcement ? 'Edit Announcement' : 'Create Announcement'}</h2>
          <button className="close-btn" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>

        <div className="announcement-form-tabs">
          <button 
            className={`tab ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            Content
          </button>
          <button 
            className={`tab ${activeTab === 'targeting' ? 'active' : ''}`}
            onClick={() => setActiveTab('targeting')}
          >
            Targeting
          </button>
          <button 
            className={`tab ${activeTab === 'scheduling' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduling')}
          >
            Scheduling
          </button>
          <button 
            className={`tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Appearance
          </button>
        </div>

        <form onSubmit={handleSubmit} className="announcement-form-content">
          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="form-tab-content">
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="Announcement title..."
                  maxLength={200}
                  required
                />
                <span className="char-count">{form.title.length}/200</span>
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={form.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  placeholder="Announcement content..."
                  rows={6}
                  maxLength={5000}
                  required
                />
                <span className="char-count">{form.content.length}/5000</span>
              </div>

              <div className="form-group">
                <label>Notification Options</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.sendNotification.inApp}
                      onChange={(e) => handleNestedChange('sendNotification', 'inApp', e.target.checked)}
                    />
                    <span>In-App Notification</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.sendNotification.email}
                      onChange={(e) => handleNestedChange('sendNotification', 'email', e.target.checked)}
                    />
                    <span>Email Notification</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Targeting Tab */}
          {activeTab === 'targeting' && (
            <div className="form-tab-content">
              <div className="targeting-preview">
                <FaUsers />
                <span>This announcement will reach <strong>{targetedCount ?? '...'}</strong> users</span>
              </div>

              <div className="form-group">
                <label>Target Plans</label>
                <div className="chip-select">
                  {PLAN_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`chip ${form.targetPlans.includes(option.value) ? 'selected' : ''}`}
                      onClick={() => handleMultiSelect('targetPlans', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Target Roles</label>
                <div className="chip-select">
                  {ROLE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`chip ${form.targetRoles.includes(option.value) ? 'selected' : ''}`}
                      onClick={() => handleMultiSelect('targetRoles', option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Display Options</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.displayOptions.dismissible}
                      onChange={(e) => handleNestedChange('displayOptions', 'dismissible', e.target.checked)}
                    />
                    <span>Allow users to dismiss</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.displayOptions.showAsBanner}
                      onChange={(e) => handleNestedChange('displayOptions', 'showAsBanner', e.target.checked)}
                    />
                    <span>Show as banner</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.displayOptions.showAsModal}
                      onChange={(e) => handleNestedChange('displayOptions', 'showAsModal', e.target.checked)}
                    />
                    <span>Show as modal popup</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Priority (0-10)</label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={form.displayOptions.priority}
                  onChange={(e) => handleNestedChange('displayOptions', 'priority', parseInt(e.target.value))}
                />
                <span className="priority-value">{form.displayOptions.priority}</span>
              </div>
            </div>
          )}

          {/* Scheduling Tab */}
          {activeTab === 'scheduling' && (
            <div className="form-tab-content">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <FaCalendarAlt /> Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(e) => handleChange('publishAt', e.target.value)}
                />
                <span className="hint">Leave empty to publish immediately when status is set to Published</span>
              </div>

              <div className="form-group">
                <label>
                  <FaCalendarAlt /> Expiration Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => handleChange('expiresAt', e.target.value)}
                />
                <span className="hint">Leave empty for no expiration</span>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="form-tab-content">
              <div className="form-group">
                <label>Theme</label>
                <div className="theme-select">
                  {THEMES.map(theme => (
                    <button
                      key={theme.value}
                      type="button"
                      className={`theme-option ${form.theme === theme.value ? 'selected' : ''}`}
                      style={{ 
                        borderColor: form.theme === theme.value ? theme.color : 'transparent',
                        backgroundColor: form.theme === theme.value ? `${theme.color}15` : 'transparent'
                      }}
                      onClick={() => handleChange('theme', theme.value)}
                    >
                      <span className="theme-dot" style={{ backgroundColor: theme.color }}></span>
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Icon</label>
                <div className="icon-select">
                  {ICON_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`icon-option ${form.customStyle.iconType === option.value ? 'selected' : ''}`}
                      onClick={() => handleNestedChange('customStyle', 'iconType', option.value)}
                    >
                      {option.icon || 'None'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="appearance-preview">
                <h4>Preview</h4>
                <div 
                  className={`announcement-preview theme-${form.theme}`}
                  style={{
                    backgroundColor: form.customStyle.backgroundColor || undefined,
                    color: form.customStyle.textColor || undefined,
                    borderColor: form.customStyle.borderColor || selectedTheme?.color
                  }}
                >
                  <div className="preview-icon">
                    {ICON_OPTIONS.find(i => i.value === form.customStyle.iconType)?.icon || <FaBullhorn />}
                  </div>
                  <div className="preview-content">
                    <strong>{form.title || 'Announcement Title'}</strong>
                    <p>{form.content || 'Announcement content will appear here...'}</p>
                  </div>
                  {form.displayOptions.dismissible && (
                    <button className="preview-dismiss">×</button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Custom Colors (Optional)</label>
                <div className="color-inputs">
                  <div className="color-input">
                    <label>Background</label>
                    <input
                      type="color"
                      value={form.customStyle.backgroundColor || '#ffffff'}
                      onChange={(e) => handleNestedChange('customStyle', 'backgroundColor', e.target.value)}
                    />
                  </div>
                  <div className="color-input">
                    <label>Text</label>
                    <input
                      type="color"
                      value={form.customStyle.textColor || '#000000'}
                      onChange={(e) => handleNestedChange('customStyle', 'textColor', e.target.value)}
                    />
                  </div>
                  <div className="color-input">
                    <label>Border</label>
                    <input
                      type="color"
                      value={form.customStyle.borderColor || '#6366f1'}
                      onChange={(e) => handleNestedChange('customStyle', 'borderColor', e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    className="reset-colors-btn"
                    onClick={() => handleChange('customStyle', {
                      ...form.customStyle,
                      backgroundColor: '',
                      textColor: '',
                      borderColor: ''
                    })}
                  >
                    Reset Colors
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="announcement-form-actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving...' : (announcement ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Announcements component
const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiHelper.get(
        `/announcements?status=${statusFilter}&page=${pagination.page}&limit=${pagination.limit}`
      );
      setAnnouncements(response.data);
      setPagination(prev => ({ ...prev, ...response.pagination }));
    } catch (error) {
      errorHandler.handleApiError(error, 'Announcements');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, pagination.page, pagination.limit]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiHelper.get('/announcements/stats');
      setStats(response.data);
    } catch (error) {
      logger.debug('Error fetching stats', error, 'Announcements');
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    fetchStats();
  }, [fetchAnnouncements, fetchStats]);

  // Handle save
  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (editingAnnouncement) {
        await apiHelper.put(`/announcements/${editingAnnouncement._id}`, formData);
        notify.success('Announcement updated successfully');
      } else {
        await apiHelper.post('/announcements', formData);
        notify.success('Announcement created successfully');
      }
      setIsFormOpen(false);
      setEditingAnnouncement(null);
      fetchAnnouncements();
      fetchStats();
    } catch (error) {
      errorHandler.handleApiError(error, 'Announcements');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await apiHelper.delete(`/announcements/${id}`);
      notify.success('Announcement deleted');
      fetchAnnouncements();
      fetchStats();
    } catch (error) {
      errorHandler.handleApiError(error, 'Announcements');
    }
  };

  // Handle publish
  const handlePublish = async (id) => {
    try {
      await apiHelper.post(`/announcements/${id}/publish`);
      notify.success('Announcement published');
      fetchAnnouncements();
      fetchStats();
    } catch (error) {
      errorHandler.handleApiError(error, 'Announcements');
    }
  };

  // Handle archive
  const handleArchive = async (id) => {
    try {
      await apiHelper.post(`/announcements/${id}/archive`);
      notify.success('Announcement archived');
      fetchAnnouncements();
      fetchStats();
    } catch (error) {
      errorHandler.handleApiError(error, 'Announcements');
    }
  };

  // Open edit form
  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  };

  // Open create form
  const handleCreate = () => {
    setEditingAnnouncement(null);
    setIsFormOpen(true);
  };

  // Get stat count
  const getStatCount = (status) => {
    if (!stats?.byStatus) return 0;
    const stat = stats.byStatus.find(s => s._id === status);
    return stat?.count || 0;
  };

  return (
    <div className="admin-announcements">
      {/* Header */}
      <div className="announcements-header">
        <div className="header-left">
          <h2>
            <FaBullhorn /> Announcements
          </h2>
          <p>Create and manage announcements for your users</p>
        </div>
        <button className="btn-primary" onClick={handleCreate}>
          <FaPlus /> New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="announcements-stats">
        <div className="stat-card">
          <span className="stat-value">{getStatCount('draft')}</span>
          <span className="stat-label">Drafts</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{getStatCount('scheduled')}</span>
          <span className="stat-label">Scheduled</span>
        </div>
        <div className="stat-card published">
          <span className="stat-value">{getStatCount('published')}</span>
          <span className="stat-label">Published</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats?.totalViews || 0}</span>
          <span className="stat-label">Total Views</span>
        </div>
      </div>

      {/* Filters */}
      <div className="announcements-filters">
        <div className="filter-group">
          <FaFilter />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Drafts</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="expired">Expired</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="announcements-list">
        {isLoading ? (
          <div className="loading-state">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <FaBullhorn />
            <h3>No announcements found</h3>
            <p>Create your first announcement to reach your users</p>
            <button className="btn-primary" onClick={handleCreate}>
              <FaPlus /> Create Announcement
            </button>
          </div>
        ) : (
          announcements.map(announcement => (
            <div key={announcement._id} className={`announcement-card theme-${announcement.theme}`}>
              <div className="announcement-card-header">
                <h3>{announcement.title}</h3>
                <StatusBadge status={announcement.status} />
              </div>
              <p className="announcement-content">{announcement.content}</p>
              <div className="announcement-meta">
                <span>
                  <FaUsers /> {announcement.targetPlans.includes('all') ? 'All plans' : announcement.targetPlans.join(', ')}
                </span>
                <span>
                  <FaEye /> {announcement.viewCount} views
                </span>
                {announcement.publishAt && (
                  <span>
                    <FaCalendarAlt /> {new Date(announcement.publishAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="announcement-actions">
                <button onClick={() => handleEdit(announcement)} title="Edit">
                  <FaEdit />
                </button>
                {announcement.status === 'draft' && (
                  <button onClick={() => handlePublish(announcement._id)} title="Publish">
                    <FaPaperPlane />
                  </button>
                )}
                {announcement.status === 'published' && (
                  <button onClick={() => handleArchive(announcement._id)} title="Archive">
                    <FaArchive />
                  </button>
                )}
                <button 
                  onClick={() => handleDelete(announcement._id)} 
                  className="delete-btn"
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="announcements-pagination">
          <button
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </button>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <AnnouncementForm
          announcement={editingAnnouncement}
          onSave={handleSave}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingAnnouncement(null);
          }}
          isLoading={isSaving}
        />
      )}
    </div>
  );
};

export default Announcements;
