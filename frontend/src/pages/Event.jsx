import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import {
  FaConciergeBell,
  FaCalendarCheck,
  FaCalendarAlt,
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaMapMarkerAlt,
  FaFilter,
  FaSquare,
  FaPlay,
  FaClock,
  FaCheckCircle,
  FaTimes,
  FaShareSquare,
  FaThLarge,
  FaCheck,
  FaSearch,
  FaColumns,
  FaCheckSquare,
  FaList,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaCamera,
  FaUser,
  FaWhatsapp,
  FaEnvelope,
  FaChevronDown,
  FaAngleDoubleLeft,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleRight,
} from 'react-icons/fa';
import { FaShareSquare as FaShareSquareIcon } from 'react-icons/fa';
import Modal from '../components/Modal/Modal';
import './Event.scss';
import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import useConfirm from '../hooks/useConfirm';
import { API_BASE_URL } from '../utils/constants';
import session from '../utils/session';
import { STORAGE_KEYS } from '../utils/constants';
import { addNotification } from '../redux/slices/uiSlice';
import { formatDateDisplay, formatDateISO, formatDateFile, formatDateTimeDisplay } from '../utils/date';
import Highlight from '../utils/Highlight';
import ServiceTypeInput from '../components/ServiceTypeInput/ServiceTypeInput';

// Temporary draft storage key (session-only)
const DRAFT_KEY = 'photoflow_event_draft';

