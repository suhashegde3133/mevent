import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, 
  FaUsers,
  FaUserCheck, 
  FaUserTimes, 
  FaUser,
  FaEllipsisV,
  FaEnvelope,
  FaCalendarAlt,
  FaFilter,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaDownload,
  FaFileExcel
} from 'react-icons/fa';
import { GoldStar, SilverStar } from '../../components/PlanCard/PlanCard';
import { apiHelper } from '../../utils/api';
import './Admin.scss';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selected user for detail view
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPayments, setUserPayments] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);

  // Action menu
  const [activeMenu, setActiveMenu] = useState(null);

  // Confirmation modal
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(planFilter && { plan: planFilter })
      });

      const data = await apiHelper.get(`/admin/users?${params.toString()}`);
      setUsers(data.users);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError('Failed to load users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, planFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await apiHelper.patch('/admin/users/status', { userId, status: newStatus });
      fetchUsers();
      setActiveMenu(null);
      setConfirmAction(null);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update user status');
    }
  };

  const handlePlanChange = async (userId, newPlan) => {
    try {
      await apiHelper.patch('/admin/users/plan', { userId, plan: newPlan });
      fetchUsers();
      setActiveMenu(null);
    } catch (err) {
      console.error('Error updating plan:', err);
      alert('Failed to update user plan');
    }
  };

  const handleViewUser = async (user) => {
    try {
      const data = await apiHelper.get(`/admin/users/${user._id}`);
      setSelectedUser(data.user);
      setUserPayments(data.payments);
      setShowUserModal(true);
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatJoinedDate = (user) => {
    const joinedField =
      user.createdAt ??
      user.created_at ??
      user.joinedAt ??
      user.joined ??
      null;

    if (!joinedField) return '';

    try {
      return new Date(joinedField).toLocaleDateString('en-IN');
    } catch (err) {
      return '';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPlanIcon = (plan) => {
    switch (plan) {
      case 'gold': return <GoldStar />;
      case 'silver': return <SilverStar />;
      default: return <FaUser className="plan-icon plan-icon--free" />;
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const data = await apiHelper.get('/admin/export?type=users');
      const users = data.data;
      
      if (format === 'csv') {
        // Convert to CSV
        const headers = ['Name', 'Email', 'Plan', 'Status', 'Role', 'Joined'];
        const csvRows = [
          headers.join(','),
          ...users.map(user => [
            `"${user.name || 'Unnamed'}"`,
            `"${user.email}"`,
            user.plan || 'free',
            user.status,
            user.role || 'user',
            formatJoinedDate(user)
          ].join(','))
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      } else {
        // JSON export
        const jsonContent = JSON.stringify(
          users.map((user) => ({
            ...user,
            joinedDate: formatJoinedDate(user)
          })),
          null,
          2
        );
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `users_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      }
    } catch (err) {
      console.error('Error exporting users:', err);
      alert('Failed to export users');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPlanFilter('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || statusFilter || planFilter;

  return (
    <div className="admin-user-management">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header__left">
          <h2>User Management</h2>
          <p>Manage all registered users and their accounts</p>
        </div>
        <div className="admin-page-header__right">
          <span className="admin-page-header__count">
            {pagination.total} users total
          </span>
          <div className="admin-export-btns">
            <button 
              className="admin-btn admin-btn--outline admin-btn--small"
              onClick={() => handleExport('csv')}
              title="Export as CSV"
            >
              <FaFileExcel /> Export CSV
            </button>
            <button 
              className="admin-btn admin-btn--outline admin-btn--small"
              onClick={() => handleExport('json')}
              title="Export as JSON"
            >
              <FaDownload /> Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <FaSearch className="admin-search__icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search__input"
          />
          {search && (
            <button className="admin-search__clear" onClick={() => setSearch('')}>
              <FaTimes />
            </button>
          )}
        </div>

        <button 
          className={`admin-filter-btn ${showFilters ? 'admin-filter-btn--active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FaFilter />
          <span>Filters</span>
          {hasActiveFilters && <span className="admin-filter-badge" />}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="admin-filter-panel">
          <div className="admin-filter-group">
            <label>Status</label>
            <select 
              value={statusFilter} 
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="admin-filter-group">
            <label>Plan</label>
            <select 
              value={planFilter} 
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
            >
              <option value="">All Plans</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="free">Free</option>
            </select>
          </div>
          {hasActiveFilters && (
            <button className="admin-btn admin-btn--text" onClick={clearFilters}>
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading__spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : error ? (
          <div className="admin-error">
            <p>{error}</p>
            <button onClick={fetchUsers} className="admin-btn admin-btn--primary">
              Retry
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty-state">
            <FaUsers className="admin-empty-state__icon" />
            <h3>No users found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} onClick={() => handleViewUser(user)} style={{cursor: 'pointer'}}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-user-cell__avatar">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} />
                        ) : (
                          <span>{user.name?.charAt(0) || user.email?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div className="admin-user-cell__info">
                        <span className="admin-user-cell__name">{user.name || 'Unnamed User'}</span>
                        <span className="admin-user-cell__role">{user.role || 'user'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="admin-email-cell">
                      <FaEnvelope className="admin-email-cell__icon" />
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`admin-plan-badge admin-plan-badge--${user.plan || 'free'}`}>
                      {getPlanIcon(user.plan)}
                      <span>{user.plan || 'Free'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`admin-status-badge admin-status-badge--${user.status}`}>
                      {user.status === 'active' ? <FaUserCheck /> : <FaUserTimes />}
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="admin-date-cell">
                      <FaCalendarAlt className="admin-date-cell__icon" />
                      <span>{formatDate(user.createdAt)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="admin-actions-cell">
                      <button 
                        className="admin-action-btn admin-action-btn--view"
                        onClick={(e) => { e.stopPropagation(); handleViewUser(user); }}
                        title="View Details"
                      >
                        <FaEye />
                      </button>
                      <div className="admin-action-menu-wrapper">
                        <button 
                          className="admin-action-btn"
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === user._id ? null : user._id); }}
                        >
                          <FaEllipsisV />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="admin-pagination">
          <button
            className="admin-pagination__btn"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            <FaChevronLeft /> Previous
          </button>
          <div className="admin-pagination__info">
            Page {pagination.page} of {pagination.pages}
          </div>
          <button
            className="admin-pagination__btn"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Next <FaChevronRight />
          </button>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>User Details</h3>
              <button className="admin-modal__close" onClick={() => setShowUserModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="admin-modal__body">
              <div className="admin-user-detail">
                <div className="admin-user-detail__header">
                  <div className="admin-user-detail__avatar">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt={selectedUser.name} />
                    ) : (
                      <span>{selectedUser.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="admin-user-detail__info">
                    <h4>{selectedUser.name || 'Unnamed User'}</h4>
                    <p>{selectedUser.email}</p>
                    <div className="admin-user-detail__badges">
                      <span className={`admin-plan-badge admin-plan-badge--${selectedUser.plan || 'free'}`}>
                        {getPlanIcon(selectedUser.plan)}
                        {selectedUser.plan || 'Free'}
                      </span>
                      <span className={`admin-status-badge admin-status-badge--${selectedUser.status}`}>
                        {selectedUser.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-user-detail__section">
                  <h5>Account Information</h5>
                  <div className="admin-user-detail__grid">
                    <div className="admin-user-detail__item">
                      <span className="admin-user-detail__label">Role</span>
                      <span className="admin-user-detail__value">{selectedUser.role || 'User'}</span>
                    </div>
                    <div className="admin-user-detail__item">
                      <span className="admin-user-detail__label">Joined</span>
                      <span className="admin-user-detail__value">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    <div className="admin-user-detail__item">
                      <span className="admin-user-detail__label">Auth Method</span>
                      <span className="admin-user-detail__value">
                        {selectedUser.isGoogleUser ? 'Google' : 'Email/Password'}
                      </span>
                    </div>
                  </div>
                </div>

                {userPayments.length > 0 && (
                  <div className="admin-user-detail__section">
                    <h5>Payment History</h5>
                    <div className="admin-payment-list">
                      {userPayments.map((payment) => (
                        <div key={payment._id} className="admin-payment-item">
                          <div className="admin-payment-item__info">
                            <span className="admin-payment-item__plan">{payment.plan}</span>
                            <span className="admin-payment-item__date">{formatDate(payment.createdAt)}</span>
                          </div>
                          <span className="admin-payment-item__amount">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="admin-modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="admin-modal admin-modal--small" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Confirm Action</h3>
              <button className="admin-modal__close" onClick={() => setConfirmAction(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="admin-modal__body">
              <p>
                Are you sure you want to {confirmAction.type} the user{' '}
                <strong>{confirmAction.user.name || confirmAction.user.email}</strong>?
              </p>
            </div>
            <div className="admin-modal__footer">
              <button 
                className="admin-btn admin-btn--secondary"
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <button 
                className="admin-btn admin-btn--danger"
                onClick={confirmAction.action}
              >
                {confirmAction.type === 'deactivate' ? 'Deactivate' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Menu Backdrop/Overlay */}
      {activeMenu && (
        <div className="admin-overlay" onClick={() => setActiveMenu(null)} />
      )}

      {/* Action Menu centered on Screen */}
      {activeMenu && (
        <div className="admin-action-menu">
          {(() => {
            const user = users.find(u => u._id === activeMenu);
            if (!user) return null;
            return (
              <>
                <div className="admin-action-menu__header">
                  <span className="admin-action-menu__header__name">
                    {user.name || 'Unnamed User'}
                  </span>
                  <span className="admin-action-menu__header__email">
                    {user.email}
                  </span>
                  <div className={`admin-plan-badge admin-plan-badge--${user.plan || 'free'}`}>
                    {getPlanIcon(user.plan)}
                    <span>{user.plan || 'Free'}</span>
                  </div>
                </div>
                <div className="admin-action-menu__section">
                  <span className="admin-action-menu__label">Change Status</span>
                  {user.status === 'active' ? (
                    <button
                      onClick={() => {
                        setConfirmAction({ 
                          type: 'deactivate', 
                          user,
                          action: () => handleStatusChange(user._id, 'inactive')
                        });
                        setActiveMenu(null);
                      }}
                      className="admin-action-menu__item admin-action-menu__item--danger"
                    >
                      <FaUserTimes /> Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(user._id, 'active')}
                      className="admin-action-menu__item admin-action-menu__item--success"
                    >
                      <FaUserCheck /> Activate
                    </button>
                  )}
                </div>
                <div className="admin-action-menu__section">
                  <span className="admin-action-menu__label">Change Plan</span>
                  {['free', 'silver', 'gold'].map((plan) => (
                    <button
                      key={plan}
                      onClick={() => handlePlanChange(user._id, plan)}
                      className={`admin-action-menu__item ${user.plan === plan ? 'admin-action-menu__item--active' : ''}`}
                      disabled={user.plan === plan}
                    >
                      {getPlanIcon(plan)}
                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
