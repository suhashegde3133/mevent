import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
  FaHome, 
  FaUsers, 
  FaCrown, 
  FaChartLine, 
  FaShieldAlt,
  FaSignOutAlt,
  FaArrowLeft,
  FaUserShield,
  FaBars,
  FaTimes,
  FaCog,
  FaBullhorn,
  FaTools
} from 'react-icons/fa';
import { logout } from '../../redux/slices/authSlice';
import './Admin.scss';

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isSuperAdmin = user?.role === 'superadmin';

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleBackToApp = () => {
    navigate('/dashboard');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const menuItems = [
    { path: '/admin/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { path: '/admin/users', icon: <FaUsers />, label: 'User Management' },
    { path: '/admin/plans', icon: <FaCrown />, label: 'Plan Management' },
    { path: '/admin/plan-settings', icon: <FaCog />, label: 'Plan Settings' },
    { path: '/admin/announcements', icon: <FaBullhorn />, label: 'Announcements' },
    { path: '/admin/maintenance', icon: <FaTools />, label: 'Maintenance' },
    { path: '/admin/analytics', icon: <FaChartLine />, label: 'Analytics' },
    { path: '/admin/security', icon: <FaShieldAlt />, label: 'Security' },
    // Super Admin only menu item
    ...(isSuperAdmin ? [{ path: '/admin/super-admin', icon: <FaUserShield />, label: 'Super Admin' }] : [])
  ];

  return (
    <div className="admin-layout">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="admin-mobile-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__header">
          <div className="admin-logo">
            <FaShieldAlt className="admin-logo__icon" />
            <span className="admin-logo__text">MIVENT Admin</span>
          </div>
          <button 
            className="admin-sidebar__close" 
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `admin-nav-item ${isActive ? 'admin-nav-item--active' : ''}`
              }
            >
              <span className="admin-nav-item__icon">{item.icon}</span>
              <span className="admin-nav-item__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <button className="admin-back-btn" onClick={handleBackToApp}>
            <FaArrowLeft />
            <span>Back to App</span>
          </button>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header__left">
            <button 
              className="admin-menu-toggle" 
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <FaBars />
            </button>
            <h1 className="admin-header__title">{isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}</h1>
          </div>
          <div className="admin-header__right">
            <div className="admin-user-info">
              <div className="admin-user-info__avatar">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.name} />
                ) : (
                  <span>{user?.name?.charAt(0) || 'A'}</span>
                )}
              </div>
              <div className="admin-user-info__details">
                <span className="admin-user-info__name">{user?.name || 'Admin'}</span>
                <span className="admin-user-info__role">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
