import React, { useState, useEffect, useCallback } from 'react';
import { 
  FaSearch, 
  FaUserShield,
  FaUserCheck, 
  FaUserTimes, 
  FaCrown,
  FaUsers,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowUp,
  FaArrowDown,
  FaUser
} from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { GoldStar, SilverStar } from '../../components/PlanCard/PlanCard';
import { apiHelper } from '../../utils/api';
import './Admin.scss';

// Protected super admin email - cannot be demoted
const PROTECTED_SUPERADMIN_EMAIL = "vivekbhat0120@gmail.com";

const SuperAdminManagement = () => {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('admins'); // 'admins' or 'users'
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchAdmins = async () => {
    try {
      const data = await apiHelper.get('/admin/admins');
      setAdmins(data.admins);
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search })
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
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [fetchUsers, activeTab]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openConfirmModal = (user, action) => {
    setSelectedUser(user);
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setSelectedUser(null);
    setConfirmAction(null);
  };

  const handlePromoteToAdmin = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      await apiHelper.patch('/admin/users/role', { 
        userId: selectedUser._id, 
        role: 'admin' 
      });
      
      fetchAdmins();
      fetchUsers();
      closeConfirmModal();
    } catch (err) {
      console.error('Error promoting user:', err);
      alert(err.message || 'Failed to promote user');
    } finally {
      setProcessing(false);
    }
  };

  const handleDemoteFromAdmin = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      await apiHelper.patch('/admin/users/role', { 
        userId: selectedUser._id, 
        role: 'photographer' 
      });
      
      fetchAdmins();
      fetchUsers();
      closeConfirmModal();
    } catch (err) {
      console.error('Error demoting user:', err);
      alert(err.message || 'Failed to demote user');
    } finally {
      setProcessing(false);
    }
  };

  const handlePromoteToSuperAdmin = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      await apiHelper.patch('/admin/users/superadmin/promote', { 
        userId: selectedUser._id 
      });
      
      fetchAdmins();
      closeConfirmModal();
    } catch (err) {
      console.error('Error promoting to super admin:', err);
      alert(err.message || 'Failed to promote to super admin');
    } finally {
      setProcessing(false);
    }
  };

  const handleDemoteSuperAdmin = async () => {
    if (!selectedUser) return;
    
    try {
      setProcessing(true);
      await apiHelper.patch('/admin/users/superadmin/demote', { 
        userId: selectedUser._id 
      });
      
      fetchAdmins();
      closeConfirmModal();
    } catch (err) {
      console.error('Error demoting super admin:', err);
      alert(err.message || 'Failed to demote super admin');
    } finally {
      setProcessing(false);
    }
  };

  const executeConfirmAction = () => {
    switch (confirmAction) {
      case 'promoteAdmin':
        handlePromoteToAdmin();
        break;
      case 'demoteAdmin':
        handleDemoteFromAdmin();
        break;
      case 'promoteSuperAdmin':
        handlePromoteToSuperAdmin();
        break;
      case 'demoteSuperAdmin':
        handleDemoteSuperAdmin();
        break;
      default:
        break;
    }
  };

  const getConfirmationMessage = () => {
    if (!selectedUser || !confirmAction) return '';
    
    switch (confirmAction) {
      case 'promoteAdmin':
        return `Are you sure you want to promote "${selectedUser.name || selectedUser.email}" to Admin? They will use their existing email and password to access admin features.`;
      case 'demoteAdmin':
        return `Are you sure you want to demote "${selectedUser.name || selectedUser.email}" from Admin to regular user? They will lose admin access but keep their account.`;
      case 'promoteSuperAdmin':
        return `Are you sure you want to promote "${selectedUser.name || selectedUser.email}" to Super Admin? They will have full control over the system using their existing credentials.`;
      case 'demoteSuperAdmin':
        return `Are you sure you want to demote "${selectedUser.name || selectedUser.email}" from Super Admin to Admin?`;
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isSelf = (userId) => currentUser?._id === userId || currentUser?.sub === userId;

  const isProtectedSuperAdmin = (email) => email === PROTECTED_SUPERADMIN_EMAIL;

  const getPlanIcon = (plan) => {
    switch (plan) {
      case 'gold': return <GoldStar />;
      case 'silver': return <SilverStar />;
      default: return <FaUser className="plan-icon plan-icon--free" />;
    }
  };

  return (
    <div className="admin-superadmin-management">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header__left">
          <h2><FaUserShield /> Super Admin Management</h2>
          <p>Manage admin privileges and promote users to admin or super admin</p>
        </div>
      </div>

      {/* Stats */}
      <div className="superadmin-stats">
        <div className="superadmin-stat-card">
          <div className="superadmin-stat-card__icon superadmin-stat-card__icon--super">
            <FaUserShield />
          </div>
          <div className="superadmin-stat-card__content">
            <span className="superadmin-stat-card__value">
              {admins.filter(a => a.role === 'superadmin').length}
            </span>
            <span className="superadmin-stat-card__label">Super Admins</span>
          </div>
        </div>
        <div className="superadmin-stat-card">
          <div className="superadmin-stat-card__icon superadmin-stat-card__icon--admin">
            <FaCrown />
          </div>
          <div className="superadmin-stat-card__content">
            <span className="superadmin-stat-card__value">
              {admins.filter(a => a.role === 'admin').length}
            </span>
            <span className="superadmin-stat-card__label">Admins</span>
          </div>
        </div>
        <div className="superadmin-stat-card">
          <div className="superadmin-stat-card__icon superadmin-stat-card__icon--users">
            <FaUsers />
          </div>
          <div className="superadmin-stat-card__content">
            <span className="superadmin-stat-card__value">{pagination.total}</span>
            <span className="superadmin-stat-card__label">Regular Users</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="superadmin-tabs">
        <button 
          className={`superadmin-tab ${activeTab === 'admins' ? 'superadmin-tab--active' : ''}`}
          onClick={() => setActiveTab('admins')}
        >
          <FaUserShield /> Current Admins
        </button>
        <button 
          className={`superadmin-tab ${activeTab === 'users' ? 'superadmin-tab--active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <FaUsers /> Promote Users
        </button>
      </div>

      {/* Admins List */}
      {activeTab === 'admins' && (
        <div className="superadmin-section">
          <h3>Current Admins & Super Admins</h3>
          <div className="superadmin-list">
            {admins.length === 0 ? (
              <div className="superadmin-empty">No admins found</div>
            ) : (
              admins.map(admin => (
                <div key={admin._id} className="superadmin-card">
                  <div className="superadmin-card__avatar">
                    {admin.photoURL ? (
                      <img src={admin.photoURL} alt={admin.name} />
                    ) : (
                      <span>{admin.name?.charAt(0) || admin.email?.charAt(0) || 'A'}</span>
                    )}
                    <span className={`superadmin-card__role-badge ${admin.role === 'superadmin' ? 'superadmin-card__role-badge--super' : ''}`}>
                      {admin.role === 'superadmin' ? <FaUserShield /> : <FaCrown />}
                    </span>
                  </div>
                  <div className="superadmin-card__info">
                    <span className="superadmin-card__name">
                      {admin.name || 'Unnamed User'}
                      {isSelf(admin._id) && <span className="superadmin-card__you">(You)</span>}
                    </span>
                    <span className="superadmin-card__email">{admin.email}</span>
                    <span className="superadmin-card__date">Joined: {formatDate(admin.createdAt)}</span>
                  </div>
                  <div className="superadmin-card__role">
                    <span className={`role-tag role-tag--${admin.role}`}>
                      {admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                  <div className="superadmin-card__actions">
                    {admin.role === 'admin' && (
                      <>
                        <button 
                          className="superadmin-action-btn superadmin-action-btn--promote"
                          onClick={() => openConfirmModal(admin, 'promoteSuperAdmin')}
                          title="Promote to Super Admin"
                        >
                          <FaArrowUp /> Super Admin
                        </button>
                        <button 
                          className="superadmin-action-btn superadmin-action-btn--demote"
                          onClick={() => openConfirmModal(admin, 'demoteAdmin')}
                          title="Demote to Regular User"
                        >
                          <FaArrowDown /> Demote
                        </button>
                      </>
                    )}
                    {admin.role === 'superadmin' && !isSelf(admin._id) && !isProtectedSuperAdmin(admin.email) && (
                      <button 
                        className="superadmin-action-btn superadmin-action-btn--demote"
                        onClick={() => openConfirmModal(admin, 'demoteSuperAdmin')}
                        title="Demote to Admin"
                      >
                        <FaArrowDown /> Demote to Admin
                      </button>
                    )}
                    {admin.role === 'superadmin' && (isSelf(admin._id) || isProtectedSuperAdmin(admin.email)) && (
                      <span className="superadmin-card__protected">
                        <FaCheckCircle /> {isProtectedSuperAdmin(admin.email) ? 'Protected Super Admin' : 'You'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Users List for Promotion */}
      {activeTab === 'users' && (
        <div className="superadmin-section">
          <h3>Promote Users to Admin</h3>
          
          {/* Search */}
          <div className="admin-search superadmin-search">
            <FaSearch className="admin-search__icon" />
            <input
              type="text"
              placeholder="Search users by name or email..."
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

          {loading ? (
            <div className="superadmin-loading">Loading users...</div>
          ) : error ? (
            <div className="superadmin-error">{error}</div>
          ) : (
            <>
              <div className="superadmin-list">
                {users.length === 0 ? (
                  <div className="superadmin-empty">No users found</div>
                ) : (
                  users.map(user => (
                    <div key={user._id} className="superadmin-card">
                      <div className="superadmin-card__avatar">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name} />
                        ) : (
                          <span>{user.name?.charAt(0) || user.email?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <div className="superadmin-card__info">
                        <span className="superadmin-card__name">{user.name || 'Unnamed User'}</span>
                        <span className="superadmin-card__email">{user.email}</span>
                        <span className="superadmin-card__date">Joined: {formatDate(user.createdAt)}</span>
                      </div>
                      <div className="superadmin-card__plan">
                        <span className={`plan-tag plan-tag--${user.plan || 'free'}`}>
                          {getPlanIcon(user.plan)}
                          <span>{(user.plan || 'free').charAt(0).toUpperCase() + (user.plan || 'free').slice(1)}</span>
                        </span>
                      </div>
                      <div className="superadmin-card__status">
                        <span className={`status-tag status-tag--${user.status}`}>
                          {user.status === 'active' ? <FaUserCheck /> : <FaUserTimes />}
                          {user.status}
                        </span>
                      </div>
                      <div className="superadmin-card__actions">
                        <button 
                          className="superadmin-action-btn superadmin-action-btn--promote"
                          onClick={() => openConfirmModal(user, 'promoteAdmin')}
                          title="Promote to Admin"
                        >
                          <FaArrowUp /> Make Admin
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="admin-pagination">
                  <button
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    className="admin-pagination__btn"
                  >
                    <FaChevronLeft />
                  </button>
                  <span className="admin-pagination__info">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    disabled={pagination.page === pagination.pages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    className="admin-pagination__btn"
                  >
                    <FaChevronRight />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="superadmin-modal-overlay" onClick={closeConfirmModal}>
          <div className="superadmin-modal" onClick={e => e.stopPropagation()}>
            <div className="superadmin-modal__header">
              <FaExclamationTriangle className="superadmin-modal__icon" />
              <h3>Confirm Action</h3>
            </div>
            <div className="superadmin-modal__body">
              <p>{getConfirmationMessage()}</p>
            </div>
            <div className="superadmin-modal__footer">
              <button 
                className="superadmin-modal__btn superadmin-modal__btn--cancel"
                onClick={closeConfirmModal}
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                className="superadmin-modal__btn superadmin-modal__btn--confirm"
                onClick={executeConfirmAction}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminManagement;
