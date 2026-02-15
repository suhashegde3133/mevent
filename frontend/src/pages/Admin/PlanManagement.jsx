import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaUser,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaExchangeAlt,
  FaArrowUp,
  FaArrowDown,
  FaDownload,
  FaFileExcel
} from 'react-icons/fa';
import { GoldStar, SilverStar } from '../../components/PlanCard/PlanCard';
import { apiHelper } from '../../utils/api';
import useConfirm from '../../hooks/useConfirm';
import './Admin.scss';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: <FaUser />,
    color: '#6366F1',
    price: 0,
    features: ['Basic features', 'Limited storage', 'Email support']
  },
  {
    id: 'silver',
    name: 'Silver',
    icon: <SilverStar />,
    color: '#9CA3AF',
    price: 999,
    features: ['All Free features', '10GB storage', 'Priority support', 'Advanced analytics']
  },
  {
    id: 'gold',
    name: 'Gold',
    icon: <GoldStar />,
    color: '#F59E0B',
    price: 1999,
    features: ['All Silver features', 'Unlimited storage', '24/7 support', 'Custom branding', 'API access']
  }
];

const PlanManagement = () => {
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Plan change modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPlan, setNewPlan] = useState('');
  const [updating, setUpdating] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    free: 0,
    silver: 0,
    gold: 0
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(selectedPlan && { plan: selectedPlan })
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
  }, [pagination.page, pagination.limit, search, selectedPlan]);

  const fetchStats = async () => {
    try {
      const data = await apiHelper.get('/admin/metrics');
      setStats({
        free: data.freeUsers || 0,
        silver: data.silverUsers || 0,
        gold: data.goldUsers || 0
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePlanChange = async () => {
    if (!selectedUser || !newPlan) return;
    
    const currentPlan = selectedUser.plan || 'free';
    const currentPlanInfo = getPlanInfo(currentPlan);
    const newPlanInfo = getPlanInfo(newPlan);
    
    // Determine if upgrade or downgrade
    const currentIndex = PLANS.findIndex(p => p.id === currentPlan);
    const newIndex = PLANS.findIndex(p => p.id === newPlan);
    
    let confirmMessage = '';
    let confirmTitle = '';
    
    if (newIndex > currentIndex) {
      // Upgrade
      confirmTitle = 'Confirm Plan Upgrade';
      confirmMessage = `Are you sure you want to upgrade ${selectedUser.name || 'this user'}'s plan from ${currentPlanInfo.name} to ${newPlanInfo.name}?`;
    } else if (newIndex < currentIndex) {
      // Downgrade
      confirmTitle = 'Confirm Plan Downgrade';
      confirmMessage = `Are you sure you want to downgrade ${selectedUser.name || 'this user'}'s plan to ${newPlanInfo.name}?`;
    } else {
      // Same plan (shouldn't happen due to button disable, but just in case)
      confirmTitle = 'No Change';
      confirmMessage = `This user is already on the ${currentPlanInfo.name} plan.`;
    }
    
    try {
      const confirmed = await confirm(confirmMessage, {
        title: confirmTitle,
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      });
      
      if (!confirmed) return;
      
      setUpdating(true);
      await apiHelper.patch('/admin/users/plan', { 
        userId: selectedUser._id, 
        plan: newPlan 
      });
      
      fetchUsers();
      fetchStats();
      setShowPlanModal(false);
      setSelectedUser(null);
      setNewPlan('');
    } catch (err) {
      console.error('Error updating plan:', err);
      // Show error confirmation
      await confirm('Failed to update plan. Please try again.', {
        title: 'Error',
        confirmText: 'OK',
        cancelText: ''
      });
    } finally {
      setUpdating(false);
    }
  };

  const openPlanModal = (user) => {
    setSelectedUser(user);
    setNewPlan(user.plan || 'free');
    setShowPlanModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPlanDate = (user) => {
    // Show plan activation date for paid plans, otherwise registration date
    const planDate = user.planActivatedAt || user.createdAt || user.created_at || user.joinedAt || user.joined;
    
    if (!planDate) return '';

    try {
      return new Date(planDate).toLocaleDateString('en-IN');
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
      default: return <FaUser />;
    }
  };

  const handleExport = async (format = 'json') => {
    try {
      const data = await apiHelper.get('/admin/export?type=users');
      const users = data.data;
      
      if (format === 'csv') {
        // Convert to CSV with plan focus
        const headers = ['Name', 'Email', 'Plan', 'Plan Price', 'Status', 'Plan Activated'];
        const csvRows = [
          headers.join(','),
          ...users.map(user => {
            const userPlan = PLANS.find(p => p.id === (user.plan || 'free')) || PLANS[0];
            return [
              `"${user.name || 'Unnamed'}"`,
              `"${user.email}"`,
              userPlan.name,
              userPlan.price,
              user.status,
              formatPlanDate(user)
            ].join(',');
          })
        ];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `plan_users_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      } else {
        // JSON export
        const jsonContent = JSON.stringify(
          users.map((user) => ({
            ...user,
            planDate: formatPlanDate(user)
          })),
          null,
          2
        );
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `plan_users_export_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      }
    } catch (err) {
      console.error('Error exporting users:', err);
      await confirm('Failed to export users. Please try again.', {
        title: 'Export Error',
        confirmText: 'OK',
        cancelText: ''
      });
    }
  };

  const getPlanInfo = (planId) => {
    return PLANS.find(p => p.id === planId) || PLANS[0];
  };

  return (
    <div className="admin-plan-management">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header__left">
          <h2>Plan Management</h2>
          <p>Manage user subscriptions and plan upgrades</p>
        </div>
        <div className="admin-page-header__right">
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

      {/* Plan Stats Cards */}
      <div className="admin-plan-stats">
        {PLANS.map((plan) => (
          <div 
            key={plan.id}
            className={`admin-plan-stat-card admin-plan-stat-card--${plan.id} ${selectedPlan === plan.id ? 'admin-plan-stat-card--selected' : ''}`}
            onClick={() => {
              setSelectedPlan(selectedPlan === plan.id ? '' : plan.id);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <div className="admin-plan-stat-card__icon" style={{ color: plan.color }}>
              {plan.icon}
            </div>
            <div className="admin-plan-stat-card__content">
              <span className="admin-plan-stat-card__count">{stats[plan.id]}</span>
              <span className="admin-plan-stat-card__label">{plan.name} Users</span>
            </div>
            <div className="admin-plan-stat-card__price">
              {plan.price > 0 ? 'Paid / Annually' : 'Free'}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="admin-toolbar">
        <div className="admin-search">
          <FaSearch className="admin-search__icon" />
          <input
            type="text"
            placeholder="Search users..."
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
        {selectedPlan && (
          <button 
            className="admin-btn admin-btn--text"
            onClick={() => setSelectedPlan('')}
          >
            Clear Filter
          </button>
        )}
      </div>

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
            <div className="admin-empty-state__icon">
              <GoldStar />
            </div>
            <h3>No users found</h3>
            <p>Try adjusting your search or filter</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Current Plan</th>
                <th>Status</th>
                <th>Plan Activated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const userPlan = getPlanInfo(user.plan || 'free');
                return (
                  <tr key={user._id}>
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
                          <span className="admin-user-cell__email">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={`admin-plan-badge admin-plan-badge--${user.plan || 'free'}`}>
                        {getPlanIcon(user.plan)}
                        <span>{userPlan.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-status-badge admin-status-badge--${user.status || 'active'}`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td>{formatPlanDate(user)}</td>
                    <td>
                      <button 
                        className="admin-btn admin-btn--outline admin-btn--small"
                        onClick={() => openPlanModal(user)}
                      >
                        <FaExchangeAlt />
                        Change Plan
                      </button>
                    </td>
                  </tr>
                );
              })}
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

      {/* Plan Change Modal */}
      {showPlanModal && selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="admin-modal admin-modal--plan" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal__header">
              <h3>Change User Plan</h3>
              <button className="admin-modal__close" onClick={() => setShowPlanModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="admin-modal__body">
              <div className="admin-plan-change">
                <div className="admin-plan-change__user">
                  <div className="admin-user-cell__avatar">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt={selectedUser.name} />
                    ) : (
                      <span>{selectedUser.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div>
                    <h4>{selectedUser.name || 'Unnamed User'}</h4>
                    <p>{selectedUser.email}</p>
                  </div>
                </div>

                <div className="admin-plan-change__current">
                  <span>Current Plan:</span>
                  <div className={`admin-plan-badge admin-plan-badge--${selectedUser.plan || 'free'}`}>
                    {getPlanIcon(selectedUser.plan)}
                    {getPlanInfo(selectedUser.plan || 'free').name}
                  </div>
                </div>

                <div className="admin-plan-change__options">
                  <label>Select New Plan:</label>
                  <div className="admin-plan-options">
                    {PLANS.map((plan) => {
                      const currentPlan = selectedUser.plan || 'free';
                      const isUpgrade = PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan);
                      const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < PLANS.findIndex(p => p.id === currentPlan);
                      
                      return (
                        <div 
                          key={plan.id}
                          className={`admin-plan-option ${newPlan === plan.id ? 'admin-plan-option--selected' : ''}`}
                          onClick={() => setNewPlan(plan.id)}
                        >
                          <div className="admin-plan-option__header">
                            <div className="admin-plan-option__icon" style={{ color: plan.color }}>
                              {plan.icon}
                            </div>
                            <div className="admin-plan-option__name">{plan.name}</div>
                            {isUpgrade && <span className="admin-plan-option__badge admin-plan-option__badge--upgrade"><FaArrowUp /> Upgrade</span>}
                            {isDowngrade && <span className="admin-plan-option__badge admin-plan-option__badge--downgrade"><FaArrowDown /> Downgrade</span>}
                          </div>
                          <div className="admin-plan-option__price">
                            {plan.price > 0 ? 'Paid / Annually' : 'Free'}
                          </div>
                          {/* <ul className="admin-plan-option__features">
                            {plan.features.map((feature, idx) => (
                              <li key={idx}>{feature}</li>
                            ))}
                          </ul> */}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="admin-modal__footer">
              <button 
                className="admin-btn admin-btn--secondary"
                onClick={() => setShowPlanModal(false)}
                disabled={updating}
              >
                Cancel
              </button>
              <button 
                className="admin-btn admin-btn--primary"
                onClick={handlePlanChange}
                disabled={updating || newPlan === (selectedUser.plan || 'free')}
              >
                {updating ? 'Updating...' : 'Update Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManagement;
