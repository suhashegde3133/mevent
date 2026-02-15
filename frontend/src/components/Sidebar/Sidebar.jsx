import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FaHome, 
  FaProjectDiagram, 
  FaCalendarCheck,
  FaUsers, 
  FaComments,
  FaFileInvoiceDollar,
  FaShieldAlt,
  FaConciergeBell,
  FaReceipt,
  FaSignOutAlt,
  FaUserCog,
  FaCrown,
  FaStickyNote
} from 'react-icons/fa';
import { logout } from '../../redux/slices/authSlice';
import { setSidebarOpen } from '../../redux/slices/uiSlice';
import useTrialStatus from '../../hooks/useTrialStatus';
import PlanUpgradeModal from '../PlanUpgradeModal/PlanUpgradeModal';
import './Sidebar.scss';

const Sidebar = () => {
  const { sidebarOpen, chatUnreadCount } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const sidebarRef = useRef(null);
  const trialStatus = useTrialStatus();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState('');
  
  const isAdmin = user?.role === 'admin';
  
  // Check if user has Gold plan - default to false if trialStatus not ready
  const isGoldPlan = trialStatus?.isGoldPlan === true;

  // Define menu items with gold-only flag
  const menuItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Dashboard', goldOnly: false },
    { path: '/quotations', icon: <FaFileInvoiceDollar />, label: 'Quotations', goldOnly: true },
    { path: '/events', icon: <FaCalendarCheck />, label: 'Events', goldOnly: false },
    { path: '/billing', icon: <FaReceipt />, label: 'Billing', goldOnly: true },
    { path: '/notes', icon: <FaStickyNote />, label: 'Notes', goldOnly: false },
    { path: '/team', icon: <FaUsers />, label: 'Team', goldOnly: false },
    { path: '/projects', icon: <FaProjectDiagram />, label: 'Projects', goldOnly: false },
    { path: '/chat', icon: <FaComments />, label: 'Chat', goldOnly: false },
    { path: '/policy', icon: <FaShieldAlt />, label: 'Policy', goldOnly: true },
    { path: '/services', icon: <FaConciergeBell />, label: 'Services', goldOnly: false },
  ];
  
  // Add admin panel link for admin users
  if (isAdmin) {
    menuItems.push({ path: '/admin', icon: <FaUserCog />, label: 'Admin Panel', goldOnly: false });
  }

  // Handle clicking on restricted items
  const handleRestrictedClick = (e, item) => {
    if (item.goldOnly && !isGoldPlan) {
      e.preventDefault();
      setUpgradeFeatureName(item.label);
      setShowUpgradeModal(true);
    } else {
      dispatch(setSidebarOpen(false));
    }
  };

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!sidebarRef.current) return;
      if (sidebarRef.current.contains(e.target)) return;
      if (e.target.closest('.navbar__menu-btn')) return;
      if (sidebarOpen) {
        dispatch(setSidebarOpen(false));
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dispatch, sidebarOpen]);

  return (
    <>
      <aside ref={sidebarRef} className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
        <nav className="sidebar__nav">
          {menuItems.map((item) => {
            const isRestricted = item.goldOnly && !isGoldPlan;
            
            return (
              <NavLink
                key={item.path}
                to={isRestricted ? '#' : item.path}
                onClick={(e) => handleRestrictedClick(e, item)}
                className={({ isActive }) => 
                  `sidebar__item ${isActive && !isRestricted ? 'sidebar__item--active' : ''} ${isRestricted ? 'sidebar__item--restricted' : ''}`
                }
                title={isRestricted ? `${item.label} requires Gold plan` : item.label}
              >
                <span className="sidebar__icon">{item.icon}</span>
                {sidebarOpen && (
                  <>
                    <span className="sidebar__label">{item.label}</span>
                    {isRestricted && <FaCrown className="sidebar__gold-badge" title="Gold Plan Required" />}
                    {item.path === '/chat' && chatUnreadCount > 0 && (
                      <span className="sidebar__chat-badge">{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>
                    )}
                  </>
                )}
                {!sidebarOpen && item.path === '/chat' && chatUnreadCount > 0 && (
                  <span className="sidebar__chat-badge sidebar__chat-badge--collapsed">{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer with logout */}
        <div className="sidebar__footer">
          <LogoutButton sidebarOpen={sidebarOpen} />
        </div>
      </aside>

      {/* Plan Upgrade Modal */}
      <PlanUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName={upgradeFeatureName}
        currentPlan={trialStatus?.planTier || 'free'}
      />
    </>
  );
};

const LogoutButton = ({ sidebarOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      // Clear app session (backend/JWT flow). Keep this simple and robust.
      dispatch(logout());
      // ensure sidebar is closed after logout
      dispatch(setSidebarOpen(false));
      navigate('/login');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      className="sidebar__item sidebar__logout"
      onClick={handleLogout}
      type="button"
      disabled={isSigningOut}
    >
      {sidebarOpen ? (
        <>
          <span className="sidebar__icon"> <FaSignOutAlt /> </span>
          <span className="sidebar__label">Logout</span>
        </>
      ) : (
        <span className="sidebar__icon"> <FaSignOutAlt /> </span>
      )}
    </button>
  );
};

export default Sidebar;
