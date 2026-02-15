import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaUserCheck, 
  FaUserTimes, 
  FaRupeeSign,
  FaUserPlus,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { GoldStar, SilverStar } from '../../components/PlanCard/PlanCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { apiHelper } from '../../utils/api';
import './Admin.scss';

const PLAN_COLORS = {
  gold: '#F59E0B',
  silver: '#9CA3AF',
  free: '#6366F1',
  none: '#6366F1'
};

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await apiHelper.get('/admin/metrics');
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard metrics');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button onClick={fetchMetrics} className="admin-btn admin-btn--primary">
          Retry
        </button>
      </div>
    );
  }

  const planData = [
    { name: 'Gold', value: metrics?.goldUsers || 0, color: PLAN_COLORS.gold },
    { name: 'Silver', value: metrics?.silverUsers || 0, color: PLAN_COLORS.silver },
    { name: 'Free', value: metrics?.freeUsers || 0, color: PLAN_COLORS.free },
  ];

  const growthData = metrics?.growthTrend?.map(item => ({
    date: formatDate(item._id),
    users: item.count
  })) || [];

  return (
    <div className="admin-dashboard">
      {/* Stats Cards */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card admin-stat-card--primary">
          <div className="admin-stat-card__icon">
            <FaUsers />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__value">{metrics?.totalUsers || 0}</span>
            <span className="admin-stat-card__label">Total Users</span>
          </div>
          <div className="admin-stat-card__trend admin-stat-card__trend--up">
            <FaArrowUp />
            <span>+{metrics?.newUsersThisWeek || 0} this week</span>
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card--success">
          <div className="admin-stat-card__icon">
            <FaUserCheck />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__value">{metrics?.activeUsers || 0}</span>
            <span className="admin-stat-card__label">Active Users</span>
          </div>
          <div className="admin-stat-card__percentage">
            {metrics?.totalUsers ? ((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card--warning">
          <div className="admin-stat-card__icon">
            <FaUserTimes />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__value">{metrics?.inactiveUsers || 0}</span>
            <span className="admin-stat-card__label">Inactive Users</span>
          </div>
          <div className="admin-stat-card__percentage">
            {metrics?.totalUsers ? ((metrics.inactiveUsers / metrics.totalUsers) * 100).toFixed(1) : 0}%
          </div>
        </div>

        <div className="admin-stat-card admin-stat-card--info">
          <div className="admin-stat-card__icon">
            <FaRupeeSign />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__value">{formatCurrency(metrics?.totalRevenue || 0)}</span>
            <span className="admin-stat-card__label">Total Revenue</span>
          </div>
          <div className="admin-stat-card__sub">
            {formatCurrency(metrics?.monthlyRevenue || 0)} this month
          </div>
        </div>
      </div>

      {/* Plan Distribution Cards */}
      <div className="admin-plan-cards">
        <div className="admin-plan-card admin-plan-card--gold">
          <div className="admin-plan-card__icon admin-plan-card__icon--star">
            <GoldStar />
          </div>
          <div className="admin-plan-card__info">
            <span className="admin-plan-card__count">{metrics?.goldUsers || 0}</span>
            <span className="admin-plan-card__label">Gold Users</span>
          </div>
        </div>
        <div className="admin-plan-card admin-plan-card--silver">
          <div className="admin-plan-card__icon admin-plan-card__icon--star">
            <SilverStar />
          </div>
          <div className="admin-plan-card__info">
            <span className="admin-plan-card__count">{metrics?.silverUsers || 0}</span>
            <span className="admin-plan-card__label">Silver Users</span>
          </div>
        </div>
        <div className="admin-plan-card admin-plan-card--free">
          <FaUserPlus className="admin-plan-card__icon" />
          <div className="admin-plan-card__info">
            <span className="admin-plan-card__count">{metrics?.freeUsers || 0}</span>
            <span className="admin-plan-card__label">Free Users</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="admin-charts-row">
        {/* User Growth Chart */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>User Growth (Last 30 Days)</h3>
          </div>
          <div className="admin-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution Chart */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>Plan Distribution</h3>
          </div>
          <div className="admin-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {planData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity Row */}
      <div className="admin-activity-row">
        {/* Recent Signups */}
        <div className="admin-activity-card">
          <div className="admin-activity-card__header">
            <h3>Recent Signups</h3>
            <span className="admin-activity-card__badge">{metrics?.recentSignups?.length || 0}</span>
          </div>
          <div className="admin-activity-card__body">
            {metrics?.recentSignups?.length > 0 ? (
              <ul className="admin-activity-list">
                {metrics.recentSignups.map((user) => (
                  <li key={user._id} className="admin-activity-item">
                    <div className="admin-activity-item__avatar">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} />
                      ) : (
                        <span>{user.name?.charAt(0) || user.email?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="admin-activity-item__info">
                      <span className="admin-activity-item__name">{user.name || 'New User'}</span>
                      <span className="admin-activity-item__email">{user.email}</span>
                    </div>
                    <div className="admin-activity-item__meta">
                      <span className={`admin-badge admin-badge--${user.plan || 'free'}`}>
                        {user.plan || 'free'}
                      </span>
                      <span className="admin-activity-item__date">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty">No recent signups</p>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="admin-activity-card">
          <div className="admin-activity-card__header">
            <h3>Recent Payments</h3>
            <span className="admin-activity-card__badge admin-activity-card__badge--success">
              {metrics?.recentPayments?.length || 0}
            </span>
          </div>
          <div className="admin-activity-card__body">
            {metrics?.recentPayments?.length > 0 ? (
              <ul className="admin-activity-list">
                {metrics.recentPayments.map((payment) => (
                  <li key={payment._id} className="admin-activity-item">
                    <div className="admin-activity-item__avatar admin-activity-item__avatar--success">
                      <FaRupeeSign />
                    </div>
                    <div className="admin-activity-item__info">
                      <span className="admin-activity-item__name">
                        {payment.userId?.name || 'User'}
                      </span>
                      <span className="admin-activity-item__email">
                        {payment.userId?.email || payment.orderId}
                      </span>
                    </div>
                    <div className="admin-activity-item__meta">
                      <span className="admin-activity-item__amount">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className={`admin-badge admin-badge--${payment.plan}`}>
                        {payment.plan}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty">No recent payments</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
