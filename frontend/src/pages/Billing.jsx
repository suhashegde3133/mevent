import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FaReceipt,
  FaFileInvoiceDollar,
  FaPlus,
  FaEye,
  FaDownload,
  FaShareSquare,
  FaEnvelope,
  FaTrash,
  FaSearch,
  FaClock,
  FaCheck,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaFilter,
  FaCheckCircle,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaThLarge,
  FaList,
  FaColumns,
  FaCheckSquare,
  FaSquare,
  FaTimes,
  FaWhatsapp,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa';
import Modal from '../components/Modal/Modal';
import { useLocation } from 'react-router-dom';
import './Billing.scss';
import { storage } from '../utils/storage';
import { STORAGE_KEYS, APP_NAME, API_BASE_URL } from '../utils/constants';
import session from '../utils/session';
import { formatDateDisplay, formatDateISO } from '../utils/date';
import { addNotification } from '../redux/slices/uiSlice';
import { showToast } from '../utils/toast';
import useConfirm from '../hooks/useConfirm';
import Highlight from '../utils/Highlight';
import ServiceTypeInput from '../components/ServiceTypeInput/ServiceTypeInput';

// Draft key for billing create form (session-only)
const BILLING_DRAFT_KEY = 'photoflow_billing_draft';

const Billing = () => {
  // Get company and bank details from Redux settings
  const { company, bank, notifications } = useSelector((state) => state.settings);
  const dispatch = useDispatch();
  
  // Initialize with empty array - data will be loaded from server only
  const [invoices, setInvoices] = useState([]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  // Invoice date range filter (YYYY-MM-DD)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('amount'); // 'name', 'amount'
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
    id: true,
    quotationId: true,
    services: true,
    amount: true,
    paid: true,
    balance: true,
    status: true
  });
  // Refs for column menu and toggle button to detect outside clicks
  const billingMenuRef = useRef(null);
  const confirm = useConfirm();
  const billingBtnRef = useRef(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'Bank Transfer',
    paymentDate: formatDateISO(new Date()),
    reference: '',
    notes: ''
  });

  // available services loaded from Services page
  const [availableServices, setAvailableServices] = useState([]);
  // available quotations loaded from server (database)
  const [quotations, setQuotations] = useState([]);
  // Dropdown-specific cached list & error for immediate UI feedback
  const [dropdownQuotations, setDropdownQuotations] = useState([]);
  const [dropdownQuotationsError, setDropdownQuotationsError] = useState('');
  // Local UI state for searchable quotation dropdown
  const [quotationQuery, setQuotationQuery] = useState('');
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  const [highlightedQuotationIndex, setHighlightedQuotationIndex] = useState(-1);
  const quotationBlurTimeoutRef = useRef(null);
  const quotationInputRef = useRef(null);
  
  // Close column menu when clicking outside (but ignore clicks on the toggle button)
  useEffect(() => {
    function handleOutsideClick(e) {
      if (!showColumnMenu) return;
      const target = e.target;
      if (billingMenuRef.current && billingMenuRef.current.contains(target)) return;
      if (billingBtnRef.current && billingBtnRef.current.contains(target)) return;
      setShowColumnMenu(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColumnMenu]);
  
  useEffect(() => {
    try {
      const persisted = storage.getJSON(STORAGE_KEYS.SERVICES, null);
      if (Array.isArray(persisted) && persisted.length > 0) {
        const mapped = persisted.map(s => ({ id: s.id, name: s.name, price: Number(s.basePrice) || 0 }));
        setAvailableServices(mapped);
      }
    } catch (e) {
      // ignore and use fallback
    }
    // Also try to fetch fresh services from server (preferred when authenticated)
    (async () => {
      try {
        const remote = await storage.syncFromServer(STORAGE_KEYS.SERVICES);
        if (Array.isArray(remote) && remote.length > 0) {
          const mapped = remote.map(s => ({ id: s.id, name: s.name, price: Number(s.basePrice) || Number(s.price) || 0 }));
          setAvailableServices(mapped);
        }
      } catch (e) {
        // ignore - keep persisted or empty
      }
    })();
    // load quotations from server
    (async () => {
      try {
        const remote = await storage.syncFromServer(STORAGE_KEYS.QUOTATIONS);
        if (Array.isArray(remote) && remote.length > 0) {
          setQuotations(remote);
        }
      } catch (e) {
        // ignore
      }

      // Ensure dropdown helper is populated
      try { loadDropdownQuotations(); } catch (e) {}
    })();
  }, []);

  // Listen for notifications dispatched while user is already on this page
  // (some navigation events send state only when moving between pages). This
  // allows the notification dropdown to open a view even if we're already
  // on /billing.
  useEffect(() => {
    const handler = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : null;
        if (!detail || detail.path !== '/billing') return;
        const state = detail.state || {};
        if (state.openCreate) {
          setShowCreateModal(true);
        }
        if (state.openViewId) {
          const idToOpen = state.openViewId;
          const inv = invoices.find(i => i.id === idToOpen);
          if (inv) {
            handleViewInvoice(inv);
          } else {
            pendingOpenRef.current = idToOpen;
          }
        }
      } catch (e) {}
    };
    window.addEventListener('ui:notification', handler);
    return () => window.removeEventListener('ui:notification', handler);
  }, [invoices]);

  // Try to load invoices from server when authenticated. Falls back to local storage.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remote = await storage.syncFromServer(STORAGE_KEYS.INVOICES);
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          setInvoices(remote);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const location = useLocation();
  const pendingOpenRef = useRef(null);

  useEffect(() => {
    if (location?.state?.openCreate) {
      // Open create modal (no draft loading from storage)
      setShowCreateModal(true);
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }

    // If navigation requested to open a specific invoice view, try to open it.
    if (location?.state?.openViewId) {
      const idToOpen = location.state.openViewId;
      const inv = invoices.find(i => i.id === idToOpen);
      if (inv) {
        handleViewInvoice(inv);
      } else {
        pendingOpenRef.current = idToOpen;
      }
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If a pending open id was set (because invoices weren't loaded when navigation happened),
  // try to open it now that `invoices` may have been populated.
  useEffect(() => {
    if (pendingOpenRef.current) {
      const idToOpen = pendingOpenRef.current;
      const inv = invoices.find(i => i.id === idToOpen);
      if (inv) {
        handleViewInvoice(inv);
        pendingOpenRef.current = null;
        try { window.history.replaceState({}, document.title); } catch (e) {}
      }
    }
  }, [invoices]);

  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.amount - invoice.paid,
      paymentMethod: 'Bank Transfer',
      paymentDate: formatDateISO(new Date()),
      reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const generateInvoiceId = () => `INV-${Date.now().toString().slice(-6)}`;

  // Preview ID shown in the create form so user can see the invoice id before creating
  const [previewInvoiceId, setPreviewInvoiceId] = useState('');

  const [newInvoiceData, setNewInvoiceData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    items: [{ service: '', description: '', quantity: 1, price: 0 }],
    additionalCharges: [],
    issueDate: formatDateISO(new Date()),
    quotationId: '',
    showPaymentDetailsInPdf: true,
    showQrCodeInPdf: true
  });

  // Checkbox state for quotation ID form
  const [useQuotationData, setUseQuotationData] = useState(true);

  // Draft helpers for billing create form (component state only - no persistence)
  const makeBillingDraftKey = (id) => (id ? `${BILLING_DRAFT_KEY}_${String(id)}` : BILLING_DRAFT_KEY);

  const saveBillingDraftToSession = (key) => {
    const data = { newInvoiceData, previewInvoiceId };
    sessionStorage.setItem(key, JSON.stringify(data));
  };

  const loadBillingDraftFromSession = (key) => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  const removeBillingDraftFromSession = (key) => {
    sessionStorage.removeItem(key);
  };

  // Helper to get an empty invoice data object (used to reset form)
  const getEmptyInvoiceData = () => ({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    items: [{ service: '', description: '', quantity: 1, price: 0 }],
    additionalCharges: [],
    issueDate: formatDateISO(new Date()),
    quotationId: '',
    showPaymentDetailsInPdf: true,
    showQrCodeInPdf: true
  });

  // Auto-save draft when form data changes and modal is open
  useEffect(() => {
    if (showCreateModal && newInvoiceData) {
      // Check if form has any data (not empty)
      const hasData = newInvoiceData.clientName || newInvoiceData.clientEmail || newInvoiceData.clientPhone ||
                      newInvoiceData.items.some(item => item.service || item.description || item.price > 0) ||
                      newInvoiceData.additionalCharges.length > 0 || newInvoiceData.quotationId;
      if (hasData) {
        saveBillingDraftToSession(BILLING_DRAFT_KEY);
      }
    }
  }, [newInvoiceData, showCreateModal]);

  // When a quotation is chosen from the select, prefill invoice fields
  const handleSelectQuotation = (quotationId) => {
    if (!quotationId) {
      setNewInvoiceData({ ...newInvoiceData, quotationId: '' });
      return;
    }

    // Prefer in-memory state, but fall back to dropdown helper so selection works even if state wasn't populated
    const list = Array.isArray(quotations) && quotations.length > 0 ? quotations : getDropdownQuotations();
    const q = Array.isArray(list) ? list.find(x => String(x.id || x.quotationId || x.ref) === String(quotationId)) : null;
    if (!q) {
      setNewInvoiceData({ ...newInvoiceData, quotationId });
      return;
    }

    // Normalize the id field
    const qId = String(q.id || q.quotationId || q.ref);

    // Build items: prefer saved items, otherwise map services
    const items = (Array.isArray(q.items) && q.items.length > 0)
      ? q.items.map(it => ({ service: it.service || '', description: it.description || '', quantity: it.quantity || 1, price: it.price || 0 }))
      : (Array.isArray(q.services) ? q.services.map(svc => ({ service: svc, description: '', quantity: 1, price: 0 })) : []);

    setNewInvoiceData({
      ...newInvoiceData,
      quotationId: qId,
      clientName: q.clientName || newInvoiceData.clientName,
      clientEmail: q.clientEmail || newInvoiceData.clientEmail,
      clientPhone: q.clientPhone || newInvoiceData.clientPhone,
      items: items.length > 0 ? items : newInvoiceData.items,
      additionalCharges: Array.isArray(q.additionalCharges) ? q.additionalCharges : newInvoiceData.additionalCharges
    });
  };

  const handleOpenCreate = () => {
    // refresh quotations before opening so the dropdown shows latest values
    try {
      const persistedQ = storage.getJSON(STORAGE_KEYS.QUOTATIONS, null) || storage.getJSON(STORAGE_KEYS.APP_STATE, null) || null;
      if (Array.isArray(persistedQ)) {
        setQuotations(persistedQ);
      } else if (persistedQ && Array.isArray(persistedQ.quotations)) {
        setQuotations(persistedQ.quotations);
      }
    } catch (e) {}
    // Ensure synchronous dropdown read and errors are available for UI
    try { loadDropdownQuotations(); } catch (e) { /* ignore */ }

    // If a draft exists for billing create, load it instead of blank defaults
    try {
      const draft = loadBillingDraftFromSession(makeBillingDraftKey());
      if (draft && typeof draft === 'object') {
        if (draft.newInvoiceData) setNewInvoiceData(draft.newInvoiceData);
        if (draft.previewInvoiceId) setPreviewInvoiceId(draft.previewInvoiceId);
        setShowCreateModal(true);
        return;
      }
    } catch (e) {}

    setNewInvoiceData(getEmptyInvoiceData());
    // generate a preview id for display
    setPreviewInvoiceId(generateInvoiceId());
    setShowCreateModal(true);
  };

  // Reset create form to empty defaults (only used for Create modal)
  const handleResetCreateForm = () => {
    try {
      setNewInvoiceData(getEmptyInvoiceData());
    } catch (e) {}
    try {
      setPreviewInvoiceId(generateInvoiceId());
    } catch (e) {}
    try {
      // clear any saved draft for the create form
      removeBillingDraftFromSession(makeBillingDraftKey());
    } catch (e) {}
    try { setQuotationQuery(''); } catch (e) {}
    try { setShowQuotationDropdown(false); } catch (e) {}
    try { setHighlightedQuotationIndex(-1); } catch (e) {}
  };


  const addLineItem = () => {
    setNewInvoiceData({
      ...newInvoiceData,
      items: [...newInvoiceData.items, { service: '', description: '', quantity: 1, price: 0 }]
    });
  };

  const removeLineItem = (index) => {
    setNewInvoiceData({
      ...newInvoiceData,
      items: newInvoiceData.items.filter((_, i) => i !== index)
    });
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...newInvoiceData.items];
    if (field === 'quantity') {
      newItems[index][field] = value === '' ? '' : parseInt(value, 10) || 0;
    } else if (field === 'price') {
      newItems[index][field] = value === '' ? '' : parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setNewInvoiceData({ ...newInvoiceData, items: newItems });
  };

  const selectService = (index, serviceName) => {
    // Find matching service from available services (if any)
    const service = availableServices.find(s => s.name === serviceName);
    
    // Always update the service name (allows custom service types)
    // If service is found in available services, use its price; otherwise keep existing price
    const newItems = [...newInvoiceData.items];
    const existingPrice = newItems[index]?.price || 0;
    const newPrice = service ? service.price : existingPrice;
    newItems[index] = { ...newItems[index], service: serviceName, price: newPrice };
    setNewInvoiceData({ ...newInvoiceData, items: newItems });
  };

  const calculateSubtotal = () => {
    return newInvoiceData.items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.price) || 0;
      return sum + (q * p);
    }, 0);
  };

  const calculateAdditionalCharges = () => {
    return (newInvoiceData.additionalCharges || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  };

  // Open WhatsApp chat for the invoice's client phone
  const handleWhatsApp = (invoice) => {
    const phone = (invoice.clientPhone || invoice.client_phone || '').toString();
    if (!phone) {
      showToast('No phone number available for this invoice.');
      return;
    }
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) {
      showToast('No valid phone number available for this invoice.');
      return;
    }
    const message = `Hello ${invoice.clientName || ''}, this is regarding ${company.name || 'Company Name'} invoice ${invoice.id}.\nAmount due: ₹${(invoice.amount || 0).toLocaleString('en-IN')}.\n\n\nPlease contact us if you have any questions.\n\nRegards,\n\n${company.name || 'Company Name'}\n${company.phone ? `Phone: ${company.phone}\n` : ''}${company.email ? `Email: ${company.email}\n` : ''}${company.address ? `Address: ${company.address}` : ''}`;
    const whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
    try { window.open(whatsappUrl, '_blank'); } catch (err) { console.error(err); }
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateAdditionalCharges();
  };

  const addAdditionalCharge = () => {
    setNewInvoiceData({ 
      ...newInvoiceData, 
      additionalCharges: [...(newInvoiceData.additionalCharges || []), { description: '', amount: 0 }] 
    });
  };

  const updateAdditionalCharge = (index, field, value) => {
    const charges = [...(newInvoiceData.additionalCharges || [])];
    if (field === 'amount') {
      charges[index] = { ...charges[index], [field]: value === '' ? '' : (parseFloat(value) || 0) };
    } else {
      charges[index] = { ...charges[index], [field]: value };
    }
    setNewInvoiceData({ ...newInvoiceData, additionalCharges: charges });
  };

  const removeAdditionalCharge = (index) => {
    const charges = (newInvoiceData.additionalCharges || []).filter((_, i) => i !== index);
    setNewInvoiceData({ ...newInvoiceData, additionalCharges: charges });
  };

  

  const handleCreateInvoice = async () => {

    // sanitize inputs before validation
    const clientName = (newInvoiceData.clientName || '').toString().replace(/[^A-Za-z\s]/g, '').trim();
    const clientPhone = (newInvoiceData.clientPhone || '').toString().replace(/\D/g, '');
    const clientEmail = (newInvoiceData.clientEmail || '').toString().trim();

    // Basic validation
    if (!clientName) {
      showToast('Please provide a valid client name (letters and spaces only).');
      return;
    }
    if (!clientPhone) {
      showToast('Please provide a valid client phone (numbers only).');
      return;
    }

    if (clientEmail) {
      // simple email validation
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(clientEmail)) {
        showToast('Please provide a valid email address.');
        return;
      }
    }

    if (newInvoiceData.items.every(item => !item.service)) {
      showToast('Please add at least one service item');
      return;
    }

    const totalAmount = calculateTotal();

    const invoice = {
      id: previewInvoiceId || generateInvoiceId(),
      clientName,
      clientEmail,
      clientPhone,
      services: newInvoiceData.items.map(item => item.service).filter(Boolean),
      items: newInvoiceData.items,
      additionalCharges: newInvoiceData.additionalCharges || [],
      // terms removed from invoice payload
      amount: totalAmount,
      paid: 0,
      issueDate: newInvoiceData.issueDate,
      status: 'pending',
      quotationId: newInvoiceData.quotationId || '',
      showQuotationIdInPdf: useQuotationData,
      showPaymentDetailsInPdf: newInvoiceData.showPaymentDetailsInPdf !== false,
      showQrCodeInPdf: newInvoiceData.showQrCodeInPdf !== false
    };

    // If authenticated, try to persist to backend
    try {
      const token = session.getToken();
      if (token) {
        const resp = await fetch(`${API_BASE_URL}/billing`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(invoice),
        });
        if (resp.ok) {
          const serverInvoice = await resp.json();
          setInvoices([serverInvoice, ...invoices]);
          try { storage.setJSONAndSync(STORAGE_KEYS.INVOICES, [serverInvoice, ...invoices]); } catch (e) {}
          showToast("Invoice created successfully");
        } else {
          // fallback to client-only behavior
          setInvoices([invoice, ...invoices]);
          try { storage.setJSONAndSync(STORAGE_KEYS.INVOICES, [invoice, ...invoices]); } catch (e) {}
        }
      } else {
        // not authenticated — keep client-only behavior
        setInvoices([invoice, ...invoices]);
        try { storage.setJSONAndSync(STORAGE_KEYS.INVOICES, [invoice, ...invoices]); } catch (e) {}
      }
    } catch (e) {
      // network or other error — fallback
      // eslint-disable-next-line no-console
      console.warn('create invoice persist failed', e);
      setInvoices([invoice, ...invoices]);
      try { storage.setJSONAndSync(STORAGE_KEYS.INVOICES, [invoice, ...invoices]); } catch (err) {}
    }

    // Dispatch notification for new invoice if user has enabled it
    if (notifications?.events) {
      try {
        dispatch(addNotification({
          title: 'Invoice created',
          message: `${invoice.id} — ${invoice.clientName || 'No client'}`,
          type: 'info',
          timestamp: new Date().toISOString(),
          path: '/billing',
          data: { openViewId: invoice.id }
        }));
      } catch (e) {}
    }

    setShowCreateModal(false);
    // Clear saved draft for billing create
    try { removeBillingDraftFromSession(makeBillingDraftKey()); } catch (e) {}
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handleDeleteInvoice = async (id) => {
    const ok = await confirm('Are you sure you want to delete this invoice?');
    if (!ok) return;
    try {
      const token = session.getToken();
      if (token) {
        await fetch(`${API_BASE_URL}/billing/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('invoice delete failed', e);
    }

    const next = invoices.filter(inv => inv.id !== id);
    setInvoices(next);
    try { storage.setJSONAndSync(STORAGE_KEYS.INVOICES, next); } catch (e) {}
  };

  const handleDownloadInvoice = (invoice) => {
    try {
      const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [];

      const itemsRows = items.length > 0 ? items.map(it => `
        <tr>
          <td>${(it.service || '')}</td>
          <td>${(it.description || '')}</td>
          <td style="text-align:center">${(it.quantity || '')}</td>
          <td style="text-align:right">₹${(parseFloat(it.price) || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${((parseFloat(it.price) || 0) * (parseFloat(it.quantity) || 0)).toLocaleString('en-IN')}</td>
        </tr>`).join('') : '';

      // Additional charges: each charge on its own row with description in Description column and exact price in Line Total
      const charges = Array.isArray(invoice.additionalCharges) ? invoice.additionalCharges : [];
      const chargesRows = charges.length > 0 ? charges.map(ch => `
        <tr>
          <td></td>
          <td>${(ch.description || 'Additional charge')}</td>
          <td></td>
          <td style="text-align:right"></td>
          <td style="text-align:right">₹${(parseFloat(ch.amount) || 0).toLocaleString('en-IN')}</td>
        </tr>`).join('') : '';

      const itemsSubtotal = items.reduce((s, it) => s + ((parseFloat(it.price) || 0) * (parseFloat(it.quantity) || 0)), 0);
      const chargesTotal = charges.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      const computedTotal = itemsSubtotal + chargesTotal;

      // helper: convert number to words (Indian system)
      const numberToWords = (num) => {
        if (num === 0) return 'zero';
        const a = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
        const b = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

        const inWords = (n) => {
          let str = '';
          if (n >= 10000000) {
            str += inWords(Math.floor(n/10000000)) + ' crore ';
            n = n % 10000000;
          }
          if (n >= 100000) {
            str += inWords(Math.floor(n/100000)) + ' lakh ';
            n = n % 100000;
          }
          if (n >= 1000) {
            str += inWords(Math.floor(n/1000)) + ' thousand ';
            n = n % 1000;
          }
          if (n >= 100) {
            str += inWords(Math.floor(n/100)) + ' hundred ';
            n = n % 100;
          }
          if (n > 0) {
            if (n < 20) {
              str += a[n] + ' ';
            } else {
              str += b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '') + ' ';
            }
          }
          return str.trim();
        };

        return inWords(num).replace(/\s+/g,' ').trim();
      };

      

      // prepare amount in words (rupees and paise)
      const totalInteger = Math.floor(computedTotal);
      const paise = Math.round((computedTotal - totalInteger) * 100);
      const rupeesWords = numberToWords(totalInteger) || 'zero';
      const paiseWords = paise ? numberToWords(paise) : '';
      const amountInWords = `${rupeesWords} rupees${paise ? ' and ' + paiseWords + ' paise' : ''} only`;
      const amountInWordsCap = amountInWords.charAt(0).toUpperCase() + amountInWords.slice(1);

      const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice ${invoice.id}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px}
          h1{color:#6366f1;margin:0 0 8px}
          .invoice-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px }
          .invoice-left { flex:1 }
          .invoice-left p { margin:4px 0; color:#374151 }
          .company-block { width:260px; text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:6px }
          .company-logo { width:64px; height:64px; display:block }
          .company-name { font-weight:700; color:#1f2937 }
          .company-contact { font-size:0.9rem; color:#6b7280 }
          table{width:100%;border-collapse:collapse;margin-top:12px}
          th,td{border:1px solid #ddd;padding:8px}
          th{background:#f3f4f6;text-align:left}
          .right{text-align:right}
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="invoice-left">
            <h1>Invoice ${invoice.id}</h1>
            <p><strong>Client:</strong> ${invoice.clientName || ''}</p>
            <p><strong>Phone:</strong> ${invoice.clientPhone || ''}</p>
            <p><strong>Email:</strong> ${invoice.clientEmail || ''}</p>
            ${invoice.quotationId && invoice.showQuotationIdInPdf ? `<p style="margin-top:0rem;"><strong>Quotation ID:</strong> ${invoice.quotationId}</p>` : ''}
            <p style="margin:0;"><strong>Issue Date:</strong> ${formatDateDisplay(invoice.issueDate) || ''}</p>
          </div>
          <div class="company-block">
            ${company?.logo ? `
            <img src="${company.logo}" alt="Company Logo" class="company-logo" style="width:64px;height:64px;border-radius:4px;object-fit:cover" />
            ` : `
            <div class="company-logo">
              <!-- inline placeholder SVG logo -->
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="4" fill="#6366f1" />
                <path d="M6 12h12" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            `}
            <div class="company-name">${company?.name || 'Company Name'}</div>
            <div class="company-contact">
              ${company?.phone ? `Phone: ${company.phone}<br/>` : ''}
              ${company?.email ? `Email: ${company.email}` : ''}
              ${company?.address ? `<br/>${company.address}` : ''}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Description</th>
              <th>Qty</th>
              <th class="right">Unit</th>
              <th class="right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
            <tr>
              <td colspan="4" style="text-align:right;font-weight:700">Subtotal</td>
              <td style="text-align:right;font-weight:700">₹${itemsSubtotal.toLocaleString('en-IN')}</td>
            </tr>
            ${charges.length > 0 ? `
            <tr>
              <td style="font-weight:700">Additional Charges</td>
            </tr>
            ${chargesRows}
            ` : ''}
            <tr>
              <td colspan="4" style="text-align:right;font-weight:900">Total</td>
              <td style="text-align:right;font-weight:900">₹${computedTotal.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:12px;font-weight:600;text-align:right">Amount (in words): ${amountInWordsCap}</div>

        <!-- Signature blocks -->
        <div style="margin-top:36px; display:flex; gap:24px;">
          <div style="flex:1; text-align:left;">
            <div style="height:72px; border-bottom:1px solid #ddd"></div>
            <div style="margin-top:8px; font-weight:600">Client Signature</div>
            <div style="color:#374151">${invoice.clientSignature || ''}</div>
          </div>
          <div style="flex:1; text-align:right;">
            <div style="height:72px; border-bottom:1px solid #ddd"></div>
            <div style="margin-top:8px; font-weight:600">Authorized Signatory</div>
            <div style="color:#374151">${company?.name || 'Company Name'}</div>
            ${company?.phone ? `<div style="color:#374151; margin-top:4px; font-size:0.95rem">Phone: ${company.phone}</div>` : ''}
            ${company?.email ? `<div style="color:#374151; font-size:0.95rem">Email: ${company.email}</div>` : ''}
          </div>
        </div>
        <br/>
        <br/>
        <br/>
        <br/>

        ${(invoice.showPaymentDetailsInPdf !== false || invoice.showQrCodeInPdf !== false) ? `
        <!-- Payment details: Bank (left) and UPI (right) -->
        <div style="margin-top:24px; display:flex; justify-content:space-between;">
          <div style="width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fafafa;">
            <div style="display:flex; gap:24px; align-items:flex-start; justify-content:space-between;">
          ${invoice.showPaymentDetailsInPdf !== false ? `
          <!-- Bank details -->
          <div style="flex:1; background:#ffffff; padding:12px;">
            <h3 style="margin:0 0 8px; color:#1f2937; font-size:1rem">Payment Details</h3>
            <br/>
            ${bank?.bankName ? `<p style="margin:4px 0"><strong>Bank:</strong> ${bank.bankName}</p>` : ''}
            ${bank?.accountHolder ? `<p style="margin:4px 0"><strong>Account Name:</strong> ${bank.accountHolder}</p>` : ''}
            ${bank?.accountNumber ? `<p style="margin:4px 0"><strong>Account Number:</strong> ${bank.accountNumber}</p>` : ''}
            ${bank?.branch ? `<p style="margin:4px 0"><strong>Branch:</strong> ${bank.branch}</p>` : ''}
            ${bank?.ifsc ? `<p style="margin:4px 0"><strong>IFSC:</strong> ${bank.ifsc}</p>` : ''}
            ${bank?.address ? `<p style="margin:4px 0"><strong>Address:</strong> ${bank.address}</p>` : ''}
            <p style="margin:4px 0"><strong>Note:</strong> After the successful payment, please inform us with the Invoice ID (${invoice.id}) as the payment reference.</p>
          </div>
          ` : ''}

          ${invoice.showQrCodeInPdf !== false ? `
          <!-- UPI details with QR placeholder -->
          <div style="${invoice.showPaymentDetailsInPdf !== false ? 'width:220px' : 'flex:1'}; text-align:center; background:#ffffff; padding:12px; border-radius:6px; border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 8px; color:#1f2937; font-size:1rem">UPI</h3>
            ${bank?.upiId ? `<p style="margin:4px 0; font-weight:600;">UPI ID: ${bank.upiId}</p>` : ''}
            <div style="margin-top:8px; display:flex; justify-content:center;">
              ${bank?.upiQr ? `
              <img src="${bank.upiQr}" alt="UPI QR" style="width:140px;height:140px;border-radius:6px;object-fit:cover;border:1px solid #e5e7eb" />
              ` : ''}
            </div>
            <div style="margin-top:8px; font-size:0.85rem; color:#6b7280">Scan or use the UPI ID to pay</div>
            </div>
          ` : ''}
          </div>
        </div>
        ` : ''}
      </body>
      </html>`;

      const win = window.open('', '_blank');
      if (!win) {
        showToast('Popup blocked. Please allow popups for this site to download the PDF.');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      // Give the new window a moment to render before printing
      setTimeout(() => { try { win.print(); } catch (e) { console.error(e); } }, 500);
    } catch (e) {
      console.error('download error', e);
      showToast('Unable to prepare the invoice for download.');
    }
  };

  const handleSendEmail = (invoice) => {
    try {
      const to = (invoice.clientEmail || '').trim();
      if (!to) {
        showToast('No email address available for this client.');
        return;
      }
      const subject = `${company.name || 'Company Name'} Invoice ${invoice.id}`;
      const amt = parseFloat(invoice.amount) || 0;
      const body = `Hello ${invoice.clientName || ''},\n\nPlease find your invoice ${invoice.id} for ₹${amt.toLocaleString('en-IN')}.\n\nPlease contact us if you have any questions.\n\nRegards,\n\n${company.name || 'Company Name'}\n${company.phone ? `Phone: ${company.phone}\n` : ''}${company.email ? `Email: ${company.email}\n` : ''}${company.address ? `Address: ${company.address}` : ''}`;
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      // Use location.href to open default mail client
      window.location.href = mailto;
    } catch (e) {
      console.error('send email error', e);
      try { window.open('mailto:', '_self'); } catch (err) {}
    }
  };

  const handleSubmitPayment = () => {
    if (selectedInvoice) {
      const amt = parseFloat(paymentData.amount) || 0;
      const newPaidAmount = (selectedInvoice.paid || 0) + amt;
      const newStatus = newPaidAmount >= selectedInvoice.amount ? 'paid' :
                       newPaidAmount > 0 ? 'partial' : selectedInvoice.status;

      const methodLabel = formatPaymentMethod(paymentData.paymentMethod);
      const paymentRecord = {
        amount: amt,
        date: paymentData.paymentDate,
        method: methodLabel,
        reference: paymentData.reference || '',
        notes: paymentData.notes || '',
        recordedAt: new Date().toISOString()
      };

      const updatedInvoices = invoices.map(inv =>
        inv.id === selectedInvoice.id
              ? {
              ...inv,
              paid: newPaidAmount,
              status: newStatus,
              paymentMethod: methodLabel,
              payments: [...(inv.payments || []), paymentRecord]
            }
          : inv
      );

      setInvoices(updatedInvoices);

      // update selectedInvoice in state so the UI reflects the new payment
      setSelectedInvoice(prev => prev ? ({ ...prev, paid: newPaidAmount, status: newStatus, paymentMethod: methodLabel, payments: [...(prev.payments || []), paymentRecord] }) : prev);

      // Persist change to server when authenticated
      (async () => {
        try {
          const token = session.getToken();
          if (token) {
            const payload = {
              paid: newPaidAmount,
              status: newStatus,
              paymentMethod: methodLabel,
              payments: updatedInvoices.find(i => i.id === selectedInvoice.id).payments || []
            };
            await fetch(`${API_BASE_URL}/billing/${encodeURIComponent(selectedInvoice.id)}`, {
              method: 'PUT',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          }
        } catch (e) {
          // Persist failed - UI already updated optimistically. Notify user.
          // eslint-disable-next-line no-console
          console.warn('Failed to persist payment to server', e);
          showToast('Payment recorded locally but failed to save to server.');
        }
      })();

      setShowPaymentModal(false);
    }
  };

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
    { key: 'id', label: 'Invoice ID' },
    { key: 'quotationId', label: 'Quotation ID' },
    { key: 'services', label: 'Services' },
    { key: 'amount', label: 'Amount' },
    { key: 'paid', label: 'Paid' },
    { key: 'balance', label: 'Balance' },
    { key: 'status', label: 'Status' }
  ];

  const getFilteredInvoices = () => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    let filtered = invoices.filter(invoice => {
        // Date range filtering (issueDate in YYYY-MM-DD)
        if (fromDate || toDate) {
          const invDate = invoice.issueDate ? new Date(invoice.issueDate) : null;
          if (!invDate) return false; // exclude when range applied
          if (fromDate) {
            const f = new Date(fromDate);
            f.setHours(0,0,0,0);
            if (invDate < f) return false;
          }
          if (toDate) {
            const t = new Date(toDate);
            t.setHours(23,59,59,999);
            if (invDate > t) return false;
          }
        }

      const clientName = (invoice?.clientName || '').toString().toLowerCase();
      const id = (invoice?.id || '').toString().toLowerCase();
      const issueDate = (invoice?.issueDate || '').toString().toLowerCase();
      const quotationId = (invoice?.quotationId || '').toString().toLowerCase();

      // services may be stored in invoice.services (array) or in items
      const servicesArr = Array.isArray(invoice.services)
        ? invoice.services
        : (Array.isArray(invoice.items) ? invoice.items.map(it => it.service || '') : []);
      const servicesText = servicesArr.join(' ').toLowerCase();

      // Amount numeric comparison helper: allow queries like "5000" or "5,000" or "₹5000"
      const rawAmount = invoice.amount;
      const amountNum = (rawAmount === undefined || rawAmount === null) ? NaN : Number(rawAmount);

      let matchesSearch = false;
      if (!q) {
        matchesSearch = true;
      } else {
        matchesSearch = (
          clientName.includes(q) ||
          id.includes(q) ||
          issueDate.includes(q) ||
          quotationId.includes(q) ||
          servicesText.includes(q)
        );

        // If not matched yet, try numeric match against amount
        if (!matchesSearch) {
          const numericQuery = q.replace(/[^0-9.]/g, '');
          if (numericQuery) {
            const qNum = parseFloat(numericQuery);
            if (!Number.isNaN(qNum) && !Number.isNaN(amountNum)) {
              // exact match or same when rounded to 2 decimals
              if (Math.abs(amountNum - qNum) < 0.001) {
                matchesSearch = true;
              } else {
                // also match if amount contains the digits (helps partial amounts)
                if (String(amountNum).toLowerCase().includes(numericQuery)) matchesSearch = true;
              }
            }
          }
        }
      }

      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        // 'dueDate' removed
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'partial': return '#0ea5e9';
      case 'pending': return '#fbbf24';
      case 'overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <FaCheck />;
      case 'partial': return <FaClock />;
      case 'pending': return <FaClock />;
      case 'overdue': return <FaExclamationTriangle />;
      default: return <FaClock />;
    }
  };

  // Normalize/display payment method labels (accepts codes or labels)
  const formatPaymentMethod = (m) => {
    // Map various possible stored values to one of the allowed methods
    // Allowed method labels: 'Bank Transfer', 'UPI', 'Cash', 'Cheque'
    if (!m) return 'Bank Transfer';
    const key = String(m).toLowerCase().trim();
    if (key.includes('upi')) return 'UPI';
    if (key.includes('cash')) return 'Cash';
    if (key.includes('cheque')) return 'Cheque';
    if (key.includes('bank') || key.includes('transfer') || key.includes('account')) return 'Bank Transfer';
    // Fallback to Bank Transfer to keep only allowed labels
    return 'Bank Transfer';
  };

  const calculateStats = () => {
    const source = getFilteredInvoices();
    return {
      total: source.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0),
      paid: source.reduce((sum, inv) => sum + (parseFloat(inv.paid) || 0), 0),
      pending: source.reduce((sum, inv) => 
        inv.status !== 'paid' ? sum + ((parseFloat(inv.amount) || 0) - (parseFloat(inv.paid) || 0)) : sum, 0
      ),
      overdue: source.filter(inv => inv.status === 'overdue').length
    };
  };

  const stats = calculateStats();
  const filteredInvoices = getFilteredInvoices();

  // Load/dropdown helper: populate dropdownQuotations state from server
  const loadDropdownQuotations = async () => {
    setDropdownQuotationsError('');
    try {
      // Try to fetch from server via storage helper
      const remote = await storage.syncFromServer(STORAGE_KEYS.QUOTATIONS);
      if (Array.isArray(remote)) {
        setDropdownQuotations(remote);
        return;
      }
      setDropdownQuotations([]);
    } catch (e) {
      setDropdownQuotationsError('Could not load quotations');
      console.warn('loadDropdownQuotations: failed', e);
      setDropdownQuotations([]);
    }
  };

  // Simple getter used in JSX to keep previous code paths working
  const getDropdownQuotations = () => dropdownQuotations || [];

  // Pagination logic
  const totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, fromDate, toDate, sortBy, sortOrder]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  };

  const handleExportInvoices = () => {
    try {
      const rows = (Array.isArray(filteredInvoices) && filteredInvoices.length > 0) ? filteredInvoices : invoices;
      if (!rows || rows.length === 0) {
        showToast('No invoices to export');
        return;
      }

      // Build headers: S/N, then place Invoice ID and Quotation ID (if visible),
      // then Client Name/Phone/Email, then remaining visible columns in columnOptions order
      const headers = ['S/N'];
      if (visibleColumns.id) headers.push('Invoice ID');
      if (visibleColumns.quotationId) headers.push('Quotation ID');
      headers.push('Client Name', 'Client Phone', 'Client Email');

      // Append remaining visible columns from columnOptions, skipping id and quotationId
      columnOptions.forEach(col => {
        if (col.key === 'id' || col.key === 'quotationId') return;
        if (visibleColumns[col.key]) headers.push(col.label);
      });

      const esc = (v) => {
        const s = v === undefined || v === null ? '' : String(v);
        return '"' + s.replace(/"/g, '""') + '"';
      };

      const lines = rows.map((inv, idx) => {
        // Start with S/N, then invoice/quotation IDs (if visible), then client info
        const base = [idx + 1];
        if (visibleColumns.id) base.push(inv.id || '');
        if (visibleColumns.quotationId) base.push(inv.quotationId || '');
        base.push(inv.clientName || '', inv.clientPhone || '', inv.clientEmail || '');

        // Append remaining visible columns in columnOptions order (skip id & quotationId)
        columnOptions.forEach(col => {
          if (col.key === 'id' || col.key === 'quotationId') return;
          if (!visibleColumns[col.key]) return;
          switch (col.key) {
            case 'services':
              base.push(Array.isArray(inv.services) ? inv.services.join('; ') : (inv.services || ''));
              break;
            case 'amount':
              base.push(parseFloat(inv.amount) || 0);
              break;
            case 'paid':
              base.push(parseFloat(inv.paid) || 0);
              break;
            case 'balance': {
              const amt = parseFloat(inv.amount) || 0;
              const paid = parseFloat(inv.paid) || 0;
              base.push(amt - paid);
              break;
            }
            case 'status':
              base.push(inv.status || '');
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
      const date = formatDateISO(new Date());
      a.download = `invoices_export_${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('export error', e);
      showToast('Unable to export invoices');
    }
  };

  return (
    <div className="billing">
      {/* Header */}
      <div className="billing__header">
        <div className="billing__title-section">
          <h1 className="billing__title">
            <FaReceipt />
            Billing & Invoices
          </h1>
          <p className="billing__subtitle">
            Manage and track client invoices and payments
          </p>
        </div>
        <div className="billing__header-actions">
          <button
            className="btn-primary billing__export-btn"
            onClick={handleExportInvoices}
            title="Export Invoices"
          >
            <FaShareSquare /> Export
          </button>
          <button
            className="btn-primary"
            onClick={handleOpenCreate}
            title="Create New Bill"
          >
            <FaPlus /> New Bill
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="billing__stats">
        <div className="billing__stat-card">
          <div className="billing__stat-icon billing__stat-icon--indigo">
            <FaReceipt className="billing__stat-svg--indigo" />
          </div>
          <div className="billing__stat-info">
            <h3>{filteredInvoices.length}</h3>
            <p>Total Invoices</p>
          </div>
        </div>
        <div className="billing__stat-card">
          <div className="billing__stat-icon billing__stat-icon--indigo">
            <FaFileInvoiceDollar className="billing__stat-svg--indigo" />
          </div>
          <div className="billing__stat-info">
            <h3>₹{stats.total.toLocaleString('en-IN')}</h3>
            <p>Total Amount</p>
          </div>
        </div>
        <div className="billing__stat-card">
          <div className="billing__stat-icon billing__stat-icon--amber">
            <FaClock className="billing__stat-svg--amber" />
          </div>
          <div className="billing__stat-info">
                <h3>₹{stats.pending.toLocaleString('en-IN')}</h3>
            <p>Pending Payment</p>
          </div>
        </div>
        <div className="billing__stat-card">
          <div className="billing__stat-icon billing__stat-icon--green">
            <FaCheckCircle className="billing__stat-svg--green" />
          </div>
          <div className="billing__stat-info">
                <h3>₹{stats.paid.toLocaleString('en-IN')}</h3>
            <p>Total Paid</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="billing__toolbar">
          <div className="billing__search">
            <FaSearch />
            <input
              type="text"
              placeholder="Search invoices by ID, Name, Date, Quotation ID, Service, or Amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        <div className="billing__toolbar-right">
          <div className="billing__date-range">
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="billing__filter">
            <FaFilter />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          {viewMode === 'table' && (
            <div className="billing__column-selector">
              <button
                ref={billingBtnRef}
                className="billing__column-btn"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                title="Column Preferences"
              >
                <FaColumns />
              </button>
              {showColumnMenu && (
                <div ref={billingMenuRef} className="billing__column-menu">
                  <div className="billing__column-menu-header">
                    <span>Show Columns</span>
                    <button onClick={() => setShowColumnMenu(false)}>
                      <FaTimes />
                    </button>
                  </div>
                  <div className="billing__column-menu-items">
                    <label className="billing__column-menu-item billing__column-menu-item--select-all">
                      <input
                        type="checkbox"
                        checked={isAllColumnsSelected()}
                        onChange={(e) => toggleAllColumns(e.target.checked)}
                      />
                      {isAllColumnsSelected() ? <FaCheckSquare /> : <FaSquare />}
                      <span><strong>Select All</strong></span>
                    </label>
                    <div className="billing__column-menu-divider"></div>
                    {columnOptions.map(column => (
                      <label key={column.key} className="billing__column-menu-item">
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
          <div className="billing__view-toggle">
            <button
              className={`billing__view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <FaList />
            </button>
            <button
              className={`billing__view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FaThLarge />
            </button>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="billing__content">
        {filteredInvoices.length === 0 ? (
          <div className="billing__empty">
            <FaReceipt />
            <h3>No invoices found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="billing__table-container">
            <table className="billing__table">
              <thead>
                <tr>
                  <th className="billing__col-no">No.</th>
                  {visibleColumns.id && <th className="billing__col-id">Invoice ID</th>}
                  {visibleColumns.quotationId && <th className="billing__col-quotation-id">Quotation ID</th>}
                  <th 
                    className="billing__col-client billing__sortable-header"
                    onClick={() => handleSort('name')}
                    
                  >
                    Client {' '}
                    {sortBy === 'name' ? (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                    ) : (
                      <FaSort className="billing__sort-icon--muted" />
                    )}
                  </th>
                  {visibleColumns.services && <th className="billing__col-services">Services</th>}
                  {visibleColumns.amount && (
                    <th 
                      className="billing__col-amount billing__sortable-header"
                      onClick={() => handleSort('amount')}
                      
                    >
                      Amount {' '}
                      {sortBy === 'amount' ? (
                        sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort className="billing__sort-icon--muted" />
                      )}
                    </th>
                  )}
                  {visibleColumns.paid && <th className="billing__col-paid">Paid</th>}
                  {visibleColumns.balance && <th className="billing__col-balance">Balance</th>}
                  {/* dueDate column removed */}
                  {visibleColumns.status && <th className="billing__col-status">Status</th>}
                  <th className="billing__col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInvoices.map((invoice, idx) => (
                  <tr
                    key={invoice.id}
                    onClick={() => handleViewInvoice(invoice)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewInvoice(invoice); }}
                  >
                    <td className="billing__col-no">{idx + 1}</td>
                    {visibleColumns.id && (
                      <td className="billing__col-id">
                        <span className="billing__id"><Highlight text={invoice.id} query={searchQuery} /></span>
                      </td>
                    )}
                    {visibleColumns.quotationId && (
                      <td className="billing__col-quotation-id">
                        <span className="billing__quotation-id"><Highlight text={invoice.quotationId || ''} query={searchQuery} /></span>
                      </td>
                    )}
                    <td className="billing__col-client">
                      <div className="billing__client">
                        <div className="billing__client-info">
                          <div className="billing__client-name"><Highlight text={invoice.clientName} query={searchQuery} /></div>
                          <div className="billing__client-phone"><Highlight text={invoice.clientPhone} query={searchQuery} /></div>
                          <div className="billing__client-email"><Highlight text={invoice.clientEmail} query={searchQuery} /></div>
                        </div>
                      </div>
                    </td>
                    {visibleColumns.services && (
                      <td className="billing__col-services">
                        <div className="billing__services">
                          {invoice.services.slice(0, 2).map((service, idx) => (
                            <span key={idx} className="billing__service-tag">
                              <Highlight text={service} query={searchQuery} />
                            </span>
                          ))}
                          {invoice.services.length > 2 && (
                            <span className="billing__service-more">
                              +{invoice.services.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className="billing__col-amount">
                        <span className="billing__amount">
                          ₹{invoice.amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                    )}
                    {visibleColumns.paid && (
                      <td className="billing__col-paid">
                        <span className="billing__paid">
                          ₹{invoice.paid.toLocaleString('en-IN')}
                        </span>
                      </td>
                    )}
                    {visibleColumns.balance && (
                      <td className="billing__col-balance">
                        <span className="billing__balance">
                          ₹{(invoice.amount - invoice.paid).toLocaleString('en-IN')}
                        </span>
                      </td>
                    )}
                    {/* dueDate column removed */}
                    {visibleColumns.status && (
                      <td className="billing__col-status">
                        <span className={`billing__status billing__status--${invoice.status}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                    )}
                    <td className="billing__col-actions">
                      <div className="billing__actions">
                        <button
                          className="billing__action-btn billing__action-btn--view"
                          onClick={(e) => { e.stopPropagation(); handleViewInvoice(invoice); }}
                          title="View"
                        >
                          <FaEye />
                        </button>
                        {invoice.status !== 'paid' && (
                          <button
                            className="billing__action-btn billing__action-btn--payment"
                            onClick={(e) => { e.stopPropagation(); handleRecordPayment(invoice); }}
                            title="Record Payment"
                          >
                            <FaMoneyBillWave />
                          </button>
                        )}
                        <button
                          className="billing__action-btn billing__action-btn--download"
                          onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(invoice); }}
                          title="Download PDF"
                        >
                          <FaDownload />
                        </button>
                        <button
                          className="billing__action-btn billing__action-btn--whatsapp"
                          title="Send WhatsApp"
                          onClick={(e) => { e.stopPropagation(); handleWhatsApp(invoice); }}
                        >
                          <FaWhatsapp />
                        </button>
                        <button
                          className="billing__action-btn billing__action-btn--email"
                          title="Send Email"
                          onClick={(e) => { e.stopPropagation(); handleSendEmail(invoice); }}
                        >
                          <FaEnvelope />
                        </button>
                        <button
                          className="billing__action-btn billing__action-btn--delete"
                          onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice.id); }}
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
          <div className="billing__grid">
            {paginatedInvoices.map(invoice => (
              <div key={invoice.id} className="billing__card">
                <div className="billing__card-header">
                  <span className="billing__card-id"><Highlight text={invoice.id} query={searchQuery} /></span>
                  <span className={`billing__status billing__status--${invoice.status} billing__status--view`}>
                    {getStatusIcon(invoice.status)}
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </div>
                
                <div className="billing__card-client">
                  <div className="billing__card-client-info">
                    <h3><Highlight text={invoice.clientName} query={searchQuery} /></h3>
                    <p><Highlight text={invoice.clientPhone} query={searchQuery} /></p>
                    <p><Highlight text={invoice.clientEmail} query={searchQuery} /></p>
                  </div>
                </div>

                <div className="billing__card-services">
                  {invoice.services.map((service, idx) => (
                    <span key={idx} className="billing__service-tag">
                      <Highlight text={service} query={searchQuery} />
                    </span>
                  ))}
                </div>

                    <div className="billing__card-amounts">
                  <div className="billing__card-amount-item">
                    <label>Total Amount</label>
                    <span className="billing__amount-value">₹{invoice.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="billing__card-amount-item">
                    <label>Paid</label>
                    <span className="billing__paid-value">₹{invoice.paid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="billing__card-amount-item billing__card-amount-balance">
                    <label>Balance</label>
                    <span className="billing__balance-value">₹{(invoice.amount - invoice.paid).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="billing__card-details">
                  {/* dueDate removed from card details */}
                  {invoice.paymentMethod && (
                    <div className="billing__card-detail">
                      <FaMoneyBillWave />
                      <div>
                        <label>Payment Method</label>
                        <span>{formatPaymentMethod(invoice.paymentMethod)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="billing__card-actions">
                  <button
                    className="billing__action-btn billing__action-btn--view"
                    onClick={() => handleViewInvoice(invoice)}
                    title="View"
                  >
                    <FaEye /> View
                  </button>
                  {invoice.status !== 'paid' && (
                    <button
                      className="billing__action-btn billing__action-btn--payment"
                      onClick={() => handleRecordPayment(invoice)}
                      title="Record Payment"
                    >
                      <FaMoneyBillWave />
                    </button>
                  )}
                  <button
                    className="billing__action-btn billing__action-btn--download"
                    onClick={() => handleDownloadInvoice(invoice)}
                    title="Download PDF"
                  >
                    <FaDownload />
                  </button>
                  <button
                    className="billing__action-btn billing__action-btn--whatsapp"
                    title="Send WhatsApp"
                    onClick={() => handleWhatsApp(invoice)}
                  >
                    <FaWhatsapp />
                  </button>
                  <button
                    className="billing__action-btn billing__action-btn--email"
                    title="Send Email"
                    onClick={() => handleSendEmail(invoice)}
                  >
                    <FaEnvelope />
                  </button>
                  <button
                    className="billing__action-btn billing__action-btn--delete"
                    onClick={() => handleDeleteInvoice(invoice.id)}
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
      {filteredInvoices.length > 0 && (
        <div className="billing__pagination">
          <div className="billing__pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredInvoices.length)} of {filteredInvoices.length} invoices
          </div>
          <div className="billing__pagination-controls">
            <div className="billing__pagination-rows">
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
            <div className="billing__pagination-buttons">
              <button
                className="billing__pagination-btn"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <FaAngleDoubleLeft />
              </button>
              <button
                className="billing__pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <FaAngleLeft />
              </button>
              <div className="billing__pagination-pages">
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
                        className="billing__pagination-btn"
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="ellipsis1" className="billing__pagination-ellipsis">...</span>);
                    }
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`billing__pagination-btn ${currentPage === i ? 'active' : ''}`}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    );
                  }

                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="ellipsis2" className="billing__pagination-ellipsis">...</span>);
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        className="billing__pagination-btn"
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
                className="billing__pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <FaAngleRight />
              </button>
              <button
                className="billing__pagination-btn"
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

      {/* Record Payment Modal (render children only when selectedInvoice exists) */}
      {showPaymentModal && selectedInvoice && (
        <Modal
          isOpen={true}
          title={`Record Payment - ${selectedInvoice.id}`}
          onClose={() => setShowPaymentModal(false)}
        >
          <div className="billing__payment-form">
            <div className="billing__payment-summary">
              <div className="billing__payment-summary-row">
                <span>Total Amount:</span>
                <span>₹{selectedInvoice.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="billing__payment-summary-row">
                <span>Already Paid:</span>
                <span className="billing__payment-paid">₹{selectedInvoice.paid.toLocaleString('en-IN')}</span>
              </div>
              <div className="billing__payment-summary-row billing__payment-summary-balance">
                <span>Outstanding Balance:</span>
                <span>₹{(selectedInvoice.amount - selectedInvoice.paid).toLocaleString('en-IN')}</span>
              </div>
            </div>

              <div className="billing__form-group">
              <label>Payment Amount (₹) *</label>
              <input
                type="text"
                inputMode="decimal"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="billing__form-group">
              <label>Payment Method *</label>
              <select
                value={paymentData.paymentMethod}
                onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="billing__form-group">
              <label>Payment Date *</label>
              <input
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
              />
            </div>

            <div className="billing__form-group">
              <label>Reference Number</label>
              <input
                type="text"
                placeholder="Transaction ID, Check number, etc."
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
              />
            </div>

            <div className="billing__form-group">
              <label>Notes</label>
              <textarea
                placeholder="Additional payment notes"
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="billing__form-actions">
              <button className="btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmitPayment}
                disabled={!paymentData.amount || paymentData.amount <= 0}
              >
                <FaCheck /> Record Payment
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          title="Create Invoice"
          onClose={() => { saveBillingDraftToSession(BILLING_DRAFT_KEY); setShowCreateModal(false); }}
          size="large"
          headerActions={
            <button
              type="button"
              className="btn-secondary"
              onClick={(e) => { e.stopPropagation && e.stopPropagation(); handleResetCreateForm(); }}
              title="Reset form"
            >
              Reset
            </button>
          }
        >
          <div className="billing__form">
            <div className="billing__form-section">
              <div className="billing__form-row billing__form-row--3col">
                <div className="billing__form-group">
                  <label>Invoice ID</label>
                  <input type="text" readOnly value={previewInvoiceId || ''} />
                </div>
                <div className="billing__form-group">
                  <div className="billing__label-with-checkbox">
                    <label>Quotation ID</label>
                    <label className="billing__checkbox-label">
                      <input
                        type="checkbox"
                        checked={useQuotationData}
                        onChange={(e) => setUseQuotationData(e.target.checked)}
                      />
                      <span>Show in PDF</span>
                    </label>
                  </div>
                  {(() => {
                    const allDropdown = getDropdownQuotations() || [];
                    const hasList = Array.isArray(allDropdown) && allDropdown.length > 0;

                    if (hasList) {
                      const filtered = allDropdown.filter(q => {
                        const label = String(q.id || q.quotationId || q.ref) + (q.clientName ? ' - ' + q.clientName : '');
                        return label.toLowerCase().includes((quotationQuery || '').toLowerCase());
                      });

                      // derive display value: if a quotationId already selected and query empty, show its label
                      const selectedLabel = (() => {
                        if (quotationQuery) return quotationQuery;
                        if (newInvoiceData.quotationId) {
                          const found = allDropdown.find(x => String(x.id || x.quotationId || x.ref) === String(newInvoiceData.quotationId));
                          if (found) return String(found.id || found.quotationId || found.ref) + (found.clientName ? ' - ' + found.clientName : '');
                        }
                        return '';
                      })();

                      return (
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={quotationInputRef}
                            className="billing__quotation-input"
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
                            <ul className="billing__quotation-dropdown" style={{ position: 'absolute', zIndex: 40, top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 220, overflow: 'auto', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 0, margin: 0, listStyle: 'none' }}>
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

                            {/* Clear / Cancel button */}
                            {(quotationQuery || newInvoiceData.quotationId) && (
                              <button
                                type="button"
                                className="billing__quotation-clear"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setQuotationQuery('');
                                  setNewInvoiceData(getEmptyInvoiceData());
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
                    }

                    return (
                        <div className="billing__quotation-empty-state">
                          <div className="billing__quotation-empty-message">No quotations available</div>
                        </div>
                      );
                  })()}

                </div>
                <div className="billing__form-group">
                  <label>Issue Date</label>
                  <input
                    type="date"
                    value={newInvoiceData.issueDate}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, issueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="billing__form-row billing__form-row--3col">
                <div className="billing__form-group">
                  <label>Client Name *</label>
                  <input
                    type="text"
                    placeholder="Enter client name"
                    value={newInvoiceData.clientName}
                    // allow letters and spaces only
                    onChange={(e) => {
                      const filtered = (e.target.value || '').replace(/[^A-Za-z\s]/g, '');
                      setNewInvoiceData({ ...newInvoiceData, clientName: filtered });
                    }}
                    pattern="[A-Za-z ]+"
                  />
                </div>
                <div className="billing__form-group">
                    <label>Client Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter numbers only"
                    value={newInvoiceData.clientPhone}
                    // allow digits only
                    onChange={(e) => {
                      const digits = (e.target.value || '').toString().replace(/\D/g, '');
                      setNewInvoiceData({ ...newInvoiceData, clientPhone: digits });
                    }}
                  />
                </div>
                <div className="billing__form-group">
                    <label>Client Email</label>
                  <input
                    type="email"
                    placeholder="client@email.com"
                    value={newInvoiceData.clientEmail}
                    onChange={(e) => setNewInvoiceData({ ...newInvoiceData, clientEmail: (e.target.value || '').trim() })}
                  />
                </div>
              </div>
            </div>

            <div className="billing__form-section">
              <div className="billing__form-section-header">
                <h3>Services</h3>
                <button className="btn-secondary" onClick={addLineItem} type="button">
                  <FaPlus /> Add Item
                </button>
              </div>

              {newInvoiceData.items.map((item, index) => (
                <div key={index} className="billing__line-item">
                  {/* Remove button - positioned in top right corner */}
                  {newInvoiceData.items.length > 1 && (
                    <button
                      className="billing__remove-item"
                      onClick={() => removeLineItem(index)}
                      title="Remove item"
                      type="button"
                    >
                      <FaTimes />
                    </button>
                  )}

                  {/* Service field - full width row */}
                  <div className="billing__line-item-row billing__line-item-row--service">
                    <div className="billing__form-group billing__form-group--wide">
                      <label>Service</label>
                      <ServiceTypeInput
                        value={item.service || ''}
                        onChange={(val) => selectService(index, val)}
                        availableServices={availableServices}
                      />
                    </div>
                  </div>

                  {/* Quantity, Price, Total row */}
                  <div className="billing__line-item-row billing__line-item-row--details">
                    <div className="billing__form-group">
                      <label>Quantity</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="billing__form-group">
                      <label>Price (₹)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*\.?[0-9]*"
                        value={item.price}
                        onChange={(e) => updateLineItem(index, 'price', e.target.value)}
                      />
                    </div>
                    <div className="billing__form-group">
                      <label>Total</label>
                      <div className="billing__line-total">
                        ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Description - always shown below */}
                  <div className="billing__form-group">
                    <label>Description (optional)</label>
                    <input
                      type="text"
                      placeholder="Additional details about this service"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <div className="billing__summary">
                <div className="billing__summary-row">
                  <span>Subtotal:</span>
                  <span>₹{calculateSubtotal().toLocaleString('en-IN')}</span>
                </div>

                {/* Additional Charges */}
                {(newInvoiceData.additionalCharges || []).length > 0 && (
                  <div className="billing__additional-charges">
                    {(newInvoiceData.additionalCharges || []).map((c, i) => (
                      <div key={i} className="billing__charge-row">
                        <div className="billing__form-group billing__charge-desc billing__charge-desc--flex1">
                          <label>Charge</label>
                          <input
                            type="text"
                            placeholder="Charge description"
                            value={c.description}
                            onChange={(e) => updateAdditionalCharge(i, 'description', e.target.value)}
                          />
                        </div>

                        <div className="billing__form-group billing__charge-amount billing__charge-amount--fixed">
                          <label>Amount</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*\.?[0-9]*"
                            value={c.amount}
                            onChange={(e) => updateAdditionalCharge(i, 'amount', e.target.value)}
                          />
                        </div>

                        <div className="billing__charge-actions">
                          <button 
                            type="button" 
                            onClick={() => removeAdditionalCharge(i)} 
                            className="billing__remove-item" 
                            aria-label="Remove charge"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="billing__add-charge-row">
                  <button type="button" onClick={addAdditionalCharge} className="btn-secondary">
                    + Add Charge
                  </button>
                </div>

                <div className="billing__summary-row billing__summary-total">
                  <span>Total:</span>
                  <span>₹{calculateTotal().toLocaleString('en-IN')}</span>
                </div>

                {/* Terms removed from billing form */}
              </div>

              {/* PDF Options */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={newInvoiceData.showPaymentDetailsInPdf !== false}
                      onChange={(e) => setNewInvoiceData({ ...newInvoiceData, showPaymentDetailsInPdf: e.target.checked })}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    Show Payment Details in PDF
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={newInvoiceData.showQrCodeInPdf !== false}
                      onChange={(e) => setNewInvoiceData({ ...newInvoiceData, showQrCodeInPdf: e.target.checked })}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    Show QR Code in PDF
                  </label>
                </div>
            </div>

            <div className="billing__form-actions">
              <button
                className="btn-secondary"
                onClick={() => {
                  try { saveBillingDraftToSession(makeBillingDraftKey()); } catch (e) {}
                  try { setShowCreateModal(false); } catch (e) {}
                  try { showToast('⚠️ your form saved temporarily, please complete and submit soon.'); } catch (e) {}
                }}
                type="button"
              >
                Save Draft
              </button>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)} type="button">
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleCreateInvoice}
                disabled={!newInvoiceData.clientName || !newInvoiceData.clientPhone || newInvoiceData.items.every(item => !item.service)}
                type="button"
              >
                <FaCheck /> Create Invoice
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Invoice Modal (render children only when selectedInvoice exists) */}
      {showViewModal && selectedInvoice && (
        <Modal
          isOpen={true}
          title={`Invoice ${selectedInvoice.id}`}
          onClose={() => setShowViewModal(false)}
        >
          <div className="billing__invoice-view">
            <div className="billing__invoice-header">
              <div className="billing__invoice-client">
                <h3>{selectedInvoice.clientName}</h3>
                <p>{selectedInvoice.clientPhone}</p>
                <p>{selectedInvoice.clientEmail}</p>
              </div>
              <span className={`billing__status billing__status--${selectedInvoice.status} billing__status--view`}>
                {getStatusIcon(selectedInvoice.status)}
                {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
              </span>
            </div>

            <div className="billing__invoice-section">
              <div className="billing__invoice-row">
                <div>
                  <label>Issue Date:</label>
                  <span>{formatDateDisplay(selectedInvoice.issueDate)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <label>Quotation ID:</label>
                  <span>{selectedInvoice.quotationId}</span>
                </div>
              </div>
            </div>

            <div className="billing__invoice-section">
              <h4>Services</h4>
              <ul className="billing__invoice-services">
                {selectedInvoice.services.map((service, idx) => (
                  <li key={idx}>{service}</li>
                ))}
              </ul>
            </div>

            <div className="billing__invoice-section">
              <div className="billing__invoice-totals">
                <div className="billing__invoice-total-row">
                  <span>Total Amount:</span>
                  <span>₹{selectedInvoice.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="billing__invoice-total-row">
                  <span>Amount Paid:</span>
                  <span className="billing__payment-paid">₹{selectedInvoice.paid.toLocaleString('en-IN')}</span>
                </div>
                <div className="billing__invoice-total-row billing__invoice-total-balance">
                  <span>Balance Due:</span>
                  <span>₹{(selectedInvoice.amount - selectedInvoice.paid).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="billing__invoice-section">
              <h4>Repayment History</h4>
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                <ul className="billing__repayment-history">
                  {selectedInvoice.payments.slice().reverse().map((p, idx) => (
                    <li key={idx} className="billing__repayment-item">
                      <div className="billing__repayment-row">
                        <span className="billing__repayment-amount">₹{(parseFloat(p.amount) || 0).toLocaleString('en-IN')}</span>
                        <span className="billing__repayment-date">{formatDateDisplay(p.date || p.recordedAt || p.paymentDate)}</span>
                      </div>
                      <div className="billing__repayment-meta">
                        <span className="billing__repayment-method">{formatPaymentMethod(p.method || p.paymentMethod)}</span>
                        {p.reference && <span className="billing__repayment-ref">Ref: {p.reference}</span>}
                        {p.notes && <span className="billing__repayment-notes">{p.notes}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No payments recorded yet.</p>
              )}
            </div>

            <div className="billing__invoice-actions">
              {selectedInvoice.status !== 'paid' && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setShowViewModal(false);
                    handleRecordPayment(selectedInvoice);
                  }}
                >
                  <FaMoneyBillWave /> Record Payment
                </button>
              )}
              <button className="btn-secondary" onClick={() => handleDownloadInvoice(selectedInvoice)}>
                <FaDownload /> Download PDF
              </button>
              <button className="btn-secondary" onClick={() => handleSendEmail(selectedInvoice)}>
                <FaEnvelope /> Send Email
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Billing;
