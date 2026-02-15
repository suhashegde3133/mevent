import React, { useState, useEffect } from 'react';
import { 
  FaChartLine, 
  FaUsers, 
  FaRupeeSign,
  FaDownload,
  FaCalendarAlt,
  FaPercent,
  FaUser,
  FaArrowUp
} from 'react-icons/fa';
import { GoldStar, SilverStar } from '../../components/PlanCard/PlanCard';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart
} from 'recharts';
import { apiHelper } from '../../utils/api';
import './Admin.scss';

const COLORS = {
  primary: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  gold: '#F59E0B',
  silver: '#9CA3AF',
  free: '#6366F1'
};

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('30');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await apiHelper.get(`/admin/analytics?period=${period}`);
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      setExporting(true);
      const data = await apiHelper.get(`/admin/export?type=${type}`);
      
      // Convert to CSV
      const csvContent = convertToCSV(data.data, type);
      downloadCSV(csvContent, `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      console.error('Error exporting data:', err);
      alert('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const convertToCSV = (data, type) => {
    if (!data || data.length === 0) return '';
    
    if (type === 'users') {
      const headers = ['Name', 'Email', 'Plan', 'Status', 'Role', 'Joined'];
      const rows = data.map(user => [
        user.name || 'N/A',
        user.email,
        user.plan || 'free',
        user.status,
        user.role || 'user',
        new Date(user.createdAt).toLocaleDateString()
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
    
    if (type === 'payments') {
      const headers = ['User', 'Email', 'Amount', 'Plan', 'Date', 'Status'];
      const rows = data.map(payment => [
        payment.userId?.name || 'N/A',
        payment.userId?.email || 'N/A',
        payment.amount,
        payment.plan,
        new Date(payment.createdAt).toLocaleDateString(),
        payment.status
      ]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }
    
    return JSON.stringify(data, null, 2);
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
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

  const formatMonth = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading__spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-error">
        <p>{error}</p>
        <button onClick={fetchAnalytics} className="admin-btn admin-btn--primary">
          Retry
        </button>
      </div>
    );
  }

  // Transform data for charts - normalize plan names to avoid duplicates
  const planDataRaw = analytics?.planDistribution?.map(item => {
    const normalizedPlan = (item._id || 'free').toLowerCase();
    return {
      name: normalizedPlan.charAt(0).toUpperCase() + normalizedPlan.slice(1),
      value: item.count,
      color: COLORS[normalizedPlan] || COLORS.free,
      key: normalizedPlan
    };
  }) || [];
  
  // Merge duplicate plan entries (e.g., 'Free' and 'free')
  const planData = planDataRaw.reduce((acc, item) => {
    const existing = acc.find(p => p.key === item.key);
    if (existing) {
      existing.value += item.value;
    } else {
      acc.push(item);
    }
    return acc;
  }, []);

  const statusData = analytics?.statusDistribution?.map(item => ({
    name: item._id,
    value: item.count,
    color: item._id === 'active' ? COLORS.success : COLORS.danger
  })) || [];

  const userGrowthData = analytics?.userGrowth?.map(item => ({
    date: formatDate(item._id),
    users: item.count
  })) || [];

  const revenueByMonthData = analytics?.revenueByMonth?.map(item => ({
    month: formatMonth(item._id),
    revenue: item.total,
    transactions: item.count
  })) || [];

  const dailyRevenueData = analytics?.dailyRevenue?.map(item => ({
    date: formatDate(item._id),
    revenue: item.total,
    transactions: item.count
  })) || [];

  const revenueByPlanData = analytics?.revenueByPlan?.map(item => {
    const planName = (item._id || 'n/a').toLowerCase();
    return {
      name: planName,
      displayName: planName.charAt(0).toUpperCase() + planName.slice(1),
      revenue: item.total,
      count: item.count,
      color: COLORS[planName] || COLORS.primary
    };
  }) || [];

  return (
    <div className="admin-analytics">
      {/* Header */}
      <div className="admin-page-header">
        <div className="admin-page-header__left">
          <h2>Analytics & Reports</h2>
          <p>Detailed insights into user growth and revenue</p>
        </div>
        <div className="admin-page-header__right">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="admin-select"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="admin-analytics-metrics">
        <div className="admin-metric-card">
          <div className="admin-metric-card__icon admin-metric-card__icon--primary">
            <FaPercent />
          </div>
          <div className="admin-metric-card__content">
            <span className="admin-metric-card__value">{analytics?.conversionRate || 0}%</span>
            <span className="admin-metric-card__label">Conversion Rate</span>
            <span className="admin-metric-card__sub">Free to Paid</span>
          </div>
        </div>
        <div className="admin-metric-card">
          <div className="admin-metric-card__icon admin-metric-card__icon--success">
            <FaRupeeSign />
          </div>
          <div className="admin-metric-card__content">
            <span className="admin-metric-card__value">{formatCurrency(analytics?.arpu || 0)}</span>
            <span className="admin-metric-card__label">ARPU</span>
            <span className="admin-metric-card__sub">Avg Revenue Per User</span>
          </div>
        </div>
        <div className="admin-metric-card">
          <div className="admin-metric-card__icon admin-metric-card__icon--warning admin-metric-card__icon--star">
            <GoldStar />
          </div>
          <div className="admin-metric-card__content">
            <span className="admin-metric-card__value">{analytics?.totalPaidUsers || 0}</span>
            <span className="admin-metric-card__label">Paid Users</span>
            <span className="admin-metric-card__sub">Silver + Gold</span>
          </div>
        </div>
        <div className="admin-metric-card">
          <div className="admin-metric-card__icon admin-metric-card__icon--info">
            <FaUsers />
          </div>
          <div className="admin-metric-card__content">
            <span className="admin-metric-card__value">{analytics?.totalFreeUsers || 0}</span>
            <span className="admin-metric-card__label">Free Users</span>
            <span className="admin-metric-card__sub">Potential Conversions</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="admin-charts-row">
        {/* User Growth */}
        <div className="admin-chart-card admin-chart-card--large">
          <div className="admin-chart-card__header">
            <h3>User Growth Trend</h3>
            <div className="admin-chart-card__legend">
              <span className="admin-legend-item">
                <span className="admin-legend-dot" style={{ background: COLORS.primary }}></span>
                New Users
              </span>
            </div>
          </div>
          <div className="admin-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
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
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorGrowth)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="admin-charts-row">
        {/* Revenue by Month */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>Monthly Revenue</h3>
          </div>
          <div className="admin-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={revenueByMonthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                    return [value, 'Transactions'];
                  }}
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Bar yAxisId="left" dataKey="revenue" fill={COLORS.success} radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="transactions" stroke={COLORS.warning} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan Distribution */}
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

      {/* Charts Row 3 */}
      <div className="admin-charts-row">
        {/* Daily Revenue */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>Daily Revenue</h3>
          </div>
          <div className="admin-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="revenue" fill={COLORS.info} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Status */}
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>User Status</h3>
          </div>
          <div className="admin-chart-card__body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
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

      {/* Revenue by Plan */}
      <div className="admin-revenue-by-plan">
        <div className="admin-chart-card">
          <div className="admin-chart-card__header">
            <h3>Revenue by Plan</h3>
          </div>
          <div className="admin-chart-card__body">
            <div className="admin-revenue-cards">
              {revenueByPlanData.map((item) => (
                <div 
                  key={item.name} 
                  className={`admin-revenue-card admin-revenue-card--${item.name}`}
                >
                  <div className={`admin-revenue-card__icon ${item.name === 'gold' || item.name === 'silver' ? 'admin-revenue-card__icon--star' : ''}`} style={{ color: item.color }}>
                    {item.name === 'gold' ? <GoldStar /> : item.name === 'silver' ? <SilverStar /> : <FaUser />}
                  </div>
                  <div className="admin-revenue-card__content">
                    <span className="admin-revenue-card__plan">{item.displayName}</span>
                    <span className="admin-revenue-card__amount">{formatCurrency(item.revenue)}</span>
                    <span className="admin-revenue-card__count">{item.count} transactions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
