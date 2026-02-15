import React, { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card/Card';
import { STORAGE_KEYS } from '../utils/constants';
import { apiHelper } from '../utils/api';
import { 
  FaStickyNote,
  FaUsers, 
  FaCalendarCheck, 
  FaRupeeSign,
  FaClock,
  FaConciergeBell,
  FaFileInvoiceDollar,
  FaReceipt,
  FaStar,
  FaCheck
} from 'react-icons/fa';
import './Dashboard.scss';
import { formatDateDisplay, formatDateISO } from '../utils/date';
import PlanCard from '../components/PlanCard/PlanCard';

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { profile } = useSelector((state) => state.settings || {});
  const navigate = useNavigate();

  // Determine current plan
  const rawPlan = (profile && (profile.plan || profile.subscription?.tier)) || user?.plan || 'none';
  const planTier = String(rawPlan || 'none').toLowerCase();
  const isGold = planTier.includes('gold');
  const isSilver = planTier.includes('silver');

  // Mock data - Replace with actual data from API
  // Live stats derived from app data
  const projectsState = useSelector((state) => state.projects);

  // State to trigger re-reads from server/database
  const [refreshKey, setRefreshKey] = useState(0);

  // Date range filter for header (week / month / year / all)
  const [dateFilter, setDateFilter] = useState('all');
  
  // State for backend stats
  const [backendStats, setBackendStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  // State for profile name fetched from backend settings
  const [profileName, setProfileName] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // State for events from backend
  const [backendEvents, setBackendEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // State for quotations & billing (used to compute filtered stats)
  const [backendQuotations, setBackendQuotations] = useState([]);
  const [backendBilling, setBackendBilling] = useState([]);

  // Helper: check if name is valid (not empty, not dummy value)
  const isValidName = (name) => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    // Filter out common dummy/test names (case-insensitive)
    const dummyNames = ['user', 'test', 'demo', 'admin', 'guest', 'unknown', 'null', 'undefined', 'name'];
    return !dummyNames.includes(trimmed.toLowerCase());
  };

  // Fetch dashboard stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const data = await apiHelper.get('/dashboard/stats');
        setBackendStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setBackendStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch saved profile (company/user profile) from settings endpoint to obtain real name
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setProfileLoading(true);
        const data = await apiHelper.get('/settings');
        // settings controller returns a settings document which may include `profile`
        const name = data && data.profile && (data.profile.name || data.profile.displayName || data.profile.fullName);
        if (name) setProfileName(name);
      } catch (err) {
        // ignore - we'll fall back to Redux `user` value
        console.error('[Dashboard] Failed to load profile from settings:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setEventsLoading(true);
        const data = await apiHelper.get('/events');
        console.log('[Dashboard] Fetched events from backend:', data);
        setBackendEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching events:', error);
        setBackendEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Fetch quotations + billing once (we'll compute date-filtered stats client-side)
  useEffect(() => {
    const fetchBillingAndQuotations = async () => {
      try {
        const [qRes, bRes] = await Promise.all([
          apiHelper.get('/quotations').catch(() => []),
          apiHelper.get('/billing').catch(() => []),
        ]);
        setBackendQuotations(Array.isArray(qRes) ? qRes : []);
        setBackendBilling(Array.isArray(bRes) ? bRes : []);
      } catch (err) {
        console.error('[Dashboard] Failed to load quotations/billing:', err);
        setBackendQuotations([]);
        setBackendBilling([]);
      }
    };

    fetchBillingAndQuotations();
  }, []);

  // Re-read from server/database when component mounts or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setRefreshKey(prev => prev + 1);
      }
    };

    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Read invoices from database (will be fetched via API)
  const invoices = useMemo(() => {
    // Data fetched from API via other components
    return [];
  }, [refreshKey]);

  // Read clients from database (will be fetched via API)
  const clients = useMemo(() => {
    // Data fetched from API via other components
    return [];
  }, [refreshKey]);

  // Read quotations from database (will be fetched via API)
  const quotations = useMemo(() => {
    // Data fetched from API via other components
    return [];
  }, [refreshKey]);

  // Process events from backend (filter out completed/cancelled)
  const events = useMemo(() => {
    try {
      const all = backendEvents;
      if (!Array.isArray(all)) {
        console.log('[Dashboard] Backend events is not an array');
        return [];
      }

      // Helper: derive an event-level status from top-level status and individual services
      const deriveEventStatus = (ev) => {
        if (!ev) return '';
        const top = String(ev.eventStatus || ev.status || '').toLowerCase();
        if (top === 'completed' || top === 'cancelled' || top === 'canceled') return top;

        const services = Array.isArray(ev.services) ? ev.services : [];
        if (services.length === 0) return top || '';

        // collect normalized statuses from services
        const svcStatuses = services.map(s => String((s && (s.status || s.serviceStatus)) || '').toLowerCase()).filter(Boolean);
        if (svcStatuses.length === 0) return top || '';

        const allCompleted = svcStatuses.every(st => st === 'completed');
        if (allCompleted) return 'completed';

        const allCancelled = svcStatuses.every(st => st === 'cancelled' || st === 'canceled');
        if (allCancelled) return 'cancelled';

        // Mixed or other statuses -> return top if present, else 'scheduled'
        return top || 'scheduled';
      };

      // Exclude events whose derived status is completed/cancelled
      const filtered = all.filter(ev => {
        const derived = deriveEventStatus(ev);
        return derived !== 'completed' && derived !== 'cancelled' && derived !== 'canceled';
      });

      console.log('[Dashboard] Total events from backend:', all.length);
      console.log('[Dashboard] Filtered active events:', filtered.length);
      return filtered;
    } catch (e) {
      console.error('[Dashboard] Error processing events:', e);
      return [];
    }
  }, [backendEvents]);

  // Helper: compute start date for the selected filter
  const rangeStart = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (dateFilter === 'week') {
      start.setDate(start.getDate() - 7);
      return start;
    }
    if (dateFilter === 'month') {
      start.setMonth(start.getMonth() - 1);
      return start;
    }
    if (dateFilter === 'year') {
      start.setFullYear(start.getFullYear() - 1);
      return start;
    }
    // 'all' -> no start limit
    return null;
  }, [dateFilter]);

  // Helper: check if a date (string or Date) is within selected range
  const isInRange = (d, creationDate) => {
    // Priority 1: Use the explicit creation timestamp if available (requested: "created on page/form")
    // Priority 2: Use the provided date
    const dt = creationDate ? new Date(creationDate) : (d instanceof Date ? d : new Date(d));
    if (isNaN(dt.getTime())) return false;
    if (!rangeStart) return true; // 'all'
    
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return dt >= rangeStart && dt <= endOfToday;
  };

  // Filtered lists based on header dateFilter (Strictly by CREATION as requested)
  const filteredEventsForStats = useMemo(() => {
    if (!Array.isArray(backendEvents)) return [];
    return backendEvents.filter((ev) => isInRange(ev.date, ev.createdAt));
  }, [backendEvents, rangeStart]);

  const filteredQuotationsForStats = useMemo(() => {
    if (!Array.isArray(backendQuotations)) return [];
    return backendQuotations.filter(q => isInRange(q.date, q.createdAt));
  }, [backendQuotations, rangeStart]);

  const filteredBillingForStats = useMemo(() => {
    if (!Array.isArray(backendBilling)) return [];
    return backendBilling.filter(b => isInRange(b.date, b.createdAt));
  }, [backendBilling, rangeStart]);

  const stats = useMemo(() => {
    const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    // When 'all' and backendStats is available, use that (fast, server-side totals)
    if (!rangeStart && backendStats) {
      return [
        { title: 'Total Events', value: String(backendStats.totalEvents || 0), icon: <FaCalendarCheck />, color: '#ec4899', subtitle: `${backendStats.totalEvents || 0} created` },
        { title: 'Total Quotations', value: String(backendStats.totalQuotations || 0), icon: <FaFileInvoiceDollar />, color: '#8b5cf6', subtitle: `${backendStats.totalQuotations || 0} created` },
        { title: 'Total Bills', value: String(backendStats.totalBills || 0), icon: <FaReceipt />, color: '#6366f1', subtitle: `${backendStats.totalBills || 0} created` },
        { title: 'Revenue (Paid)', value: inrFormatter.format(backendStats.revenue || 0), icon: <FaRupeeSign />, color: '#10b981', subtitle: `Total paid amount` },
      ];
    }

    // Otherwise compute stats client-side from the filtered lists
    const totalEvents = filteredEventsForStats.length;
    const totalQuotations = filteredQuotationsForStats.length;
    const totalBills = filteredBillingForStats.length;

    // Revenue: total amount paid in billing (requested: "revenue means total amount paid in billing (only mark as paid)")
    // We sum the 'paid' field across the relevant bills.
    const revenue = filteredBillingForStats.reduce((sum, b) => {
      const paid = parseFloat(b.paid || b.amountPaid || 0);
      return sum + (isNaN(paid) ? 0 : paid);
    }, 0);

    return [
      { title: 'Total Events', value: String(totalEvents), icon: <FaCalendarCheck />, color: '#ec4899', subtitle: `${totalEvents} created` },
      { title: 'Total Quotations', value: String(totalQuotations), icon: <FaFileInvoiceDollar />, color: '#8b5cf6', subtitle: `${totalQuotations} created` },
      { title: 'Total Bills', value: String(totalBills), icon: <FaReceipt />, color: '#6366f1', subtitle: `${totalBills} created` },
      { title: 'Revenue (Paid)', value: inrFormatter.format(revenue), icon: <FaRupeeSign />, color: '#10b981', subtitle: `Total paid amount` },
    ];

  }, [backendStats, filteredEventsForStats, filteredQuotationsForStats, filteredBillingForStats, rangeStart]);

  const recentEvents = useMemo(() => {
    console.log('[Dashboard] Computing recentEvents, total events:', events.length);
    try {
      if (!Array.isArray(events)) {
        console.log('[Dashboard] Events is not an array');
        return [];
      }

      if (events.length === 0) {
        console.log('[Dashboard] No events available');
        return [];
      }

      // Helper: parse a YYYY-MM-DD (or ISO) into a Date at local midnight
      const parseDate = (d) => {
        if (!d) return null;
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      // Get earliest service date for an event, fallback to event.date
      const getEarliest = (ev) => {
        const svcDates = (ev.services || [])
          .map(s => s && s.date ? parseDate(s.date) : null)
          .filter(Boolean);
        if (svcDates.length > 0) {
          return svcDates.reduce((a, b) => (a < b ? a : b));
        }
        return parseDate(ev.date) || null;
      };

      const withEarliest = events.map(ev => ({ ev, earliest: getEarliest(ev) }));

      // Today's midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log('[Dashboard] Today:', today);

      // Upcoming events: earliest date >= today, sorted ascending by earliest
      const upcoming = withEarliest
        .filter(i => {
          const hasDate = i.earliest && i.earliest >= today;
          if (i.earliest) {
            console.log(`[Dashboard] Event "${i.ev.clientName || i.ev.name}" date: ${i.earliest}, is upcoming: ${hasDate}`);
          }
          return hasDate;
        })
        .sort((a, b) => a.earliest - b.earliest)
        .map(i => i.ev);

      console.log('[Dashboard] Found upcoming events:', upcoming.length);

      let source = [];
      if (upcoming.length > 0) {
        source = upcoming;
      } else {
        console.log('[Dashboard] No upcoming events, showing recent past events');
        // No upcoming: show past events sorted by latest date (most recent first)
        const past = withEarliest
          .filter(i => i.earliest)
          .sort((a, b) => b.earliest - a.earliest)
          .map(i => i.ev);
        source = past.length > 0 ? past : events;
      }

      const maxItems = typeof window !== 'undefined' && window.innerWidth < 768 ? 2 : 3;
      const result = source.slice(0, maxItems);
      console.log('[Dashboard] Returning events:', result.length);
      return result;
    } catch (e) {
      console.error('[Dashboard] Error computing recentEvents:', e);
      return [];
    }
  }, [events]);

  // Optional: force re-evaluation on resize so recentEvents picks correct slice
  useEffect(() => {
    const handleResize = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Welcome back, {(isValidName(profileName) && profileName) || 'Unknown'}!</h1>
          <p className="dashboard__subtitle">Here's what's happening with your Business today.</p>
        </div>

        <div className="dashboard__filter" role="tablist" aria-label="Date range filter">
          {['week', 'month', 'year', 'all'].map(opt => (
            <button
              key={opt}
              type="button"
              className={`date-filter-btn ${dateFilter === opt ? 'date-filter-btn--active' : ''}`}
              onClick={() => setDateFilter(opt)}
              aria-pressed={dateFilter === opt}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </button>
          ))}
        </div>
      </div>
    
      <div className="dashboard__stats">
        {stats.map((stat, index) => (
          <Card
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            subtitle={stat.subtitle}
          />
        ))}
      </div>

      <div className="dashboard__content">
        <div className="dashboard__section">
          <div className="section-header">
            <h2 className="section-title">Upcoming Events</h2>
            <button className="btn-link" onClick={() => navigate('/events')}>View All</button>
          </div>

          <div className="projects-list">
            {recentEvents.length ? recentEvents.map((ev, idx) => {
              // Show client name as the title
              const clientName = ev.clientName || ev.title || ev.name || 'Untitled Event';

              // Collect all dates: prefer service dates (only from services that are not completed/cancelled), otherwise use top-level date
              const dates = (() => {
                // Build an array of { name, dateObj, rawDate } for services that are active,
                // then sort them by date so the dashboard matches the event table ordering.
                if (Array.isArray(ev.services) && ev.services.length > 0) {
                  const svcPairs = ev.services
                    .filter(s => {
                      const sStatus = String((s && (s.status || s.serviceStatus)) || '').toLowerCase();
                      return s && s.date && sStatus !== 'completed' && sStatus !== 'cancelled' && sStatus !== 'canceled';
                    })
                    .map(s => ({ name: s.name, rawDate: s.date, dateObj: (() => { const d = new Date(s.date); return isNaN(d.getTime()) ? null : d; })() }))
                    .filter(p => p.dateObj !== null)
                    .sort((a, b) => a.dateObj - b.dateObj);

                  if (svcPairs.length > 0) return Array.from(new Set(svcPairs.map(p => p.rawDate)));
                }

                // Fallback to top-level date if no service dates available
                return ev.date ? [ev.date] : [];
              })();

              // Format dates to a single string; do NOT include times
              const dateDisplay = (() => {
                if (!dates || dates.length === 0) return 'Date TBA';
                return dates.map(d => formatDateDisplay(d)).join(' / ');
              })();

              // Build services names (comma-separated) to show under client name
              const servicesDisplay = (() => {
                if (!Array.isArray(ev.services) || ev.services.length === 0) return '';

                // Create pairs of service name + parsed date, sort by date and join names
                const svcPairs = ev.services
                  .filter(s => {
                    const sStatus = String((s && (s.status || s.serviceStatus)) || '').toLowerCase();
                    return s && s.name && s.date && sStatus !== 'completed' && sStatus !== 'cancelled' && sStatus !== 'canceled';
                  })
                  .map(s => ({ name: s.name, dateObj: (() => { const d = new Date(s.date); return isNaN(d.getTime()) ? null : d; })() }))
                  .filter(p => p.dateObj !== null)
                  .sort((a, b) => a.dateObj - b.dateObj)
                  .map(p => p.name);

                return svcPairs.join(' - ');
              })();

              return (
                <div
                  key={idx}
                  className="project-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (ev && ev.id) {
                      navigate('/events', { state: { openViewId: ev.id } });
                    } else {
                      navigate('/events');
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      if (ev && ev.id) {
                        navigate('/events', { state: { openViewId: ev.id } });
                      } else {
                        navigate('/events');
                      }
                    }
                  }}
                >
                  <div className="project-item__info">
                    <h3 className="project-item__name">{clientName}</h3>
                    {servicesDisplay && (
                      <p className="project-item__services">{servicesDisplay}</p>
                    )}
                    <p className="project-item__deadline">
                      <FaClock /> {dateDisplay}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="project-item">
                <div className="project-item__info">
                  <h3 className="project-item__name">No upcoming events</h3>
                  <p className="project-item__deadline">Add events from the Events page</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard__section">
          <div className="section-header">
            <h2 className="section-title">Quick Actions</h2>
          </div>
          
          <div className="quick-actions">
            <ActionButtons />
          </div>
        </div>
      </div>

      <div className="dashboard__plans">
        <div className="plan-modal__options">
          <PlanCard tier="Silver" isCurrentPlan={isSilver} />

          <PlanCard tier="Gold" highlighted isCurrentPlan={isGold} />
        </div>
      </div>
    </div>
  );
};

// Small component placed here to keep Dashboard file self-contained
const ActionButtons = () => {
  const navigate = useNavigate();

  const openQuotationNew = () => navigate('/quotations', { state: { openCreate: true } });
  const openEventNew = () => navigate('/events', { state: { openCreate: true } });
  const openBilling = () => navigate('/billing', { state: { openCreate: true } });
  const openTeam = () => navigate('/team', { state: { openAdd: true } });
  const openNotes = () => navigate('/notes', { state: { openAdd: true } });
  const openServiceAdd = () => navigate('/services', { state: { openAdd: true } });

  return (
    <>
      <button className="action-btn" onClick={openQuotationNew} aria-label="New Quotation">
        <FaFileInvoiceDollar />
        <span>Quotation</span>
      </button>

      <button className="action-btn" onClick={openEventNew} aria-label="New Event">
        <FaCalendarCheck />
        <span>Event</span>
      </button>

      <button className="action-btn" onClick={openBilling} aria-label="Open Billing">
        <FaReceipt />
        <span>Billing</span>
      </button>

      <button className="action-btn" onClick={openTeam} aria-label="Team">
        <FaUsers />
        <span>Team</span>
      </button>

      <button className="action-btn" onClick={openNotes} aria-label="Notes">
        <FaStickyNote />
        <span>Notes</span>
      </button>

      <button className="action-btn" onClick={openServiceAdd} aria-label="Add Service">
        <FaConciergeBell />
        <span>Service</span>
      </button>
    </>
  );
};



export default Dashboard;