// Simple client field helpers
const sanitizePhone = (v) => (v || '').toString().replace(/\D/g, '');
const isValidPhone = (v) => { const s = sanitizePhone(v); return s.length >= 7 && s.length <= 15; };
const isValidName = (v) => typeof v === 'string' && v.trim().length > 0 && /^[A-Za-z '\-\.()]{1,100}$/.test(v.trim());
const isValidEmail = (v) => { if (!v) return true; return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };

const Event = () => {
  // Initialize with empty array - data will be loaded from server only
  const [events, setEvents] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('scheduled');
  // New filters: order type and date range
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all' | 'own' | 'suborder'
  const [dateFrom, setDateFrom] = useState(''); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState(''); // YYYY-MM-DD
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'client'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  // Default to grid view on mobile devices (width < 768px)
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'grid';
    }
    return 'table';
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    quotationNo: true,
    date: true,
    services: true,
    team: true,
    location: true,
    status: true,
    orderType: true,
  });
  // Refs for column menu and toggle button to detect outside clicks
  const eventMenuRef = useRef(null);
  const eventBtnRef = useRef(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    quotationId: '',
    quotationRef: '', // Reference to the selected quotation (if any)
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventStatus: 'scheduled',
    // New order fields
    orderType: 'own', // 'own' or 'suborder'
    // store team as an array of member names
    team: [],
        services: [
        {
          name: '',
          date: '',
          time: '',
          location: '',
          status: 'scheduled',
          notes: '',
          // UI-only flags: unified flag to indicate date/time/location same as previous
          sameAsDateAbove: false,
          sameAsTimeAbove: false,
          sameAsLocationAbove: false,
          sameAsAbove: false
        }
      ],
    notes: ''
  });
  const confirm = useConfirm();

  // Close column menu when clicking outside (but ignore clicks on the toggle button)
  useEffect(() => {
    function handleOutsideClick(e) {
      if (!showColumnMenu) return;
      const target = e.target;
      if (eventMenuRef.current && eventMenuRef.current.contains(target)) return;
      if (eventBtnRef.current && eventBtnRef.current.contains(target)) return;
      setShowColumnMenu(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColumnMenu]);

  // Service options: prefer persisted SERVICES, fall back to empty list
  const [serviceOptions, setServiceOptions] = useState(() => {
    try {
      const persisted = storage.getJSON(STORAGE_KEYS.SERVICES, null);
      if (Array.isArray(persisted) && persisted.length > 0) {
        return persisted.map(s => s.name).filter(Boolean);
      }
    } catch (e) {}
    return [];
  });

  // Available services as objects (id, name, price) - prefer persisted SERVICES like Quotations/Billing
  const [availableServices, setAvailableServices] = useState(() => {
    try {
      const persisted = storage.getJSON(STORAGE_KEYS.SERVICES, null);
      if (Array.isArray(persisted) && persisted.length > 0) {
        return persisted.map(s => ({ id: s.id, name: s.name, price: Number(s.basePrice) || Number(s.price) || 0 }));
      }
    } catch (e) {}
    return [];
  });

  // Try to refresh services from server when available and keep serviceOptions in sync
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remote = await storage.syncFromServer(STORAGE_KEYS.SERVICES);
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          const mapped = remote.map(s => ({ id: s.id, name: s.name, price: Number(s.basePrice) || Number(s.price) || 0 }));
          setAvailableServices(mapped);
          // keep the simple name list in serviceOptions for compatibility with existing code paths
          setServiceOptions(mapped.map(s => s.name));
        }
      } catch (e) {
        // ignore - keep persisted or fallback options
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Save a new service to the backend when user types a custom service name
  const handleNewService = async (serviceName) => {
    if (!serviceName || !serviceName.trim()) return;
    
    const trimmedName = serviceName.trim();
    
    // Check if service already exists (case-insensitive)
    const exists = availableServices.some(s => 
      (s.name || '').toLowerCase() === trimmedName.toLowerCase()
    );
    if (exists) return;

    const newService = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: trimmedName,
      category: 'Uncategorized',
      description: '',
      basePrice: 0,
      deliverables: [],
      features: [],
    };

    // Optimistically add to local state
    setAvailableServices(prev => [...prev, { id: newService.id, name: newService.name, price: 0 }]);
    setServiceOptions(prev => [...prev, newService.name]);

    try {
      const token = session.getToken();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newService),
      });

      if (res.ok) {
        const created = await res.json();
        // Update with server-assigned ID
        setAvailableServices(prev => prev.map(s => 
          s.id === newService.id ? { id: created._id || created.id, name: created.name, price: Number(created.basePrice) || 0 } : s
        ));
      }
    } catch (e) {
      console.error('Failed to save new service:', e);
    }
  };

  // Listen for notification events while on /events so clicking notifications
  // will open the requested event view even if the user is already on Events.
  useEffect(() => {
    const handler = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : null;
        if (!detail || detail.path !== '/events') return;
        const state = detail.state || {};
        if (state.openCreate) {
          handleCreateEvent();
        }
        if (state.openViewId) {
          const idToOpen = state.openViewId;
          const e = events.find(x => String(x.id) === String(idToOpen));
          if (e) {
            handleViewEvent(e);
          } else {
            pendingOpenRef.current = idToOpen;
          }
        }
      } catch (e) {}
    };
    window.addEventListener('ui:notification', handler);
    return () => window.removeEventListener('ui:notification', handler);
  }, [events]);

  // Team members (names) sourced from persisted TEAM storage
  const [teamMembers, setTeamMembers] = useState(() => {
    try {
      const persisted = storage.getJSON(STORAGE_KEYS.TEAM, []);
      if (Array.isArray(persisted) && persisted.length > 0) {
        return persisted.map(m => m.name).filter(Boolean);
      }
    } catch (e) {}
    return [];
  });

  // Try to fetch team members from the server when authenticated. The
  // storage.getJSON helper is a no-op in some builds (server-only storage),
  // so we explicitly call syncFromServer to ensure team list is loaded.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remote = await storage.syncFromServer(STORAGE_KEYS.TEAM);
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          setTeamMembers(remote.map(m => (m && (m.name || m.fullName || m.displayName)) || '').filter(Boolean));
        }
      } catch (e) {
        // ignore network/auth errors - keep any persisted list
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Draft helpers: store temporary form draft in component state only
  const makeDraftKey = (id) => (id ? `${DRAFT_KEY}_${String(id)}` : DRAFT_KEY);

  const saveDraftToSession = (key) => {
    const data = { formData };
    sessionStorage.setItem(key, JSON.stringify(data));
  };

  const loadDraftFromSession = (key) => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  const removeDraftFromSession = (key) => {
    sessionStorage.removeItem(key);
  };

  // Auto-save draft when form data changes and modal is open
  useEffect(() => {
    if (showCreateModal && formData) {
      // Check if form has any data (not empty)
      const hasData = formData.clientName || formData.clientEmail || formData.clientPhone ||
                      formData.quotationId || formData.services.some(service => service.name || service.date || service.location) ||
                      formData.notes;
      if (hasData) {
        saveDraftToSession(DRAFT_KEY);
      }
    }
  }, [formData, showCreateModal]);

  // Available quotations loaded from server (database)
  const [quotations, setQuotations] = useState([]);

  // Local UI state for searchable quotation dropdown (event form)
  const [quotationQuery, setQuotationQuery] = useState('');
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  const [highlightedQuotationIndex, setHighlightedQuotationIndex] = useState(-1);
  const quotationBlurTimeoutRef = useRef(null);
  const quotationInputRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Try to fetch from server
        try {
          const remote = await storage.syncFromServer(STORAGE_KEYS.QUOTATIONS);
          if (Array.isArray(remote) && mounted) setQuotations(remote);
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore top-level errors
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Try to load events from server when authenticated. Falls back to local storage.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remote = await storage.syncFromServer(STORAGE_KEYS.EVENTS);
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          // Deduplicate and normalize like the initial state logic
          const seen = new Set();
          const deduped = [];
          for (const ev of remote) {
            if (!ev || !ev.id) continue;
            if (!seen.has(ev.id)) {
              seen.add(ev.id);
              deduped.push(ev);
            }
          }
          setEvents(deduped);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSelectQuotation = (quotationId) => {
    if (!quotationId) {
      setFormData((fd) => ({ ...fd, quotationRef: '' }));
      return;
    }

  const q = quotations.find(x => String(x.id) === String(quotationId));
    setFormData((fd) => {
      // Build services from quotation services (array of names -> service objects)
      const mappedServices = Array.isArray(q?.services) && q.services.length > 0
        ? q.services.map(name => ({
            name,
            date: '',
            time: '',
            location: '',
            status: 'scheduled',
            notes: '',
            sameAsDateAbove: false,
            sameAsTimeAbove: false,
            sameAsLocationAbove: false,
            sameAsAbove: false,
            typeEditable: true
          }))
        : [];

      const hasMeaningfulServices = Array.isArray(fd.services) && fd.services.some(s => s && s.name);

      return {
        ...fd,
  quotationRef: String(quotationId), // Store the selected quotation reference
        // Prefill client details if empty
        clientName: fd.clientName || (q && q.clientName) || fd.clientName,
        clientEmail: fd.clientEmail || (q && q.clientEmail) || fd.clientEmail,
        clientPhone: fd.clientPhone || (q && q.clientPhone) || fd.clientPhone,
        // If the form has no meaningful services, replace with mapped services from the quotation
        services: !hasMeaningfulServices && mappedServices.length > 0 ? mappedServices : fd.services
      };
    });
  };

  const dispatch = useDispatch();

  // Get company details and notifications from Redux settings
  const { company, notifications } = useSelector((state) => state.settings);

  const getDefaultFormData = () => ({
    quotationId: `EVT-2025-${String(events.length + 1).padStart(3, '0')}`,
    quotationRef: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    eventStatus: 'scheduled',
    orderType: 'own',
    team: [],
    services: [
      {
        name: '',
        date: '',
        time: '',
        location: '',
        status: 'scheduled',
        notes: '',
        sameAsDateAbove: false,
        sameAsTimeAbove: false,
        sameAsLocationAbove: false,
        typeEditable: false
      }
    ],
    notes: ''
  });

  const handleCreateEvent = () => {
    const defaultData = getDefaultFormData();

    // If there's a saved draft, load that draft into the form instead of the blank form
    const draft = loadDraftFromSession(makeDraftKey());
    if (draft && typeof draft === 'object' && draft.formData) {
      setFormData({ ...defaultData, ...draft.formData });
    } else {
      setFormData(defaultData);
    }
    setShowCreateModal(true);
  };

  // Reset the create form to its initial values (does not close the modal)
  const resetCreateForm = () => {
    setFormData(getDefaultFormData());
    try { removeDraftFromSession(makeDraftKey()); } catch (e) {}
  };

  const handleViewEvent = (event) => {
    // Ensure orderType is present (fallback to 'own') so view/edit show correct value
    const withOrderType = { ...event, orderType: event.orderType || 'own' };
    setSelectedEvent(withOrderType);
    setFormData({
      quotationId: withOrderType.id,
      quotationRef: withOrderType.quotationRef || '', // Load quotation reference
      clientName: withOrderType.clientName,
      clientEmail: withOrderType.clientEmail,
      clientPhone: withOrderType.clientPhone,
      eventStatus: withOrderType.status,
      orderType: withOrderType.orderType,
      team: Array.isArray(withOrderType.team) ? [...withOrderType.team] : [],
        services: (withOrderType.services || []).map(s => ({
        ...s,
        sameAsDateAbove: false,
        sameAsTimeAbove: false,
        sameAsLocationAbove: false,
        sameAsAbove: false,
        typeEditable: true
      })),
      notes: withOrderType.notes
    });
    setIsEditMode(false);
    setShowViewModal(true);
  };

  const handleEnableEdit = () => {
    // If there's a draft for this event, load it into the form; otherwise keep current formData
    try {
      const draft = loadDraftFromSession(makeDraftKey(selectedEvent && selectedEvent.id));
      if (draft && typeof draft === 'object') setFormData(draft);
    } catch (e) {}
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    // Reset form data to original event data
    if (selectedEvent) {
      setFormData({
        quotationId: selectedEvent.id,
        quotationRef: selectedEvent.quotationRef || '',
        clientName: selectedEvent.clientName,
        clientEmail: selectedEvent.clientEmail,
        clientPhone: selectedEvent.clientPhone,
        team: Array.isArray(selectedEvent.team) ? [...selectedEvent.team] : [],
        services: selectedEvent.services.map(s => ({ ...s })),
        notes: selectedEvent.notes
      });
    }
    setIsEditMode(false);
  };

  const handleDeleteEvent = async (id) => {
    const ok = await confirm('Are you sure you want to delete this event?');
    if (!ok) return;
    try {
      const token = session.getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/events/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('event delete failed', e);
    }

    const next = events.filter(e => e.id !== id);
    setEvents(next);
    try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, next); } catch (e) {}

    // If the deleted event is currently open in the view modal, close it
    if (selectedEvent && selectedEvent.id === id) {
      setShowViewModal(false);
      setSelectedEvent(null);
      setIsEditMode(false);
    }
  };

  const handleUpdateStatus = (id, newStatus) => {
    const next = events.map(e => (e.id === id ? { ...e, status: newStatus } : e));
    setEvents(next);
  try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, next); } catch (e) {}
  };

  const handleWhatsApp = (event) => {
    const message = `Hi ${event.clientName}, regarding your event: \n${event.services.map(s => s.name).join(', ')}\n\n\nPlease contact us if you have any questions.\n\nRegards,\n\n${company.name || 'Company Name'}\n${company.phone ? `Phone: ${company.phone}\n` : ''}${company.email ? `Email: ${company.email}\n` : ''}${company.address ? `Address: ${company.address}` : ''}`;
    const whatsappUrl = `https://wa.me/${event.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEmail = (event) => {
    try {
      const to = (event.clientEmail || '').trim();
      if (!to) {
        showToast('No email address available for this client.');
        return;
      }
      const subject = `${event.clientName} - Your Event Update`;
      const servicesList = event.services.map(s => s.name).join(', ');
      const firstDate = event.services.length > 0 ? event.services[0].date : 'TBD';
      const body = `Hello ${event.clientName || ''},\n\nRegarding your event scheduled for\n${servicesList} ${firstDate}\n\n\nPlease contact us if you have any questions.\n\nRegards,\n\n${company.name || 'Company Name'}\n${company.phone ? `Phone: ${company.phone}\n` : ''}${company.email ? `Email: ${company.email}\n` : ''}${company.address ? `Address: ${company.address}` : ''}`;
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      // Use location.href to open default mail client
      window.location.href = mailto;
    } catch (e) {
      console.error('send email error', e);
      try { window.open('mailto:', '_self'); } catch (err) {}
    }
  };

  const handleUpdateServiceStatus = (eventId, serviceId, newStatus) => {
    const next = events.map(e => {
      if (e.id === eventId) {
        const updatedServices = e.services.map(s =>
          s.id === serviceId ? { ...s, status: newStatus } : s
        );
        // Update event status based on services using derived rules
        const eventStatus = deriveEventStatusFromServices(updatedServices);
        return { ...e, services: updatedServices, status: eventStatus };
      }
      return e;
    });
    setEvents(next);
  try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, next); } catch (e) {}
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [
        ...formData.services,
        {
          name: '',
          date: '',
          time: '',
          location: '',
          status: 'scheduled',
          notes: '',
          typeEditable: false
        }
      ]
    });
  };

  const removeService = (index) => {
    if (formData.services.length > 1) {
      setFormData({
        ...formData,
        services: formData.services.filter((_, i) => i !== index)
      });
    }
  };

  // `forceEditable` controls whether the name field should be shown as a free-text input
  // - true: force free-text input (datalist) mode
  // - false: force select mode
  // - undefined: don't change the existing `typeEditable` flag
  const updateService = (index, field, value, forceEditable) => {
    const newServices = [...formData.services];
    newServices[index][field] = value;
    // Only change typeEditable when caller explicitly requests it. This prevents
    // switching from <select> -> free-text immediately after selecting a value,
    // which made it hard to re-open the select to change the selection.
    if (field === 'name' && forceEditable !== undefined) {
      newServices[index].typeEditable = !!forceEditable;
    }
    // If user manually edits a field that was previously marked as 'same as above', clear that flag
    if (index > 0) {
      // Clear the unified sameAsAbove flag when the user edits date/time/location manually
      if ((field === 'date' || field === 'time' || field === 'location') && newServices[index].sameAsAbove) newServices[index].sameAsAbove = false;
    }
    setFormData({ ...formData, services: newServices });
  };

  // Copy date/time/location from previous service into the given service index
  const copyServiceFromPrevious = (index, fields = ['date','time','location']) => {
    if (index <= 0) return;
    const prev = formData.services[index - 1] || {};
    const newServices = [...formData.services];
    fields.forEach(f => {
      if (prev[f] !== undefined) newServices[index][f] = prev[f];
    });
    // Mark unified flag when copying
    newServices[index].sameAsAbove = true;
    setFormData({ ...formData, services: newServices });
  };

  const toggleSameAsAbove = (index, checked) => {
    if (index <= 0) return;
    const newServices = [...formData.services];
    newServices[index].sameAsAbove = checked;
    if (checked) {
      // copy date/time/location from previous
      const prev = formData.services[index - 1] || {};
      ['date', 'time', 'location'].forEach(f => {
        if (prev[f] !== undefined) newServices[index][f] = prev[f];
      });
    }
    setFormData({ ...formData, services: newServices });
  };

  const handleSubmitEvent = async () => {
    const newEvent = {
      id: formData.quotationId,
      quotationRef: formData.quotationRef || '', // Store quotation reference
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      orderType: formData.orderType,
      team: Array.isArray(formData.team) ? formData.team.filter(Boolean) : [],
      services: formData.services.map((s, idx) => {
        const { sameAsDateAbove, sameAsTimeAbove, sameAsLocationAbove, sameAsAbove, typeEditable, ...rest } = s || {};
        return {
          id: Date.now() + idx,
          ...rest
        };
      }),
      // Derive top-level event status from services rather than relying solely on formData.eventStatus
      status: deriveEventStatusFromServices(formData.services.map(s => ({ ...(s || {}) }))),
  // Store full ISO datetime so time formatting works correctly in views
  createdDate: new Date().toISOString(),
      // Top-level date/time used by dashboard views — derive from first service when available
  date: (formData.services && formData.services.length > 0 ? formData.services[0].date : '') || formatDateISO(new Date()),
      time: (formData.services && formData.services.length > 0 ? formData.services[0].time : '') || '',
      notes: formData.notes
    };

  // Prevent adding duplicates: remove any existing event(s) with the same id
  const next = [newEvent, ...events.filter(e => e && e.id !== newEvent.id)];
    setEvents(next);
  try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, next); } catch (e) {}

  // Try to persist to server when authenticated. If it fails, keep local copy.
  try {
    const token = session.getToken();
    if (token) {
      const resp = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newEvent),
      });

      if (resp.ok) {
        const created = await resp.json();
        // Replace local provisional event with server-saved event (match by id)
        const replaced = [created, ...events.filter(e => e && e.id !== created.id)];
        setEvents(replaced);
        try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, replaced); } catch (e) {}
        showToast("Event created successfully");
      } else {
        // If server rejected, surface a toast but keep local state
        const text = await resp.text().catch(() => '');
        showToast(`Unable to save event to server: ${resp.status} ${resp.statusText} ${text}`);
      }
    }
  } catch (e) {
    // network or unexpected error — keep local copy and notify user
    // eslint-disable-next-line no-console
    console.warn('Failed to persist event to server', e);
    showToast('Event saved locally but failed to sync with server.');
  }

    // Dispatch notification for new event if user has enabled it
    if (notifications?.events) {
      try {
        dispatch(addNotification({
          title: 'Event created',
          message: `${newEvent.id} — ${newEvent.clientName || 'No client'}`,
          type: 'info',
          timestamp: new Date().toISOString(),
          path: '/events',
          data: { openViewId: newEvent.id }
        }));
      } catch (e) {}
    }
    setShowCreateModal(false);
    // Clear any saved create-draft
    try { removeDraftFromSession(makeDraftKey()); } catch (e) {}
  };

  const handleUpdateEvent = async () => {
    const next = events.map(e =>
      e.id === selectedEvent.id
        ? {
            ...e,
            quotationRef: formData.quotationRef || '',
            orderType: formData.orderType,
            clientName: formData.clientName,
            clientEmail: formData.clientEmail,
            clientPhone: formData.clientPhone,
            // allow explicit top-level status from the edit form; fallback to derived status from services
            status: (formData.eventStatus || deriveEventStatusFromServices(formData.services.map(s => ({ ...(s || {}) })))),
            team: Array.isArray(formData.team) ? formData.team.filter(Boolean) : [],
            services: formData.services.map((s) => {
              const { sameAsDateAbove, sameAsTimeAbove, sameAsLocationAbove, sameAsAbove, typeEditable, ...rest } = s || {};
              return rest;
            }),
            // Keep top-level date/time in sync with first service when possible
            date: (formData.services && formData.services.length > 0 ? formData.services[0].date : e.date) || e.createdDate || '',
            time: (formData.services && formData.services.length > 0 ? formData.services[0].time : e.time) || '',
            notes: formData.notes
          }
        : e
    );
    setEvents(next);
  try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, next); } catch (e) {}

  // Try to persist update to server
  try {
    const token = session.getToken();
    if (token) {
      const resp = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(selectedEvent.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(next.find(x => x.id === selectedEvent.id)),
      });
      if (resp.ok) {
        const updated = await resp.json();
        const replaced = events.map(ev => ev.id === updated.id ? updated : ev);
        setEvents(replaced);
        try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, replaced); } catch (e) {}
      } else {
        const txt = await resp.text().catch(() => '');
        showToast(`Unable to update event on server: ${resp.status} ${resp.statusText} ${txt}`);
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Failed to update event on server', e);
    showToast('Event updated locally but failed to sync with server.');
  }

    setIsEditMode(false);
    setShowViewModal(false);
    setSelectedEvent(null);
    // Clear any saved edit-draft for this event
    try { removeDraftFromSession(makeDraftKey(selectedEvent && selectedEvent.id)); } catch (e) {}
  };

  // Normalize existing events on mount: ensure top-level date/time fields exist (dashboard uses them)
  useEffect(() => {
    try {
      if (!Array.isArray(events) || events.length === 0) return;
      const normalized = events.map(ev => {
        const firstSvc = Array.isArray(ev.services) && ev.services.length > 0 ? ev.services[0] : null;
        const derivedDate = ev.date || (firstSvc && firstSvc.date) || ev.createdDate || '';
        const derivedTime = ev.time || (firstSvc && firstSvc.time) || '';
        // Ensure orderType exists - treat missing as 'own'
        const orderType = ev.orderType || 'own';
        // Ensure top-level status matches services-derived status
        const derivedStatus = deriveEventStatusFromServices(ev.services || []);
        if (ev.date !== derivedDate || ev.time !== derivedTime || ev.orderType !== orderType || ev.status !== derivedStatus) {
          return { ...ev, date: derivedDate, time: derivedTime, orderType, status: derivedStatus };
        }
        return ev;
      });
      // If any change detected, persist normalized events
      const changed = JSON.stringify(normalized) !== JSON.stringify(events);
      if (changed) {
        setEvents(normalized);
  try { storage.setJSONAndSync(STORAGE_KEYS.EVENTS, normalized); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const location = useLocation();
  const pendingOpenRef = useRef(null);

  useEffect(() => {
    if (location?.state?.openCreate) {
      // Open create modal (no draft loading from storage)
      handleCreateEvent();
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }

    // If navigation requested to open a specific event view (from dashboard), try to open it.
    // Events may not be loaded yet; if so, store the id and attempt after events load.
    if (location?.state?.openViewId) {
      const idToOpen = location.state.openViewId;
      const evt = events.find(e => e.id === idToOpen);
      if (evt) {
        handleViewEvent(evt);
      } else {
        pendingOpenRef.current = idToOpen;
      }
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If a pending open id was set (because events weren't loaded when navigation happened),
  // try to open it now that `events` may have been populated.
  useEffect(() => {
    if (pendingOpenRef.current) {
      const idToOpen = pendingOpenRef.current;
      const evt = events.find(e => e.id === idToOpen);
      if (evt) {
        handleViewEvent(evt);
        pendingOpenRef.current = null;
        try { window.history.replaceState({}, document.title); } catch (e) {}
      }
    }
  }, [events]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns({
      ...visibleColumns,
      [columnKey]: !visibleColumns[columnKey]
    });
  };

  const toggleAllColumns = (checked) => {
    const newVisibleColumns = {};
    columnOptions.forEach(column => {
      newVisibleColumns[column.key] = checked;
    });
    setVisibleColumns(newVisibleColumns);
  };

  const isAllColumnsSelected = () => {
    return columnOptions.every(column => visibleColumns[column.key]);
  };

  const columnOptions = [
    { key: 'quotationNo', label: 'Quotation No.' },
    { key: 'date', label: 'Date' },
    { key: 'services', label: 'Services' },
    { key: 'orderType', label: 'Order Type' },
    { key: 'team', label: 'Team' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status' }
  ];

  // Filter events for stats (excludes status filter to show all status counts)
  const getFilteredEventsForStats = () => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    let filtered = events.filter(event => {
      const clientName = (event?.clientName || '').toString().toLowerCase();
      const quotationRef = (event?.quotationRef || '').toString().toLowerCase();

      const matchesName = q === '' || clientName.includes(q);

      const matchesDate = (event.services || []).some(s => {
        const sdate = (s?.date || '').toString().toLowerCase();
        const slocal = s?.date ? formatDateDisplay(s.date).toLowerCase() : '';
        return sdate.includes(q) || slocal.includes(q);
      });

      const matchesLocation = (event.services || []).some(s => (s?.location || '').toString().toLowerCase().includes(q));

      const matchesId = (event?.id || '').toString().toLowerCase().includes(q);

      const matchesQuotation = quotationRef.includes(q);

      const matchesServiceName = (event.services || []).some(s => (s?.name || '').toString().toLowerCase().includes(q));

      // Team: event.team may be an array of strings or objects with name
      const teamArr = Array.isArray(event.team) ? event.team : [];
      const teamText = teamArr.map(t => (typeof t === 'string' ? t : (t.name || ''))).join(' ').toLowerCase();
      const matchesTeam = teamText.includes(q);

      const matchesSearch = matchesName || matchesDate || matchesLocation || matchesId || matchesServiceName || matchesQuotation || matchesTeam;
      
      // Order type filter (but NOT status filter for stats)
      const matchesOrderType = orderTypeFilter === 'all' || (event.orderType || 'own') === orderTypeFilter;

      return matchesSearch && matchesOrderType;
    });

    // Apply date range filter if set (dateFrom/dateTo are YYYY-MM-DD)
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;

      filtered = filtered.filter(ev => {
        // An event matches the date range if ANY of its services have a date within the range
        const anyInRange = (ev.services || []).some(s => {
          if (!s || !s.date) return false;
          const sd = new Date(s.date);
          if (Number.isNaN(sd.getTime())) return false;
          if (from && sd < from) return false;
          if (to && sd > to) return false;
          return true;
        });
        return anyInRange;
      });
    }

    return filtered;
  };

  const getFilteredEvents = () => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    let filtered = events.filter(event => {
      const clientName = (event?.clientName || '').toString().toLowerCase();
      const quotationRef = (event?.quotationRef || '').toString().toLowerCase();

      const matchesName = q === '' || clientName.includes(q);

      const matchesDate = (event.services || []).some(s => {
        const sdate = (s?.date || '').toString().toLowerCase();
        const slocal = s?.date ? formatDateDisplay(s.date).toLowerCase() : '';
        return sdate.includes(q) || slocal.includes(q);
      });

      const matchesLocation = (event.services || []).some(s => (s?.location || '').toString().toLowerCase().includes(q));

      const matchesId = (event?.id || '').toString().toLowerCase().includes(q);

      const matchesQuotation = quotationRef.includes(q);

      const matchesServiceName = (event.services || []).some(s => (s?.name || '').toString().toLowerCase().includes(q));

      // Team: event.team may be an array of strings or objects with name
      const teamArr = Array.isArray(event.team) ? event.team : [];
      const teamText = teamArr.map(t => (typeof t === 'string' ? t : (t.name || ''))).join(' ').toLowerCase();
      const matchesTeam = teamText.includes(q);

      const matchesSearch = matchesName || matchesDate || matchesLocation || matchesId || matchesServiceName || matchesQuotation || matchesTeam;
      const matchesStatus = filterStatus === 'all' || event.status === filterStatus;

      // Order type filter
      const matchesOrderType = orderTypeFilter === 'all' || (event.orderType || 'own') === orderTypeFilter;

      return matchesSearch && matchesStatus && matchesOrderType;
    });

    // Apply date range filter if set (dateFrom/dateTo are YYYY-MM-DD)
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;

      filtered = filtered.filter(ev => {
        // An event matches the date range if ANY of its services have a date within the range
        const anyInRange = (ev.services || []).some(s => {
          if (!s || !s.date) return false;
          const sd = new Date(s.date);
          if (Number.isNaN(sd.getTime())) return false;
          if (from && sd < from) return false;
          if (to && sd > to) return false;
          return true;
        });
        return anyInRange;
      });
    }

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'client':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'date':
          const dateA = a.services.length > 0 ? new Date(a.services[0].date) : new Date(0);
          const dateB = b.services.length > 0 ? new Date(b.services[0].date) : new Date(0);
          comparison = dateA - dateB;
          break;
        // 'amount' sorting removed (column not displayed)
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#fbbf24';
      case 'in-progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <FaClock />;
      case 'in-progress': return <FaPlay />;
      case 'completed': return <FaCheckCircle />;
      case 'cancelled': return <FaTimes />;
      default: return <FaClock />;
    }
  };

  // Derive overall event status from its services per business rules:
  // - If all services are 'cancelled' => event is 'cancelled'
  // - Else if all services are 'completed' => event is 'completed'
  // - Else if any service is 'scheduled' or 'in-progress' => event is 'scheduled'
  // - Fallback => 'scheduled'
  const deriveEventStatusFromServices = (services) => {
    if (!Array.isArray(services) || services.length === 0) return 'scheduled';
    const normalized = services.map(s => (s && s.status) ? s.status : 'scheduled');
    const allCancelled = normalized.every(st => st === 'cancelled');
    if (allCancelled) return 'cancelled';
    // If all services are either completed or cancelled (mixture allowed), treat event as completed
    const allCompletedOrCancelled = normalized.every(st => st === 'completed' || st === 'cancelled');
    if (allCompletedOrCancelled) return 'completed';
    // If any service is scheduled or in-progress, keep event as scheduled
    const anyScheduledOrInProgress = normalized.some(st => st === 'scheduled' || st === 'in-progress');
    if (anyScheduledOrInProgress) return 'scheduled';
    return 'scheduled';
  };

  // Format order type for display: e.g. 'own' -> 'Own', 'suborder' -> 'Suborder'
  const formatOrderType = (val) => {
    if (!val) return 'N/A';
    return val.toString().split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const filteredEvents = getFilteredEvents();

  // Pagination logic
  const totalPages = Math.ceil(filteredEvents.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, orderTypeFilter, dateFrom, dateTo, sortBy, sortOrder]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page when changing rows per page
  };

  // Return a 1-based serial number for a given event id based on the current
  // filteredEvents ordering. Falls back to the full events list if not found
  // in the filtered set (e.g. when a filter/search excludes it).
  const getSerialNumber = (id) => {
    const idx = filteredEvents.findIndex(e => e.id === id);
    if (idx !== -1) return idx + 1;
    const idxAll = events.findIndex(e => e.id === id);
    return idxAll !== -1 ? idxAll + 1 : '';
  };

  const handleExportEvents = () => {
    try {
      const rows = (Array.isArray(filteredEvents) && filteredEvents.length > 0) ? filteredEvents : events;
      if (!rows || rows.length === 0) { showToast('No events to export'); return; }

      // Base columns always included
      const headers = ['Sl. No', 'Client Name', 'Phone', 'Mail'];

      // Append visible columns from columnOptions in order
      columnOptions.forEach(col => {
        if (visibleColumns[col.key]) headers.push(col.label);
      });

      const esc = (v) => { const s = v === undefined || v === null ? '' : String(v); return '"' + s.replace(/"/g, '""') + '"'; };

      const lines = rows.map((ev, idx) => {
        const sn = getSerialNumber(ev.id) || (idx + 1);
        const base = [sn, ev.clientName || '', ev.clientPhone || '', ev.clientEmail || ''];

        columnOptions.forEach(col => {
          if (!visibleColumns[col.key]) return;
          switch (col.key) {
            case 'quotationNo':
              base.push(ev.quotationRef || ev.id || '');
              break;
            case 'date': {
              if (Array.isArray(ev.services) && ev.services.length > 0) {
                const sorted = ev.services.slice().sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
                base.push(sorted.map(s => s && s.date ? formatDateDisplay(s.date) : '').filter(Boolean).join('; '));
              } else {
                base.push('');
              }
              break;
            }
            case 'services': {
              if (Array.isArray(ev.services) && ev.services.length > 0) {
                const sorted = ev.services.slice().sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
                base.push(sorted.map(s => s && s.name ? s.name : s || '').filter(Boolean).join('; '));
              } else {
                base.push('');
              }
              break;
            }

            case 'team':
              base.push(Array.isArray(ev.team) ? ev.team.filter(Boolean).join('; ') : '');
              break;
            case 'location': {
              if (Array.isArray(ev.services) && ev.services.length > 0) {
                const sorted = ev.services.slice().sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
                const locs = sorted.map(s => s && s.location ? s.location : '').filter(Boolean);
                base.push(Array.from(new Set(locs)).join('; '));
              } else {
                base.push(ev.location || '');
              }
              break;
            }
            case 'orderType':
              base.push(formatOrderType(ev.orderType || 'own'));
              break;
            case 'status':
              base.push(ev.status || '');
              break;
            default:
              base.push('');
          }
        });

        return base.map(esc).join(',');
      });

      const csv = [headers.map(esc).join(','), ...lines].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events_export_${formatDateISO(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error('export error', e); showToast('Unable to export events'); }
  };

  return (
    <div className="event">
      {/* Header */}
      <div className="event__header">
        <div className="event__title-section">
          <h1 className="event__title">
            <FaCalendarCheck />
            Events
          </h1>
          <p className="event__subtitle">
            Manage and track client events and services
          </p>
        </div>
          {/* Event stats: total, completed, cancelled, scheduled */}
        <div className="event__header-actions">
          <button
            className="btn-primary event__export-btn"
            onClick={handleExportEvents}
            title="Export Events"
            style={{ marginRight: 8 }}
          >
            <FaShareSquareIcon /> Export
          </button>

          <button className="btn-primary" onClick={handleCreateEvent}>
            <FaPlus />
            New Event
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="event__stats">
        {(() => {
          const eventsForStats = getFilteredEventsForStats();
          const total = eventsForStats.length;
          const completed = eventsForStats.filter(e => e.status === 'completed').length;
          const cancelled = eventsForStats.filter(e => e.status === 'cancelled').length;
          const scheduled = eventsForStats.filter(e => e.status === 'scheduled' || e.status === 'in-progress').length;

          const items = [
            { key: 'total', label: 'Total Events', value: total, icon: <FaThLarge />, mod: 'total' },
            { key: 'completed', label: 'Completed', value: completed, icon: <FaCheck />, mod: 'completed' },
            { key: 'cancelled', label: 'Cancelled', value: cancelled, icon: <FaTimes />, mod: 'cancelled' },
            { key: 'scheduled', label: 'Scheduled / In-progress', value: scheduled, icon: <FaClock />, mod: 'scheduled' }
          ];

          return items.map(item => (
            <div key={item.key} className="event__stat-card" role="group" aria-label={item.label}>
              <div className={`event__stat-icon event__stat-icon--${item.mod}`}>
                {item.icon}
              </div>
              <div className="event__stat-info">
                <h3>{item.value}</h3>
                <p>{item.label}</p>
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Toolbar */}
      <div className="event__toolbar">
        <div className="event__search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search events by client, ID, service or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="event__toolbar-right">
          <div className="event__filter">
            <FaFilter />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          {/* Order Type Filter */}
          <div className="event__filter event__filter--order-type">
            <label>Order</label>
            <select value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="own">Own</option>
              <option value="suborder">Suborder</option>
            </select>
          </div>
          {/* Date Range Filter */}
          <div className="event__filter event__filter--date-range">
            <div className="event__date-input">
              <label>From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="event__date-input">
              <label>To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="event__view-toggle">
            {viewMode === 'table' && (
              <div className="event__column-selector">
                <button
                  ref={eventBtnRef}
                  className="event__column-btn"
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  title="Column Preferences"
                >
                  <FaColumns />
                </button>
                {showColumnMenu && (
                  <div ref={eventMenuRef} className="event__column-menu">
                    <div className="event__column-menu-header">
                      <span>Show Columns</span>
                      <button onClick={() => setShowColumnMenu(false)}>
                        <FaTimes />
                      </button>
                    </div>
                    <div className="event__column-menu-items">
                      <label className="event__column-menu-item event__column-menu-item--select-all">
                        <input
                          type="checkbox"
                          checked={isAllColumnsSelected()}
                          onChange={(e) => toggleAllColumns(e.target.checked)}
                        />
                        {isAllColumnsSelected() ? <FaCheckSquare /> : <FaSquare />}
                        <span><strong>Select All</strong></span>
                      </label>
                      <div className="event__column-menu-divider"></div>
                      {columnOptions.map(column => (
                        <label key={column.key} className="event__column-menu-item">
                          <input
                            type="checkbox"
                            checked={visibleColumns[column.key]}
                            onChange={() => toggleColumn(column.key)}
                          />
                          {visibleColumns[column.key] ? <FaCheckSquare /> : <FaSquare />}
                          <span>{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              className={`event__view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <FaList />
            </button>
            <button
              className={`event__view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FaThLarge />
            </button>
          </div>
        </div>
      </div>

      {/* Events Content */}
      <div className="event__content">
        {filteredEvents.length === 0 ? (
          <div className="event__empty">
            <FaCalendarAlt />
            <h3>No events found</h3>
            <p>Create your first event to get started</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="event__table-container">
            <table className="event__table">
              <thead>
                <tr>
                  <th className="event__col-no">No.</th>
                  {visibleColumns.orderType && <th className="event__col-order-type">Order Type</th>}
                  <th 
                    className="event__col-client event__sortable-header"
                    onClick={() => handleSort('client')}
                  >
                    Client {' '}
                    {sortBy === 'client' ? (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    ) : (
                      <FaSort className="event__sort-icon--muted" />
                    )}
                  </th>
                  {visibleColumns.quotationNo && <th className="event__col-quotation-no">Quotation No.</th>}
                  {visibleColumns.services && <th className="event__col-services">Services</th>}
                  {visibleColumns.date && (
                    <th
                      className="event__col-date event__sortable-header"
                      onClick={() => handleSort('date')}
                    >
                      Date {' '}
                      {sortBy === 'date' ? (
                        sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort className="event__sort-icon--muted" />
                      )}
                    </th>
                  )}
                  {visibleColumns.team && <th className="event__col-team">Team</th>}
                  {visibleColumns.location && <th className="event__col-location">Location</th>}
                  {visibleColumns.status && <th className="event__col-status">Status</th>}
                  <th className="event__col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvents.map((event, index) => (
                  <tr
                    key={event.id}
                    tabIndex={0}
                    onClick={() => handleViewEvent(event)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleViewEvent(event);
                      }
                    }}
                    role="button"
                    aria-pressed="false"
                  >
                    <td className="event__col-no">
                      <span className="event__id">{getSerialNumber(event.id)}</span>
                    </td>
                    {visibleColumns.orderType && (
                      <td className="event__col-order-type">
                        {(() => {
                          const ot = (event.orderType || 'own').toString().toLowerCase();
                          return (
                            <span className={`event__order-type event__order-type--${ot}`}>
                              {formatOrderType(event.orderType || 'own')}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="event__col-client">
                      <div className="event__client">
                        <div className="event__client-info">
                          <div className="event__client-name"><Highlight text={event.clientName} query={searchQuery} /></div>
                          <div className="event__client-phone"><Highlight text={event.clientPhone} query={searchQuery} /></div>
                          <div className="event__client-email"><Highlight text={event.clientEmail} query={searchQuery} /></div>
                        </div>
                      </div>
                    </td>
                    {visibleColumns.quotationNo && (
                      <td className="event__col-quotation-no">
                        <span className="event__quotation-id">
                          <Highlight text={event.quotationRef || 'NA'} query={searchQuery} />
                        </span>
                      </td>
                    )}
                    {visibleColumns.services && (
                      <td className="event__col-services">
                        <div className="event__services">
                          {(() => {
                            // Sort services by date (chronological order)
                            const sortedServices = [...event.services].sort((a, b) => {
                              const dateA = a.date ? new Date(a.date) : new Date(0);
                              const dateB = b.date ? new Date(b.date) : new Date(0);
                              return dateA - dateB;
                            });
                            return sortedServices.map((service, idx) => {
                              const isStruck = service && (service.status === 'completed' || service.status === 'cancelled');
                              return (
                                <span key={idx} className={`event__service-tag ${isStruck ? 'event__service-tag--struck' : ''}`}>
                                  <FaConciergeBell /> {service.name}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </td>
                    )}
                    
                    {visibleColumns.date && (
                      <td className="event__col-date">
                        <div className="event__date-info">
                          {event.services.length > 0 ? (
                            (() => {
                              // Sort services by date (chronological order)
                              const sortedServices = [...event.services].sort((a, b) => {
                                const dateA = a.date ? new Date(a.date) : new Date(0);
                                const dateB = b.date ? new Date(b.date) : new Date(0);
                                return dateA - dateB;
                              });
                              return sortedServices.map((service, idx) => {
                                const isStruck = service && (service.status === 'completed' || service.status === 'cancelled');
                                return (
                                  <div key={idx} className="event__service-date-time">
                                    <span className={`event__date ${isStruck ? 'event__date--struck' : ''}`}>{formatDateDisplay(service.date)}</span>
                                    {service.time && (
                                      <span className={`event__time ${isStruck ? 'event__time--struck' : ''}`}>
                                        <FaClock /> {service.time}
                                      </span>
                                    )}
                                  </div>
                                );
                              });
                            })()
                          ) : (
                            <span className="event__date">N/A</span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.team && (
                      <td className="event__col-team">
                        <div className="event__services">
                          {event.team && event.team.map((member, mIdx) => (
                            <span key={mIdx} className="event__service-tag">
                              <FaUser /> <Highlight text={member} query={searchQuery} />
                            </span>
                          ))}
                        </div>
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="event__col-location">
                        <div className="event__location">
                          {event.services.length > 0 ? (
                            (() => {
                              // Sort services by date (chronological order)
                              const sortedServices = [...event.services].sort((a, b) => {
                                const dateA = a.date ? new Date(a.date) : new Date(0);
                                const dateB = b.date ? new Date(b.date) : new Date(0);
                                return dateA - dateB;
                              });
                              return sortedServices.map((service, idx) => {
                                const isStruck = service && (service.status === 'completed' || service.status === 'cancelled');
                                return (
                                  <div key={idx} className="event__service-location-item">
                                    <FaMapMarkerAlt />
                                      <span className={`event__location-name ${isStruck ? 'event__location--struck' : ''}`}>
                                      <Highlight text={service.location || 'N/A'} query={searchQuery} />
                                    </span>
                                  </div>
                                );
                              });
                            })()
                          ) : (
                            <div className="event__location-item">
                              <FaMapMarkerAlt />
                              <span>N/A</span>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="event__col-status">
                        <span 
                          className={`event__status event__status--${event.status}`}
                        >
                          {getStatusIcon(event.status)}
                          {event.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      </td>
                    )}
                    <td className="event__col-actions">
                      <div className="event__actions">
                        <button
                          className="event__action-btn event__action-btn--view"
                          onClick={(e) => { e.stopPropagation(); handleViewEvent(event); }}
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button
                          className="event__action-btn event__action-btn--whatsapp"
                          onClick={(e) => { e.stopPropagation(); handleWhatsApp(event); }}
                          title="WhatsApp"
                        >
                          <FaWhatsapp />
                        </button>
                        <button
                          className="event__action-btn event__action-btn--email"
                          onClick={(e) => { e.stopPropagation(); handleEmail(event); }}
                          title="Email"
                        >
                          <FaEnvelope />
                        </button>
                        <button
                          className="event__action-btn event__action-btn--delete"
                          onClick={(e) => { e.stopPropagation(); handleDeleteEvent(event.id); }}
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="event__grid">
            {paginatedEvents.map((event, index) => (
              <div key={event.id} className="event__card">
                <div className="event__card-header">
                  {visibleColumns.id && (
                    <span className="event__card-id">{getSerialNumber(event.id)}</span>
                  )}
                  <span 
                    className={`event__status event__status--${event.status}`}
                  >
                    {getStatusIcon(event.status)}
                    {event.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                </div>
                
                <div className="event__card-client">
                  <div className="event__card-client-info">
                    <h3>{event.clientName}</h3>
                    <p>{event.clientPhone}</p>
                    <p>{event.clientEmail}</p>
                        {event.team && (
                      <div className="event__team-list">
                        {event.team.map((m, i) => (
                          <span key={i} className="event__service-tag"><FaUser /> {m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="event__card-services">
                  <h4><FaCamera /> Services ({event.services.length})</h4>
                  {(() => {
                    // Sort services by date (chronological order)
                    const sortedServices = [...event.services].sort((a, b) => {
                      const dateA = a.date ? new Date(a.date) : new Date(0);
                      const dateB = b.date ? new Date(b.date) : new Date(0);
                      return dateA - dateB;
                    });
                          return sortedServices.map((service, idx) => (
                      <div key={idx} className="event__card-service">
                        <div className="event__card-service-header">
                          <span className="event__service-name"><Highlight text={service.name} query={searchQuery} /></span>
                          <span 
                            className={`event__service-status event__service-status--${service.status}`}
                          >
                            {getStatusIcon(service.status)}
                          </span>
                        </div>
                        <div className="event__card-service-details">
                          <span><FaCalendarAlt /> {formatDateDisplay(service.date)}</span>
                          <span><FaClock /> {service.time}</span>
                        </div>
                        <div className="event__card-service-location">
                          <FaMapMarkerAlt /> <Highlight text={service.location} query={searchQuery} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                <div className="event__card-actions">
                  <button
                    className="event__action-btn event__action-btn--view"
                    onClick={() => handleViewEvent(event)}
                    title="View"
                  >
                    <FaEye />
                  </button>
                  <button
                    className="event__action-btn event__action-btn--whatsapp"
                    onClick={() => handleWhatsApp(event)}
                    title="Send WhatsApp"
                  >
                    <FaWhatsapp />
                  </button>
                  <button
                    className="event__action-btn event__action-btn--email"
                    onClick={() => handleEmail(event)}
                    title="Send Email"
                  >
                    <FaEnvelope />
                  </button>
                  <button
                    className="event__action-btn event__action-btn--delete"
                    onClick={() => handleDeleteEvent(event.id)}
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredEvents.length > 0 && (
        <div className="event__pagination">
          <div className="event__pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
          </div>
          <div className="event__pagination-controls">
            <div className="event__pagination-rows">
              <label>Rows per page:</label>
              <select 
                value={rowsPerPage} 
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="event__pagination-buttons">
              <button
                className="event__pagination-btn"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <FaAngleDoubleLeft />
              </button>
              <button
                className="event__pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <FaAngleLeft />
              </button>
              <div className="event__pagination-pages">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  
                  if (endPage - startPage < maxVisible - 1) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }

                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        className="event__pagination-btn"
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="ellipsis1" className="event__pagination-ellipsis">...</span>);
                    }
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`event__pagination-btn ${currentPage === i ? 'active' : ''}`}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    );
                  }

                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="ellipsis2" className="event__pagination-ellipsis">...</span>);
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        className="event__pagination-btn"
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    );
                  }

                  return pages;
                })()}
              </div>
              <button
                className="event__pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <FaAngleRight />
              </button>
              <button
                className="event__pagination-btn"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
              >
                <FaAngleDoubleRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create New Event"
        headerActions={(
          <button className="btn-secondary modal__reset" onClick={resetCreateForm} type="button">
            Reset
          </button>
        )}
        onClose={() => { saveDraftToSession(DRAFT_KEY); setShowCreateModal(false); }}
        size="large"
      >
        <div className="event__form">
          <div className="event__form-section">
            <div className="event__form-row">
              <div className="event__form-group">
                <label>Event ID</label>
                <input
                  type="text"
                  value={formData.quotationId || ''}
                  readOnly
                />
              </div>
              <div className="event__form-group">
                <label>Quotation ID</label>
                {Array.isArray(quotations) && quotations.length > 0 ? (
                  (() => {
                    const all = quotations || [];
                    const filtered = all.filter(q => {
                      const label = String(q.id || q.quotationId || q.ref) + (q.clientName ? ' - ' + q.clientName : '');
                      return label.toLowerCase().includes((quotationQuery || '').toLowerCase());
                    });

                    const selectedLabel = (() => {
                      if (quotationQuery) return quotationQuery;
                      if (formData.quotationRef) {
                        const found = all.find(x => String(x.id || x.quotationId || x.ref) === String(formData.quotationRef));
                        if (found) return String(found.id || found.quotationId || found.ref) + (found.clientName ? ' - ' + found.clientName : '');
                      }
                      return '';
                    })();

                    return (
                      <div style={{ position: 'relative' }}>
                        <input
                          ref={quotationInputRef}
                          className="event__quotation-input"
                          type="text"
                          placeholder="Search quotation by ID or client name"
                          value={quotationQuery || selectedLabel}
                          onChange={(e) => { setQuotationQuery(e.target.value); setShowQuotationDropdown(true); setHighlightedQuotationIndex(-1); }}
                          onFocus={() => { setShowQuotationDropdown(true); setHighlightedQuotationIndex(-1); }}
                          onKeyDown={(e) => {
                            const max = filtered.length - 1;
                            if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedQuotationIndex(i => Math.min(max, Math.max(0, i + 1))); }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedQuotationIndex(i => Math.max(0, i - 1)); }
                            else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (highlightedQuotationIndex >= 0 && filtered[highlightedQuotationIndex]) {
                                const sel = filtered[highlightedQuotationIndex];
                                const selId = String(sel.id || sel.quotationId || sel.ref);
                                handleSelectQuotation(selId);
                                setQuotationQuery(String(selId) + (sel.clientName ? ' - ' + sel.clientName : ''));
                                setShowQuotationDropdown(false);
                                setHighlightedQuotationIndex(-1);
                              }
                            } else if (e.key === 'Escape') {
                              setShowQuotationDropdown(false);
                            }
                          }}
                          onBlur={() => { quotationBlurTimeoutRef.current = setTimeout(() => setShowQuotationDropdown(false), 120); }}
                          onMouseDown={() => { if (quotationBlurTimeoutRef.current) { clearTimeout(quotationBlurTimeoutRef.current); quotationBlurTimeoutRef.current = null; } }}
                        />

                        {showQuotationDropdown && filtered.length > 0 && (
                          <ul className="event__quotation-dropdown" style={{ position: 'absolute', zIndex: 40, top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 220, overflow: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 0, margin: 0, listStyle: 'none' }}>
                            {filtered.map((q, idx) => {
                              const label = String(q.id || q.quotationId || q.ref) + (q.clientName ? ' - ' + q.clientName : '');
                              const isHighlighted = idx === highlightedQuotationIndex;
                              return (
                                <li
                                  key={(q.id || q.quotationId || q.ref) + '-' + idx}
                                  onMouseDown={(ev) => { ev.preventDefault(); const selId = String(q.id || q.quotationId || q.ref); handleSelectQuotation(selId); setQuotationQuery(label); setShowQuotationDropdown(false); setHighlightedQuotationIndex(-1); }}
                                  onMouseEnter={() => setHighlightedQuotationIndex(idx)}
                                  style={{ padding: '8px 10px', background: isHighlighted ? '#f3f4f6' : '#fff', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}
                                >
                                  <div style={{ fontSize: 13, color: '#111' }}>{label}</div>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {(quotationQuery || formData.quotationRef) && (
                          <button
                            type="button"
                            className="event__quotation-clear"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setQuotationQuery('');
                              resetCreateForm();
                              setShowQuotationDropdown(false);
                              setHighlightedQuotationIndex(-1);
                              try { quotationInputRef.current && quotationInputRef.current.focus(); } catch (err) {}
                            }}
                            aria-label="Clear quotation"
                          >
                            <FaTimes />
                          </button>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="event__form-note">
                    No quotations available
                  </div>
                )}
              </div>
              <div className="event__form-group">
                <label>Order Type</label>
                <select
                  value={formData.orderType}
                  onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                >
                  <option value="own">Own</option>
                  <option value="suborder">Suborder</option>
                </select>
              </div>
            </div>
            <div className="event__form-row event__form-row--with-margin">
              <div className="event__form-group">
                <label>Client Name *</label>
                <input
                  type="text"
                  placeholder="Enter client name"
                  value={formData.clientName}
                  onChange={(e) => {
                    // allow letters, spaces and common name punctuation only
                    const v = (e.target.value || '').replace(/[^A-Za-z '\-\.()]/g, '');
                    setFormData({ ...formData, clientName: v });
                  }}
                  inputMode="text"
                  title="Name: letters, spaces and - ' . () only"
                />
              </div>
              <div className="event__form-group">
                <label>Client Phone *</label>
                <input
                  type="tel"
                  placeholder="1234567890"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: sanitizePhone(e.target.value) })}
                  inputMode="numeric"
                  pattern="\d{10}"
                  title="Phone: digits only (10 digits)"
                />
              </div>
              <div className="event__form-group">
                <label>Client Email</label>
                <input
                  type="email"
                  placeholder="client@email.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  inputMode="email"
                  title="Email address"
                />
              </div>
            </div>
          </div>

          <div className="event__form-section">
            <div className="event__form-section-header">
              <h3>Services & Schedule</h3>
              <button className="btn-secondary" onClick={addService}>
                <FaPlus /> Add Service
              </button>
            </div>

            {formData.services.map((service, index) => (
              <div key={index} className="event__service-item">
                <div className="event__service-item-header">
                  <h4>Service {index + 1}</h4>
                  {formData.services.length > 1 && (
                    <button
                      className="event__remove-service"
                      onClick={() => removeService(index)}
                      title="Remove service"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                <div className="event__form-group">
                  <label>Service Type</label>
                  <ServiceTypeInput
                    value={service.name || ''}
                    onChange={(val) => updateService(index, 'name', val)}
                    availableServices={availableServices}
                    onNewService={handleNewService}
                  />
                </div>

                <div className="event__form-row">
                  <div className="event__form-group">
                    <label>Date</label>
                    <div className="event__form-input-with-flag">
                      <input
                        type="date"
                        value={service.date}
                        onChange={(e) => updateService(index, 'date', e.target.value)}
                      />
                      {index > 0 && (
                        <label className="event__same-as-above">
                          <input
                            type="checkbox"
                            checked={!!service.sameAsAbove}
                            onChange={(e) => toggleSameAsAbove(index, e.target.checked)}
                          />
                          <span>Same date/time/location as above</span>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="event__form-group">
                    <label>Time</label>
                    <div className="event__form-input-with-flag">
                      <input
                        type="time"
                        value={service.time}
                        onChange={(e) => updateService(index, 'time', e.target.value)}
                      />
                      {index > 0 && (
                        <label className="event__same-as-above" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                          {/* Hidden placeholder so layout stays consistent when unified checkbox is used */}
                          <input type="checkbox" disabled />
                          <span>Same as above</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="event__form-group">
                  <label>Location</label>
                  <div className="event__form-input-with-flag">
                    <input
                      type="text"
                      placeholder="Enter event location"
                      value={service.location}
                      onChange={(e) => updateService(index, 'location', e.target.value)}
                    />
                    {index > 0 && (
                      <label className="event__same-as-above" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                        {/* Hidden placeholder so layout stays consistent when unified checkbox is used */}
                        <input type="checkbox" disabled />
                        <span>Same as above</span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="event__form-group">
                  <label>Notes</label>
                  <textarea
                    placeholder="Additional notes for this service"
                    value={service.notes}
                    onChange={(e) => updateService(index, 'notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="event__form-section">
            <h3>Team Assignment</h3>
              <div className="event__form-group">
              <label>Team Members</label>
              <div className="event__team-list event__team-list--selectable">
                {teamMembers.length === 0 ? (
                  <div className="event__muted">No team members found. Add team members on the Team page.</div>
                ) : (
                  teamMembers.map((member) => {
                    const checked = Array.isArray(formData.team) && formData.team.includes(member);
                    return (
                      <label key={member} className={`event__team-label ${checked ? 'is-checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextTeam = Array.isArray(formData.team) ? [...formData.team] : [];
                            if (e.target.checked) {
                              nextTeam.push(member);
                            } else {
                              const idx = nextTeam.indexOf(member);
                              if (idx > -1) nextTeam.splice(idx, 1);
                            }
                            setFormData({ ...formData, team: nextTeam });
                          }}
                        />
                        <span className="event__team-label-text">{member}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="event__form-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                try { saveDraftToSession(makeDraftKey()); } catch (e) {}
                  try { setShowCreateModal(false); } catch (e) {}
                  try { showToast('⚠️ your form saved temporarily, please complete and submit soon.'); } catch (e) {}
              }}
              type="button"
            >
              Save Draft
            </button>
            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </button>
            <button 
              className="btn-primary" 
              onClick={() => {
                // validate before submit
                if (!isValidName(formData.clientName)) {
                  showToast('Please enter a valid client name');
                  return;
                }
                if (!isValidPhone(formData.clientPhone)) {
                  showToast('Please enter a valid client phone (digits only, 7-15 digits)');
                  return;
                }
                if (!isValidEmail(formData.clientEmail)) {
                  showToast('Please enter a valid email address');
                  return;
                }
                handleSubmitEvent();
              }}
              disabled={!formData.clientName || !formData.clientPhone}
            >
              Create Event
            </button>
          </div>
        </div>
      </Modal>

      {/* View/Edit Event Modal */}
      {showViewModal && selectedEvent && (
      <Modal
        isOpen={true}
        title={`${isEditMode ? 'Edit Event' : 'Event Details'} - ${selectedEvent.id}`}
        headerActions={isEditMode ? (
          <div className="event__header-status-edit">
            <label htmlFor="event-status-select" className="sr-only">Event Status</label>
            <div className="event__status-wrapper">
              <select
                id="event-status-select"
                className={`event__status-select event__status--${(formData.eventStatus || deriveEventStatusFromServices(formData.services || []) || selectedEvent.status).toString().toLowerCase()}`}
                value={formData.eventStatus || deriveEventStatusFromServices(formData.services || []) || selectedEvent.status}
                onChange={(e) => setFormData({ ...formData, eventStatus: e.target.value })}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <FaChevronDown className="event__status-arrow" />
            </div>
          </div>
        ) : null}
        onClose={() => {
          setShowViewModal(false);
          setSelectedEvent(null);
          setIsEditMode(false);
        }}
        size="large"
      >
        {!isEditMode ? (
          // View Mode
          <div className="event__view">
            <div className="event__view-header">
              <div className="event__view-client">
                <div>
                  <h3><Highlight text={selectedEvent.clientName} query={searchQuery} /></h3>
                  {selectedEvent.clientPhone && <p><Highlight text={selectedEvent.clientPhone} query={searchQuery} /></p>}
                  <p><Highlight text={selectedEvent.clientEmail} query={searchQuery} /></p>
                  {selectedEvent.quotationRef && (
                    <p><strong>Quotation:</strong> <Highlight text={selectedEvent.quotationRef} query={searchQuery} /></p>
                  )}
                  {!selectedEvent.quotationRef && (
                    <p><strong>Quotation:</strong> NA</p>
                  )}
                </div>
              </div>
              <div className="event__view-header-controls">
                <span 
                  className={`event__status event__status--${selectedEvent.status}`}
                >
                  {getStatusIcon(selectedEvent.status)}
                  {selectedEvent.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
                {!isEditMode && (
                  <button 
                    className="btn-primary" 
                    onClick={handleEnableEdit}
                  >
                    <FaEdit /> Edit
                  </button>
                )}
              </div>
            </div>

            <div className="event__view-section">
              <h4><FaCamera /> Services ({selectedEvent.services.length})</h4>
              <div className="event__view-services">
                {(() => {
                  // Sort services by date (chronological order)
                  const sortedServices = [...selectedEvent.services].sort((a, b) => {
                    const dateA = a.date ? new Date(a.date) : new Date(0);
                    const dateB = b.date ? new Date(b.date) : new Date(0);
                    return dateA - dateB;
                  });
                  return sortedServices.map((service, idx) => {
                    const isStruck = service && (service.status === 'completed' || service.status === 'cancelled');
                    return (
                      <div key={idx} className="event__view-service">
                        <div className="event__view-service-header">
                          <h5 className={isStruck ? 'event__service-name--struck' : ''}>{service.name}</h5>
                          <div className="event__view-service-status">
                            <span className={`event__status event__status--${service.status}`}>
                              {getStatusIcon(service.status)}
                              {service.status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                            </span>
                          </div>
                        </div>
                        <div className="event__view-service-details">
                          <div className="event__view-service-detail">
                            <FaCalendarAlt />
                              <span className={isStruck ? 'event__date--struck' : ''}>{formatDateDisplay(service.date)}</span>
                          </div>
                          <div className="event__view-service-detail">
                            <FaClock />
                            <span className={isStruck ? 'event__time--struck' : ''}>{service.time}</span>
                          </div>
                          <div className="event__view-service-detail">
                            <FaMapMarkerAlt />
                            <span className={isStruck ? 'event__location--struck' : ''}>{service.location}</span>
                          </div>
                        </div>
                        {service.notes && (
                          <div className="event__view-service-notes">
                            <strong>Notes:</strong> {service.notes}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {selectedEvent.team && selectedEvent.team.length > 0 && (
              <div className="event__view-section">
                <h4><FaUser /> Team Members</h4>
                <div className="event__services">
                  {selectedEvent.team.map((member, idx) => (
                    <span key={idx} className="event__service-tag">
                      <FaUser /> {member}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="event__view-section">
              <div className="event__view-info-grid">
                <div className="event__view-info-item">
                  <label>
                    Created Date:
                    <span>{formatDateTimeDisplay(selectedEvent.createdDate)}</span>
                  </label>
                </div>
                <div className="event__view-info-item">
                  <label>
                    Order Type: 
                    <span className={`event__order-type event__order-type--${(selectedEvent.orderType || 'n/a').toString().toLowerCase()}`}>
                      {formatOrderType(selectedEvent.orderType || 'N/A')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Edit Mode
          <div className="event__form">
            <div className="event__form-section">
                  <div className="event__form-row">
                    <div className="event__form-group">
                      <label>Event ID</label>
                      <input type="text" value={formData.quotationId || selectedEvent.id || ''} readOnly />
                    </div>
                    <div className="event__form-group">
                      <label>Quotation ID</label>
                      {Array.isArray(quotations) && quotations.length > 0 ? (
                        <select
                          value={formData.quotationRef || ''}
                          onChange={(e) => handleSelectQuotation(e.target.value)}
                        >
                          <option value="">-- Select existing quotation (optional) --</option>
                          {quotations.map(q => (
                            <option key={q.id} value={String(q.id)}>{q.id} - {q.clientName || q.clientEmail || ''}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="event__form-note">
                          No quotations available
                        </div>
                      )}
                    </div>
                    <div className="event__form-group">
                    <label>Order Type</label>
                    <select
                      value={formData.orderType}
                      onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                    >
                      <option value="own">Own</option>
                      <option value="suborder">Suborder</option>
                    </select>
                  </div>
                    <div className="event__form-group">
                      <label>Client Name *</label>
                      <input
                        type="text"
                        placeholder="Enter client name"
                        value={formData.clientName}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      />
                    </div>
                    <div className="event__form-group">
                    <label>Client Phone *</label>
                    <input
                      type="tel"
                      placeholder="+1 234-567-8900"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    />
                  </div>
                    <div className="event__form-group">
                      <label>Client Email</label>
                      <input
                        type="email"
                        placeholder="client@email.com"
                        value={formData.clientEmail}
                        onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      />
                    </div>
                  </div>
            </div>

            <div className="event__form-section">
              <div className="event__form-section-header">
                <h3>Services & Schedule</h3>
                <button className="btn-secondary" onClick={addService}>
                  <FaPlus /> Add Service
                </button>
              </div>

              {formData.services.map((service, index) => (
                <div key={index} className="event__service-item">
                  <div className="event__service-item-header">
                    <h4>Service {index + 1}</h4>
                    {formData.services.length > 1 && (
                      <button
                        className="event__remove-service"
                        onClick={() => removeService(index)}
                        title="Remove service"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>

                  <div className="event__form-group">
                    <label>Service Type *</label>
                    <ServiceTypeInput
                      value={service.name || ''}
                      onChange={(val) => updateService(index, 'name', val)}
                      availableServices={availableServices}
                      onNewService={handleNewService}
                    />
                  </div>

                  <div className="event__form-row">
                    <div className="event__form-group">
                      <label>Date *</label>
                      <div className="event__form-input-with-flag">
                        <input
                          type="date"
                          value={service.date}
                          onChange={(e) => updateService(index, 'date', e.target.value)}
                        />
                        {index > 0 && (
                          <label className="event__same-as-above">
                            <input
                              type="checkbox"
                              checked={!!service.sameAsAbove}
                              onChange={(e) => toggleSameAsAbove(index, e.target.checked)}
                            />
                            <span>Same date/time/location as above</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="event__form-group">
                      <label>Time</label>
                      <div className="event__form-input-with-flag">
                        <input
                          type="time"
                          value={service.time}
                          onChange={(e) => updateService(index, 'time', e.target.value)}
                        />
                        {index > 0 && (
                          <label className="event__same-as-above" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                            <input type="checkbox" disabled />
                            <span>Same as above</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="event__form-group">
                  <label>Location</label>
                    <div className="event__form-input-with-flag">
                      <input
                        type="text"
                        placeholder="Enter event location"
                        value={service.location}
                        onChange={(e) => updateService(index, 'location', e.target.value)}
                      />
                        {index > 0 && (
                          <label className="event__same-as-above" style={{ visibility: 'hidden', pointerEvents: 'none' }}>
                            <input type="checkbox" disabled />
                            <span>Same as above</span>
                          </label>
                        )}
                    </div>
                  </div>

                  <div className="event__form-row">
                    <div className="event__form-group">
                      <label>Status</label>
                      <select
                        value={service.status}
                        onChange={(e) => updateService(index, 'status', e.target.value)}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="event__form-group">
                    <label>Notes</label>
                    <textarea
                      placeholder="Additional notes for this service"
                      value={service.notes}
                      onChange={(e) => updateService(index, 'notes', e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="event__form-section">
              <h3>Team Assignment</h3>
              <div className="event__form-group">
                <label>Team Members</label>
                <div className="event__team-list event__team-list--selectable">
                  {teamMembers.length === 0 ? (
                    <div className="event__muted">No team members found. Add team members on the Team page.</div>
                  ) : (
                    teamMembers.map((member) => {
                      const checked = Array.isArray(formData.team) && formData.team.includes(member);
                      return (
                        <label key={member} className={`event__team-label ${checked ? 'is-checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const nextTeam = Array.isArray(formData.team) ? [...formData.team] : [];
                              if (e.target.checked) {
                                nextTeam.push(member);
                              } else {
                                const idx = nextTeam.indexOf(member);
                                if (idx > -1) nextTeam.splice(idx, 1);
                              }
                              setFormData({ ...formData, team: nextTeam });
                            }}
                          />
                          <span className="event__team-label-text">{member}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="event__form-actions">
              <button className="btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleUpdateEvent}
                disabled={!formData.clientName || !formData.clientPhone}
              >
                <FaCheck /> Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>
      )}
    </div>
  );
};

export default Event;
