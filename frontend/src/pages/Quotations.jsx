import React, { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  FaFileInvoiceDollar,
  FaPlus,
  FaEye,
  FaEdit,
  FaTrash,
  FaDownload,
  FaShareSquare,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaClock,
  FaCheck,
  FaTimes,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaFilter,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaThLarge,
  FaList,
  FaColumns,
  FaCheckSquare,
  FaSquare,
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa';
import Modal from '../components/Modal/Modal';
import { storage } from '../utils/storage';
import { addNotification } from '../redux/slices/uiSlice';
import { showToast } from '../utils/toast';
import useConfirm from '../hooks/useConfirm';
import Highlight from '../utils/Highlight';
import { STORAGE_KEYS, APP_NAME, API_BASE_URL } from '../utils/constants';
import session from '../utils/session';
import './Quotations.scss';
import ServiceTypeInput from '../components/ServiceTypeInput/ServiceTypeInput';


import { formatDateDisplay, formatDateISO } from '../utils/date';
import generateQuotationId from '../utils/quotationId';

// Draft key for quotations form (session-only)
const QUOTATION_DRAFT_KEY = 'photoflow_quotation_draft';

const Quotations = () => {
  // Get company and bank details from Redux settings
  const { company, bank, notifications } = useSelector((state) => state.settings);
  
  // Initialize with empty array - data will be loaded from server only
  const [quotations, setQuotations] = useState([]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [editingQuotationId, setEditingQuotationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  // Date range filter for quotations (YYYY-MM-DD)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'amount'
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
    number: true,
    id: true,
    services: true,
    amount: true,
    date: true,
    mainEventDate: true,
    status: true
  });

  // Refs for column menu and toggle button to detect outside clicks
  const columnMenuRef = useRef(null);
  const columnBtnRef = useRef(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    services: [],
    items: [{ service: '', description: '', quantity: 1, price: 0 }],
    additionalCharges: [], // { description: '', amount: 0 }
    terms: [], // array of selected term strings
    showEventDateInPdf: true, // checkbox to show/hide event date in PDF
    showTermsInPdf: true, // checkbox to show/hide terms in PDF
    showPaymentDetailsInPdf: true, // checkbox to show/hide payment details in PDF
    showQrCodeInPdf: true // checkbox to show/hide QR code in PDF
  });

  // available services loaded from Services page (persisted); start empty (no sample data)
  const [availableServices, setAvailableServices] = useState([]);
  
  // Load policies - will be fetched from database via API
  const [groupedPolicies, setGroupedPolicies] = useState({});
  const confirm = useConfirm();

  useEffect(() => {
    let mounted = true;

    (async () => {
      // Try local/persisted first (may be noop depending on storage implementation)
      try {
        const persisted = storage.getJSON(STORAGE_KEYS.SERVICES, null);
        if (Array.isArray(persisted) && persisted.length > 0) {
          const mapped = persisted.map(s => ({ id: s.id, name: s.name, price: Number(s.basePrice) || Number(s.price) || 0 }));
          setAvailableServices(mapped);
        }
      } catch (e) {
        // ignore and continue to try server
      }

      // Try to fetch services from server (preferred when authenticated)
      try {
        const remoteServices = await storage.syncFromServer(STORAGE_KEYS.SERVICES);
        if (mounted && Array.isArray(remoteServices) && remoteServices.length > 0) {
          const mapped = remoteServices.map(s => ({ id: s.id, name: s.name, price: Number(s.basePrice) || Number(s.price) || 0 }));
          setAvailableServices(mapped);
        }
      } catch (e) {
        // ignore - fallback to persisted or empty
      }

      // Policies: local first
      try {
        const policies = storage.getJSON(STORAGE_KEYS.POLICY, []);
        if (Array.isArray(policies) && policies.length > 0) {
          const grouped = {};
          policies.forEach(policy => {
            const group = policy.group || "Uncategorized";
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(policy);
          });
          setGroupedPolicies(grouped);
        }
      } catch (e) {
        // ignore and continue to try server
      }

      // Try to fetch policies from server
      try {
        const remotePolicies = await storage.syncFromServer(STORAGE_KEYS.POLICY);
        if (mounted && Array.isArray(remotePolicies) && remotePolicies.length > 0) {
          const grouped = {};
          remotePolicies.forEach(policy => {
            const group = policy.group || "Uncategorized";
            if (!grouped[group]) grouped[group] = [];
            grouped[group].push(policy);
          });
          setGroupedPolicies(grouped);
        }
      } catch (e) {
        // ignore
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

  // Support opening a specific quotation when a notification is clicked while already on the page
  useEffect(() => {
    const handler = (ev) => {
      try {
        const detail = ev && ev.detail ? ev.detail : null;
        if (!detail || detail.path !== '/quotations') return;
        const state = detail.state || {};
        if (state.openCreate) {
          handleCreateQuotation();
        }
        if (state.openViewId) {
          const idToOpen = state.openViewId;
          const q = quotations.find(qt => qt.id === idToOpen);
          if (q) {
            handleViewQuotation(q);
          } else {
            pendingOpenRef.current = idToOpen;
          }
        }
      } catch (e) {}
    };
    window.addEventListener('ui:notification', handler);
    return () => window.removeEventListener('ui:notification', handler);
  }, [quotations]);

  // Close column menu when clicking outside (but ignore clicks on the toggle button)
  useEffect(() => {
    function handleOutsideClick(e) {
      if (!showColumnMenu) return;
      const target = e.target;
      if (columnMenuRef.current && columnMenuRef.current.contains(target)) return;
      if (columnBtnRef.current && columnBtnRef.current.contains(target)) return;
      setShowColumnMenu(false);
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showColumnMenu]);

  // Load quotations from server only - no localStorage sync
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = session.getToken();
        if (!token) return;
        
        const resp = await fetch(`${API_BASE_URL}/quotations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const remote = await resp.json();
          if (mounted && Array.isArray(remote)) {
            setQuotations(remote);
          }
        }
      } catch (e) {
        console.warn('Failed to load quotations', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleCreateQuotation = () => {
    const defaultData = getDefaultFormData();

    // If there's a saved draft, load that draft into the form instead of the blank form
    const draft = loadQuotationDraftFromSession(QUOTATION_DRAFT_KEY);
    if (draft && typeof draft === 'object' && draft.formData) {
      setFormData({ ...defaultData, ...draft.formData });
    } else {
      setFormData(defaultData);
    }
    setEditingQuotationId(null);
    setShowCreateModal(true);
  };

  const handleEditFromView = (quotation) => {
    // Prefill formData for editing. If items were not saved on the original quotation,
    // reconstruct items from services with default qty=1 and price from availableServices if available.
    const items = (quotation.items && quotation.items.length > 0)
      ? quotation.items
      : (quotation.services || []).map(svc => {
          const srv = availableServices.find(s => s.name === svc) || {};
          return { service: svc, description: '', quantity: 1, price: srv.price || 0 };
        });

    const defaults = getDefaultFormData();
    setFormData({
      ...defaults,
      clientName: quotation.clientName || '',
      clientEmail: quotation.clientEmail || '',
      clientPhone: quotation.clientPhone || '',
      services: quotation.services || [],
      items,
      additionalCharges: quotation.additionalCharges || [],
      terms: quotation.terms || [],
      // Preserve event date and PDF visibility when editing
      mainEventDate: quotation.mainEventDate || '',
      showEventDateInPdf: quotation.showEventDateInPdf || false,
      showTermsInPdf: quotation.showTermsInPdf !== false,
      showPaymentDetailsInPdf: quotation.showPaymentDetailsInPdf !== false,
      showQrCodeInPdf: quotation.showQrCodeInPdf !== false,
      date: quotation.date || ''
    });
    setEditingQuotationId(quotation.id);
    setShowViewModal(false);
    setShowCreateModal(true);
  };

  const handleViewQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };

  const handleDeleteQuotation = async (id) => {
    const ok = await confirm('Are you sure you want to delete this quotation?');
    if (!ok) return;
    try {
      const token = session.getToken();
      if (token) {
        // Try to delete on server; fire-and-wait so it does not reappear on refresh
        await fetch(`${API_BASE_URL}/quotations/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {
      // ignore network errors; we'll still update UI optimistically
      // eslint-disable-next-line no-console
      console.warn('quotation delete failed', e);
    }

    const next = quotations.filter(q => q.id !== id);
    setQuotations(next);
  };

  const handleWhatsApp = (quotation) => {
    try {
      let phone = (quotation.clientPhone || '').toString().replace(/\D/g, '');
      if (!phone) {
        showToast('No phone number available for this client.');
        return;
      }
      // If a 10-digit number is provided, assume India country code (based on currency in UI)
      if (phone.length === 10) phone = '91' + phone;
      const amt = parseFloat(quotation.totalAmount) || 0;
      const message = `Hello ${quotation.clientName || ''}, here is your quotation ${quotation.id} for ₹${amt.toLocaleString('en-IN')}.\n\n\nPlease contact us if you have any questions.\n\nRegards,\n\n${company.name || 'Company Name'}\n${company.phone ? `Phone: ${company.phone}\n` : ''}${company.email ? `Email: ${company.email}\n` : ''}${company.address ? `Address: ${company.address}` : ''}`;
    // const whatsappUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } catch (e) {
      // fallback: open wa.me without prefilled text
      try { window.open('https://web.whatsapp.com/', '_blank'); } catch (err) { console.error(err); }
    }
  };

  const handleSendEmail = (quotation) => {
    try {
      const to = (quotation.clientEmail || '').trim();
      if (!to) {
        showToast('No email address available for this client.');
        return;
      }
      const subject = `Quotation ${quotation.id}`;
      const amt = parseFloat(quotation.totalAmount) || 0;
      const body = `Hello ${quotation.clientName || ''},\n\nPlease find your quotation ${quotation.id} for ₹${amt.toLocaleString('en-IN')}.\n\n\nPlease contact us if you have any questions.\n\nRegards,\n\n${company.name || 'Company Name'}\n${company.phone ? `Phone: ${company.phone}\n` : ''}${company.email ? `Email: ${company.email}\n` : ''}${company.address ? `Address: ${company.address}` : ''}`;
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      // Use location.href to open default mail client
      window.location.href = mailto;
    } catch (e) {
      console.error('send email error', e);
      try { window.open('mailto:', '_self'); } catch (err) {}
    }
  };

  const handleDownloadQuotation = (quotation) => {
    try {
  // Only consider items that have a service name
  const items = Array.isArray(quotation.items) ? quotation.items.filter(it => it && it.service && it.service.toString().trim() !== '') : [];

      const itemsRows = items.length > 0 ? items.map(it => `
        <tr>
          <td>${(it.service || '')}</td>
          <td>${(it.description || '')}</td>
          <td style="text-align:center">${(it.quantity || '')}</td>
          <td style="text-align:right">₹${(parseFloat(it.price) || 0).toLocaleString('en-IN')}</td>
          <td style="text-align:right">₹${((parseFloat(it.price) || 0) * (parseFloat(it.quantity) || 0)).toLocaleString('en-IN')}</td>
        </tr>`).join('') : '';

      // Additional charges: each charge on its own row with description in Description column and exact price in Line Total
      const charges = Array.isArray(quotation.additionalCharges) ? quotation.additionalCharges : [];
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
        <title>Quotation ${quotation.id}</title>
        <style>
          body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:24px}
          h1{color:#6366f1;margin:0 0 8px}
          .quote-header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px }
          .quote-left { flex:1 }
          .quote-left p { margin:4px 0; color:#374151 }
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
        <div class="quote-header">
          <div class="quote-left">
            <h1>Quotation ${quotation.id}</h1>
            <p><strong>Client:</strong> ${quotation.clientName || ''}</p>
            <p><strong>Phone:</strong> ${quotation.clientPhone || ''}</p>
            <p><strong>Email:</strong> ${quotation.clientEmail || ''}</p>
            <p><strong>Date:</strong> ${formatDateDisplay(quotation.date) || ''}</p>
            ${quotation.showEventDateInPdf && quotation.mainEventDate ? `<p><strong>Main Event Date:</strong> ${formatDateDisplay(quotation.mainEventDate)}</p>` : ''}
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
        
        ${(quotation.showTermsInPdf !== false && quotation.terms && quotation.terms.length > 0) ? `
        <div style="margin-top:24px">
          <h3 style="font-size:1.1rem;color:#1f2937;margin:0 0 8px">Terms & Conditions</h3>
          <ul style="margin:0;padding-left:20px;color:#374151">
            ${quotation.terms.map(term => `<li style="margin-bottom:4px">${term}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <!-- Signature blocks -->
        <div style="margin-top:36px; display:flex; gap:24px;">
          <div style="flex:1; text-align:left;">
            <div style="height:72px; border-bottom:1px solid #ddd"></div>
            <div style="margin-top:8px; font-weight:600">Client Signature</div>
            <div style="color:#374151">${quotation.clientSignature || ''}</div>
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

        ${(quotation.showPaymentDetailsInPdf !== false || quotation.showQrCodeInPdf !== false) ? `
        <!-- Payment details: Bank (left) and UPI (right) -->
        <div style="margin-top:24px; display:flex; justify-content:space-between;">
          <div style="width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:12px; background:#fafafa;">
            <div style="display:flex; gap:24px; align-items:flex-start; justify-content:space-between;">
          ${quotation.showPaymentDetailsInPdf !== false ? `
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
            <p style="margin:4px 0"><strong>Note:</strong> After the successful payment, please inform us with the Quotation ID (${quotation.id}) as the payment reference.</p>
          </div>
          ` : ''}

          ${quotation.showQrCodeInPdf !== false ? `
          <!-- UPI details with QR placeholder -->
          <div style="${quotation.showPaymentDetailsInPdf !== false ? 'width:220px' : 'flex:1'}; text-align:center; background:#ffffff; padding:12px; border-radius:6px; border:1px solid #e5e7eb;">
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
      showToast('Unable to prepare the quotation for download.');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    // Persist status change to server when authenticated
    try {
      const token = session.getToken();
      if (token) {
        const resp = await fetch(`${API_BASE_URL}/quotations/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (resp.ok) {
          // Update local state only after successful server update
          const next = quotations.map(q => q.id === id ? { ...q, status: newStatus } : q);
          setQuotations(next);
        } else {
          showToast('Failed to update status on server.');
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to persist quotation status', e);
      showToast('Failed to update status on server.');
    }
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { service: '', description: '', quantity: 1, price: 0 }]
    });
  };

  const removeLineItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateLineItem = (index, field, value) => {
    // Use functional update to avoid stale closures and append a blank row
    setFormData(prev => {
      const items = Array.isArray(prev.items) ? [...prev.items] : [];
      // Ensure the target index exists
      while (items.length <= index) {
        items.push({ service: '', description: '', quantity: 1, price: 0 });
      }

      // Allow temporary empty strings while the user types, but store numbers when possible
      if (field === 'quantity') {
        items[index][field] = value === '' ? '' : parseInt(value, 10) || 0;
      } else if (field === 'price') {
        items[index][field] = value === '' ? '' : parseFloat(value) || 0;
      } else {
        items[index][field] = value;
      }

      // If user filled the service field on the last row, append one empty row
      if (field === 'service') {
        const justFilled = value && value.toString().trim() !== '';
        const wasLastRow = index === items.length - 1;
        if (justFilled && wasLastRow) {
          items.push({ service: '', description: '', quantity: 1, price: 0 });
        }
      }

      return { ...prev, items };
    });
  };

  const selectService = (index, serviceName) => {
    // Find matching service from available services (if any)
    const service = availableServices.find(s => s.name === serviceName);

    // Set service name and price (use matched price if found, otherwise keep existing or default to 0)
    setFormData(prev => {
      const items = Array.isArray(prev.items) ? [...prev.items] : [];
      while (items.length <= index) {
        items.push({ service: '', description: '', quantity: 1, price: 0 });
      }
      const prevService = items[index].service;
      const existingPrice = items[index].price || 0;
      // Use the matched service price if found, otherwise keep existing price for custom services
      const newPrice = service ? service.price : existingPrice;
      items[index] = { ...items[index], service: serviceName, price: newPrice };

      const justFilled = serviceName && serviceName.toString().trim() !== '';
      const wasLastRow = index === items.length - 1;
      // Only append when the row was previously empty (no service) and now filled
      if (justFilled && wasLastRow && (!prevService || prevService.toString().trim() === '')) {
        items.push({ service: '', description: '', quantity: 1, price: 0 });
      }

      return { ...prev, items };
    });
  };

  const calculateSubtotal = () => {
    // Only include line items that have a non-empty service name
    return (Array.isArray(formData.items) ? formData.items : []).filter(it => it && it.service && it.service.toString().trim() !== '').reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.price) || 0;
      return sum + (q * p);
    }, 0);
  };
  const calculateAdditionalCharges = () => {
    return (formData.additionalCharges || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateAdditionalCharges();
  };

  const addAdditionalCharge = () => {
    setFormData({ ...formData, additionalCharges: [...(formData.additionalCharges || []), { description: '', amount: 0 }] });
  };

  const updateAdditionalCharge = (index, field, value) => {
    const charges = [...(formData.additionalCharges || [])];
    if (field === 'amount') {
      charges[index] = { ...charges[index], [field]: value === '' ? '' : (parseFloat(value) || 0) };
    } else {
      charges[index] = { ...charges[index], [field]: value };
    }
    setFormData({ ...formData, additionalCharges: charges });
  };

  const removeAdditionalCharge = (index) => {
    const charges = (formData.additionalCharges || []).filter((_, i) => i !== index);
    setFormData({ ...formData, additionalCharges: charges });
  };

  // Handle term selection/deselection
  const handleTermToggle = (termContent) => {
    const currentTerms = formData.terms || [];
    if (currentTerms.includes(termContent)) {
      // Remove term
      setFormData({ ...formData, terms: currentTerms.filter(t => t !== termContent) });
    } else {
      // Add term
      setFormData({ ...formData, terms: [...currentTerms, termContent] });
    }
  };

  // Select all terms in a group
  const handleSelectGroup = (groupName, selectAll) => {
    const currentTerms = formData.terms || [];
    const groupTerms = (groupedPolicies[groupName] || []).map(p => p.content);
    
    if (selectAll) {
      // Add all group terms that aren't already selected
      const newTerms = [...new Set([...currentTerms, ...groupTerms])];
      setFormData({ ...formData, terms: newTerms });
    } else {
      // Remove all group terms
      const newTerms = currentTerms.filter(t => !groupTerms.includes(t));
      setFormData({ ...formData, terms: newTerms });
    }
  };

  // Check if all terms in a group are selected
  const isGroupFullySelected = (groupName) => {
    const currentTerms = formData.terms || [];
    const groupTerms = (groupedPolicies[groupName] || []).map(p => p.content);
    return groupTerms.length > 0 && groupTerms.every(t => currentTerms.includes(t));
  };

  // Check if some (but not all) terms in a group are selected
  const isGroupPartiallySelected = (groupName) => {
    const currentTerms = formData.terms || [];
    const groupTerms = (groupedPolicies[groupName] || []).map(p => p.content);
    const selectedCount = groupTerms.filter(t => currentTerms.includes(t)).length;
    return selectedCount > 0 && selectedCount < groupTerms.length;
  };

  const dispatch = useDispatch();

  function getDefaultFormData() {
    return {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      services: [],
      items: [{ service: '', description: '', quantity: 1, price: 0 }],
      additionalCharges: [],
      mainEventDate: '',
      terms: [],
      showEventDateInPdf: true,
      showTermsInPdf: true,
      showPaymentDetailsInPdf: true,
      showQrCodeInPdf: true,
      date: ''
    };
  }

  // Draft helpers for quotations (component state only - no persistence)
  const makeQuotationDraftKey = (id) => (id ? `${QUOTATION_DRAFT_KEY}_${String(id)}` : QUOTATION_DRAFT_KEY);
  const saveQuotationDraftToSession = (key) => {
    const data = { formData };
    sessionStorage.setItem(key, JSON.stringify(data));
  };
  const loadQuotationDraftFromSession = (key) => {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };
  const removeQuotationDraftFromSession = (key) => {
    sessionStorage.removeItem(key);
  };

  // Reset the create form to its initial values (does not close the modal)
  const resetCreateForm = () => {
    setFormData(getDefaultFormData());
    try { removeQuotationDraftFromSession(makeQuotationDraftKey()); } catch (e) {}
  };

  // Auto-save draft when form data changes and modal is open
  useEffect(() => {
    if (showCreateModal && formData) {
      // Check if form has any data (not empty)
      const hasData = formData.clientName || formData.clientEmail || formData.clientPhone ||
                      formData.services.length > 0 || formData.items.some(item => item.service || item.description || item.price > 0) ||
                      formData.additionalCharges.length > 0 || formData.terms.length > 0;
      if (hasData) {
        saveQuotationDraftToSession(QUOTATION_DRAFT_KEY);
      }
    }
  }, [formData, showCreateModal]);

  const handleSubmitQuotation = async () => {
    // sanitize inputs
    const clientName = (formData.clientName || '').toString().replace(/[^A-Za-z\s]/g, '').trim();
    const clientPhone = (formData.clientPhone || '').toString().replace(/\D/g, '');
    const clientEmail = (formData.clientEmail || '').toString().trim();

    if (!clientName) {
      showToast('Please provide a valid client name (letters and spaces only).');
      return;
    }
    if (!clientPhone) {
      showToast('Please provide a valid client phone (numbers only).');
      return;
    }
    if (clientEmail) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(clientEmail)) {
        showToast('Please provide a valid email address.');
        return;
      }
    }

    const payload = {
      clientName,
      clientEmail,
      clientPhone,
      // Persist only items that have a non-empty service name
      items: Array.isArray(formData.items) ? formData.items.filter(it => it && it.service && it.service.toString().trim() !== '') : [],
      services: (Array.isArray(formData.items) ? formData.items.filter(it => it && it.service && it.service.toString().trim() !== '') : []).map(item => item.service),
      additionalCharges: formData.additionalCharges || [],
  terms: formData.terms || [],
      totalAmount: calculateTotal(),
      status: editingQuotationId ? 'pending' : 'pending',
        mainEventDate: formData.mainEventDate || '',
        showEventDateInPdf: formData.showEventDateInPdf || false,
        showTermsInPdf: formData.showTermsInPdf !== false,
        showPaymentDetailsInPdf: formData.showPaymentDetailsInPdf !== false,
        showQrCodeInPdf: formData.showQrCodeInPdf !== false,
  date: editingQuotationId ? formData.date || formatDateISO(new Date()) : formatDateISO(new Date()),
      ...(editingQuotationId && { id: editingQuotationId }),
    };

    try {
      const token = session.getToken();
      if (token) {
        if (editingQuotationId) {
          // update existing on server
          const resp = await fetch(`${API_BASE_URL}/quotations/${encodeURIComponent(editingQuotationId)}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (resp.ok) {
            const updated = await resp.json();
            const updatedWithDate = { ...updated, date: updated.date || payload.date || formatDateISO(new Date()) };
            const next = quotations.map(q => q.id === editingQuotationId ? updatedWithDate : q);
            setQuotations(next);
          } else {
            showToast('Failed to update quotation on server.');
          }
          setEditingQuotationId(null);
        } else {
          // create new on server
          const newPayload = { id: generateQuotationId(quotations), ...payload };
          const resp = await fetch(`${API_BASE_URL}/quotations`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(newPayload),
          });
          if (resp.ok) {
            const created = await resp.json();
            const createdWithDate = { ...created, date: created.date || payload.date || formatDateISO(new Date()) };
            const next = [createdWithDate, ...quotations];
            setQuotations(next);
            showToast("Quotation created successfully");
            if (notifications?.events) {
              try {
                dispatch(addNotification({
                  title: 'Quotation created',
                  message: `${createdWithDate.id} — ${createdWithDate.clientName || 'No client'}`,
                  type: 'info',
                  timestamp: new Date().toISOString(),
                  path: '/quotations',
                  data: { openViewId: createdWithDate.id }
                }));
              } catch (e) {}
            }
          } else {
            showToast('Failed to create quotation on server.');
          }
        }
      } else {
        showToast('Please login to save quotations.');
        return;
      }
    } catch (e) {
      // network error
      // eslint-disable-next-line no-console
      console.warn('persist quotation failed', e);
      showToast('Network error: Failed to save quotation to server.');
    }
    setShowCreateModal(false);
  };

  const location = useLocation();
  const pendingOpenRef = useRef(null);

  useEffect(() => {
    if (location?.state?.openCreate) {
      handleCreateQuotation();
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }

    // If navigation requested to open a specific quotation view, try to open it.
    if (location?.state?.openViewId) {
      const idToOpen = location.state.openViewId;
      const q = quotations.find(qt => qt.id === idToOpen);
      if (q) {
        handleViewQuotation(q);
      } else {
        pendingOpenRef.current = idToOpen;
      }
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If a pending open id was set (because quotations weren't loaded when navigation happened),
  // try to open it now that `quotations` may have been populated.
  useEffect(() => {
    if (pendingOpenRef.current) {
      const idToOpen = pendingOpenRef.current;
      const q = quotations.find(qt => qt.id === idToOpen);
      if (q) {
        handleViewQuotation(q);
        pendingOpenRef.current = null;
        try { window.history.replaceState({}, document.title); } catch (e) {}
      }
    }
  }, [quotations]);

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
    { key: 'id', label: 'Quotation ID' },
    { key: 'services', label: 'Services' },
    { key: 'amount', label: 'Amount' },
    { key: 'date', label: 'Date' },
    { key: 'mainEventDate', label: 'Main Event Date' },
    { key: 'status', label: 'Status' }
  ];

  const getFilteredQuotations = () => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    let filtered = quotations.filter(quotation => {
      // Date range filtering
      if (fromDate || toDate) {
        const qDate = quotation.date ? new Date(quotation.date) : null;
        if (!qDate) return false;
        if (fromDate) {
          const f = new Date(fromDate); f.setHours(0,0,0,0);
          if (qDate < f) return false;
        }
        if (toDate) {
          const t = new Date(toDate); t.setHours(23,59,59,999);
          if (qDate > t) return false;
        }
      }

      const clientName = (quotation?.clientName || '').toString().toLowerCase();
      const id = (quotation?.id || '').toString().toLowerCase();
      const rawDate = (quotation?.date || '').toString().toLowerCase();
      const formattedDate = quotation.date ? formatDateDisplay(quotation.date).toString().toLowerCase() : '';
      const rawMainEventDate = (quotation?.mainEventDate || '').toString().toLowerCase();
      const formattedMainEventDate = quotation.mainEventDate ? formatDateDisplay(quotation.mainEventDate).toString().toLowerCase() : '';

      // Services: array of strings
      const servicesArr = Array.isArray(quotation.services) ? quotation.services : [];
      const servicesText = servicesArr.join(' ').toLowerCase();

      // Amount matching: allow queries like "5000", "₹5,000" or partial digits
      const rawAmount = quotation.totalAmount;
      const amountNum = (rawAmount === undefined || rawAmount === null) ? NaN : Number(rawAmount);

      let matchesSearch = false;
      if (!q) {
        matchesSearch = true;
      } else {
        matchesSearch = (
          clientName.includes(q) ||
          id.includes(q) ||
          rawDate.includes(q) ||
          formattedDate.includes(q) ||
          rawMainEventDate.includes(q) ||
          formattedMainEventDate.includes(q) ||
          servicesText.includes(q)
        );

        if (!matchesSearch) {
          // numeric query handling
          const numericQuery = q.replace(/[^0-9.]/g, '');
          if (numericQuery) {
            const qNum = parseFloat(numericQuery);
            if (!Number.isNaN(qNum) && !Number.isNaN(amountNum)) {
              if (Math.abs(amountNum - qNum) < 0.001) {
                matchesSearch = true;
              } else if (String(amountNum).toLowerCase().includes(numericQuery)) {
                matchesSearch = true;
              }
            }
          }
        }
      }

      const matchesStatus = filterStatus === 'all' || quotation.status === filterStatus;

      return matchesSearch && matchesStatus;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'date':
          comparison = new Date(a.date) - new Date(b.date);
          break;
        case 'mainEventDate':
          comparison = new Date(a.mainEventDate || 0) - new Date(b.mainEventDate || 0);
          break;
        case 'amount':
          comparison = a.totalAmount - b.totalAmount;
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
      case 'pending': return '#fbbf24';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FaClock />;
      case 'approved': return <FaCheck />;
      case 'rejected': return <FaTimes />;
      default: return <FaClock />;
    }
  };

  const filteredQuotations = getFilteredQuotations();

  // Pagination logic
  const totalPages = Math.ceil(filteredQuotations.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedQuotations = filteredQuotations.slice(startIndex, endIndex);

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

  const pendingValue = filteredQuotations
    .filter(q => q.status === 'pending')
    .reduce((sum, q) => sum + (parseFloat(q.totalAmount) || 0), 0);

  const approvedValue = filteredQuotations
    .filter(q => q.status === 'approved')
    .reduce((sum, q) => sum + (parseFloat(q.totalAmount) || 0), 0);

  // Rejected stats
  const rejectedCount = filteredQuotations.filter(q => q.status === 'rejected').length;
  const rejectedValue = filteredQuotations
    .filter(q => q.status === 'rejected')
    .reduce((sum, q) => sum + (parseFloat(q.totalAmount) || 0), 0);

  const handleExportQuotations = () => {
    try {
      const rows = (Array.isArray(filteredQuotations) && filteredQuotations.length > 0) ? filteredQuotations : quotations;
      if (!rows || rows.length === 0) { showToast('No quotations to export'); return; }

      // Build header according to what is visible in the table
      const headers = ['S/N', 'Client Name', 'Client Phone', 'Client Email'];
      columnOptions.forEach(col => {
        if (visibleColumns[col.key]) headers.push(col.label);
      });

      const esc = (v) => {
        const s = v === undefined || v === null ? '' : String(v);
        return '"' + s.replace(/"/g, '""') + '"';
      };

      const lines = rows.map((q, idx) => {
        const base = [idx + 1, q.clientName || '', q.clientPhone || '', q.clientEmail || ''];
        columnOptions.forEach(col => {
          if (!visibleColumns[col.key]) return;
          switch (col.key) {
            case 'id':
              base.push(q.id || '');
              break;
            case 'services':
              base.push(Array.isArray(q.services) ? q.services.join('; ') : (q.services || ''));
              break;
            case 'amount':
              base.push(parseFloat(q.totalAmount) || 0);
              break;
            case 'date':
              base.push(formatDateDisplay(q.date) || '');
              break;
            case 'mainEventDate':
              base.push(formatDateDisplay(q.mainEventDate) || '');
              break;
            case 'status':
              base.push(q.status || '');
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
      a.download = `quotations_export_${formatDateISO(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { console.error('export error', e); showToast('Unable to export quotations'); }
  };

  return (
    <div className="quotations">
      {/* Header */}
      <div className="quotations__header">
        <div className="quotations__title-section">
          <h1 className="quotations__title">
            <FaFileInvoiceDollar />
            Quotations
          </h1>
          <p className="quotations__subtitle">
            Manage and track client quotations
          </p>
        </div>
        <div className="quotations__header-actions">
          <button
            className="btn-primary quotations__export-btn"
            onClick={handleExportQuotations}
            title="Export Quotations"
            style={{ marginRight: 8 }}
          >
            <FaShareSquare /> Export
          </button>

          <button className="btn-primary" onClick={handleCreateQuotation}>
            <FaPlus />
            New Quotation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="quotations__stats">
        <div className="quotations__stat-card">
          <div className="quotations__stat-icon quotations__stat-icon--blue">
            <FaFileInvoiceDollar />
          </div>
          <div className="quotations__stat-info">
            <h3>{filteredQuotations.length}</h3>
            <p>Total Quotations</p>
          </div>
        </div>
        <div className="quotations__stat-card">
          <div className="quotations__stat-icon quotations__stat-icon--red">
            <FaTimes />
          </div>
          <div className="quotations__stat-info">
            <h3>{rejectedCount}</h3>
            <p>Rejected</p>
          </div>
        </div>
        <div className="quotations__stat-card">
          <div className="quotations__stat-icon quotations__stat-icon--red-light">
            <FaMoneyBillWave />
          </div>
          <div className="quotations__stat-info">
            <h3>₹{rejectedValue.toLocaleString('en-IN')}</h3>
            <p>Rejected Value</p>
          </div>
        </div>
        <div className="quotations__stat-card">
          <div className="quotations__stat-icon quotations__stat-icon--amber">
            <FaClock />
          </div>
          <div className="quotations__stat-info">
            <h3>{filteredQuotations.filter(q => q.status === 'pending').length}</h3>
            <p>Pending</p>
          </div>
        </div>
        <div className="quotations__stat-card">
          <div className="quotations__stat-icon quotations__stat-icon--orange">
            <FaMoneyBillWave />
          </div>
          <div className="quotations__stat-info">
            <h3>₹{pendingValue.toLocaleString('en-IN')}</h3>
            <p>Pending Value</p>
          </div>
        </div>
        <div className="quotations__stat-card">
          <div className="quotations__stat-icon quotations__stat-icon--green">
            <FaCheck />
          </div>
          <div className="quotations__stat-info">
            <h3>{filteredQuotations.filter(q => q.status === 'approved').length}</h3>
            <p>Approved</p>
          </div>
        </div>
        <div className="quotations__stat-card">
          <div className="quotations__stat-icon quotations__stat-icon--green-light">
            <FaMoneyBillWave />
          </div>
          <div className="quotations__stat-info">
            <h3>₹{approvedValue.toLocaleString('en-IN')}</h3>
            <p>Approved Value</p>
          </div>
        </div>
        
      </div>

      {/* Toolbar */}
      <div className="quotations__toolbar">
        <div className="quotations__search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search quotations by ID, Name or Date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="quotations__toolbar-right">
          <div className="quotations__date-range">
            <label>From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <label>To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="quotations__filter">
            <FaFilter />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          {viewMode === 'table' && (
            <div className="quotations__column-selector">
              <button
                ref={columnBtnRef}
                className="quotations__column-btn"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                title="Column Preferences"
              >
                <FaColumns />
              </button>
              {showColumnMenu && (
                <div ref={columnMenuRef} className="quotations__column-menu">
                  <div className="quotations__column-menu-header">
                    <span>Show Columns</span>
                    <button onClick={() => setShowColumnMenu(false)}>
                      <FaTimes />
                    </button>
                  </div>
                  <div className="quotations__column-menu-items">
                    <label className="quotations__column-menu-item quotations__column-menu-item--select-all">
                      <input
                        type="checkbox"
                        checked={isAllColumnsSelected()}
                        onChange={(e) => toggleAllColumns(e.target.checked)}
                      />
                      {isAllColumnsSelected() ? <FaCheckSquare /> : <FaSquare />}
                      <span><strong>Select All</strong></span>
                    </label>
                    <div className="quotations__column-menu-divider"></div>
                    {columnOptions.map(column => (
                      <label key={column.key} className="quotations__column-menu-item">
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
          <div className="quotations__view-toggle">
            <button
              className={`quotations__view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <FaList />
            </button>
            <button
              className={`quotations__view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <FaThLarge />
            </button>
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="quotations__content">
        {filteredQuotations.length === 0 ? (
          <div className="quotations__empty">
            <FaFileInvoiceDollar />
            <h3>No quotations found</h3>
            <p>Create your first quotation to get started</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="quotations__table-container">
            <table className="quotations__table">
              <thead>
                <tr>
                  <th className="quotations__col-no" style={{ width: 60 }}>No.</th>
                  {visibleColumns.id && <th className="quotations__col-id">Quotation ID</th>}
                  <th 
                    className="quotations__col-client quotations__sortable-header quotations__clickable"
                    onClick={() => handleSort('name')}
                  >
                    Client {' '}
                    {sortBy === 'name' ? (
                      sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
            ) : (
            <FaSort className="quotations__sort-icon-muted" />
            )}
                  </th>
                  {visibleColumns.mainEventDate && (
                    <th
                      className="quotations__col-event-date quotations__sortable-header"
                      onClick={() => handleSort('mainEventDate')}
                      style={{ cursor: 'pointer' }}
                    >
                      Event Date {' '}
                      {sortBy === 'mainEventDate' ? (
                        sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort className="quotations__sort-icon-muted" />
                      )}
                    </th>
                  )}
                  {visibleColumns.services && <th className="quotations__col-services">Services</th>}
                  {visibleColumns.amount && (
                    <th 
                      className="quotations__col-amount quotations__sortable-header quotations__clickable"
                      onClick={() => handleSort('amount')}
                    >
                      Amount {' '}
                      {sortBy === 'amount' ? (
                        sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort className="quotations__sort-icon-muted" />
                      )}
                    </th>
                  )}
                  {visibleColumns.date && (
                    <th 
                      className="quotations__col-date quotations__sortable-header"
                      onClick={() => handleSort('date')}
                      style={{ cursor: 'pointer' }}
                    >
                      Date {' '}
                      {sortBy === 'date' ? (
                        sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />
                      ) : (
                        <FaSort className="quotations__sort-icon-muted" />
                      )}
                    </th>
                  )}
                  
                  {visibleColumns.status && <th className="quotations__col-status">Status</th>}
                  <th className="quotations__col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuotations.map((quotation, idx) => (
                  <tr
                    key={quotation.id || quotation._id || `q-${idx}`}
                    onClick={() => handleViewQuotation(quotation)}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewQuotation(quotation); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="quotations__col-no">
                      <span className="quotations__number">{idx + 1}</span>
                    </td>
                    {visibleColumns.id && (
                      <td className="quotations__col-id">
                        <span className="quotations__id"><Highlight text={quotation.id} query={searchQuery} /></span>
                      </td>
                    )}
                    <td className="quotations__col-client">
                      <div className="quotations__client">
                          <div className="quotations__client-info">
                            <div className="quotations__client-name"><Highlight text={quotation.clientName} query={searchQuery} /></div>
                            <div className="quotations__client-phone"><Highlight text={quotation.clientPhone} query={searchQuery} /></div>
                            <div className="quotations__client-email"><Highlight text={quotation.clientEmail} query={searchQuery} /></div>
                          </div>
                      </div>
                    </td>
                    {visibleColumns.mainEventDate && (
                      <td className="quotations__col-event-date">
                        <span className="quotations__date">
                          <Highlight text={quotation.mainEventDate ? formatDateDisplay(quotation.mainEventDate) : ''} query={searchQuery} />
                        </span>
                      </td>
                    )}
                    {visibleColumns.services && (
                      <td className="quotations__col-services">
                        <div className="quotations__services">
                          {quotation.services.slice(0, 2).map((service, idx) => (
                            <span key={idx} className="quotations__service-tag">
                              <Highlight text={service} query={searchQuery} />
                            </span>
                          ))}
                          {quotation.services.length > 2 && (
                            <span className="quotations__service-more">
                              +{quotation.services.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className="quotations__col-amount">
                        <span className="quotations__amount">
                          <Highlight text={`₹${quotation.totalAmount.toLocaleString('en-IN')}`} query={searchQuery} />
                        </span>
                      </td>
                    )}
                    {visibleColumns.date && (
                      <td className="quotations__col-date">
                        <span className="quotations__date">
                          <Highlight text={formatDateDisplay(quotation.date)} query={searchQuery} />
                        </span>
                      </td>
                    )}
                    
                    
                    {visibleColumns.status && (
                      <td className="quotations__col-status">
                        <span 
                          className={`quotations__status quotations__status--${quotation.status} quotations__status--badge`}
                        >
                          {getStatusIcon(quotation.status)}
                          {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                        </span>
                      </td>
                    )}
                    <td className="quotations__col-actions">
                      <div className="quotations__actions">
                        <button
                          className="quotations__action-btn quotations__action-btn--view"
                          onClick={(e) => { e.stopPropagation(); handleViewQuotation(quotation); }}
                          title="View"
                        >
                          <FaEye />
                        </button>
                        <button
                          className="quotations__action-btn quotations__action-btn--download"
                          title="Download PDF"
                          onClick={(e) => { e.stopPropagation(); handleDownloadQuotation(quotation); }}
                        >
                          <FaDownload />
                        </button>
                        <button
                          className="quotations__action-btn quotations__action-btn--whatsapp"
                          title="Send WhatsApp"
                          onClick={(e) => { e.stopPropagation(); handleWhatsApp(quotation); }}
                        >
                          <FaWhatsapp />
                        </button>
                        <button
                          className="quotations__action-btn quotations__action-btn--email"
                          title="Send Email"
                          onClick={(e) => { e.stopPropagation(); handleSendEmail(quotation); }}
                        >
                          <FaEnvelope />
                        </button>
                        <button
                          className="quotations__action-btn quotations__action-btn--delete"
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuotation(quotation.id); }}
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
          <div className="quotations__grid">
            {paginatedQuotations.map((quotation, idx) => (
              <div key={quotation.id || quotation._id || `q-${idx}`} className="quotations__card">
                <div className="quotations__card-header">
                  <span className="quotations__card-no">#{idx + 1}</span>
                  <span className="quotations__card-id">{quotation.id}</span>
                  <span 
                    className={`quotations__status quotations__status--${quotation.status} quotations__status--badge`}
                  >
                    {getStatusIcon(quotation.status)}
                    {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                  </span>
                </div>
                
                <div className="quotations__card-client">
                  <div className="quotations__card-client-info">
                    <h3>{quotation.clientName}</h3>
                    <p>{quotation.clientPhone}</p>
                    <p>{quotation.clientEmail}</p>
                  </div>
                  <div className="quotations__card-event-date">
                    <label>Event Date</label>
                    <span><Highlight text={quotation.mainEventDate ? formatDateDisplay(quotation.mainEventDate) : 'N/A'} query={searchQuery} /></span>
                  </div>
                </div>

                <div className="quotations__card-services">
                  {quotation.services.map((service, idx) => (
                    <span key={idx} className="quotations__service-tag">
                      <Highlight text={service} query={searchQuery} />
                    </span>
                  ))}
                </div>

                <div className="quotations__card-details">
                  <div className="quotations__card-detail">
                    <FaMoneyBillWave />
                    <div>
                      <label>Amount</label>
                      <span><Highlight text={`₹${quotation.totalAmount.toLocaleString('en-IN')}`} query={searchQuery} /></span>
                    </div>
                  </div>
                  <div className="quotations__card-detail">
                    <FaCalendarAlt />
                    <div>
                      <label>Date</label>
                      <span><Highlight text={formatDateDisplay(quotation.date)} query={searchQuery} /></span>
                    </div>
                  </div>
                  
                </div>

                <div className="quotations__card-actions">
                  <button
                    className="quotations__action-btn quotations__action-btn--view"
                    onClick={() => handleViewQuotation(quotation)}
                    title="View"
                  >
                    <FaEye />
                  </button>
                  <button
                    className="quotations__action-btn quotations__action-btn--download"
                    title="Download PDF"
                    onClick={() => handleDownloadQuotation(quotation)}
                  >
                    <FaDownload />
                  </button>
                  <button
                    className="quotations__action-btn quotations__action-btn--whatsapp"
                    title="Send WhatsApp"
                    onClick={() => handleWhatsApp(quotation)}
                  >
                    <FaWhatsapp />
                  </button>
                  <button
                    className="quotations__action-btn quotations__action-btn--email"
                    title="Send Email"
                    onClick={() => handleSendEmail(quotation)}
                  >
                    <FaEnvelope />
                  </button>
                  <button
                    className="quotations__action-btn quotations__action-btn--delete"
                    onClick={() => handleDeleteQuotation(quotation.id)}
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
      {filteredQuotations.length > 0 && (
        <div className="quotations__pagination">
          <div className="quotations__pagination-info">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredQuotations.length)} of {filteredQuotations.length} quotations
          </div>
          <div className="quotations__pagination-controls">
            <div className="quotations__pagination-rows">
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
            <div className="quotations__pagination-buttons">
              <button
                className="quotations__pagination-btn"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <FaAngleDoubleLeft />
              </button>
              <button
                className="quotations__pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous Page"
              >
                <FaAngleLeft />
              </button>
              <div className="quotations__pagination-pages">
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
                        className="quotations__pagination-btn"
                        onClick={() => handlePageChange(1)}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(<span key="ellipsis1" className="quotations__pagination-ellipsis">...</span>);
                    }
                  }

                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <button
                        key={i}
                        className={`quotations__pagination-btn ${currentPage === i ? 'active' : ''}`}
                        onClick={() => handlePageChange(i)}
                      >
                        {i}
                      </button>
                    );
                  }

                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(<span key="ellipsis2" className="quotations__pagination-ellipsis">...</span>);
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        className="quotations__pagination-btn"
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
                className="quotations__pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next Page"
              >
                <FaAngleRight />
              </button>
              <button
                className="quotations__pagination-btn"
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

      {/* Create Quotation Modal */}
      <Modal
        isOpen={showCreateModal}
        title={editingQuotationId ? "Edit Quotation" : "Create New Quotation"}
        headerActions={
          !editingQuotationId ? (
            <button className="btn-secondary modal__reset" onClick={resetCreateForm} type="button">
              Reset
            </button>
          ) : null
        }
        onClose={() => { saveQuotationDraftToSession(QUOTATION_DRAFT_KEY); setShowCreateModal(false); }}
        size="large"
      >
          <div className="quotations__form">
                <div className="quotations__form-section">
              <div className="quotations__form-row quotations__form-row--2col">
                <div className="quotations__form-group">
                  <label>Client Name *</label>
                  <input
                    type="text"
                    placeholder="Enter client name"
                    value={formData.clientName}
                    onChange={(e) => {
                      const filtered = (e.target.value || '').replace(/[^A-Za-z\s]/g, '');
                      setFormData({ ...formData, clientName: filtered });
                    }}
                    pattern="[A-Za-z ]+"
                  />
                </div>
                <div className="quotations__form-group">
                  <label>Client Phone *</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Enter numbers only"
                    value={formData.clientPhone}
                    onChange={(e) => {
                      const digits = (e.target.value || '').toString().replace(/\D/g, '');
                      setFormData({ ...formData, clientPhone: digits });
                    }}
                  />
                </div>
              </div>
              <div className="quotations__form-row quotations__form-row--2col quotations__form-row--mt">
                <div className="quotations__form-group">
                  <label>Client Email</label>
                  <input
                    type="email"
                    placeholder="client@email.com"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: (e.target.value || '').trim() })}
                  />
                </div>
                <div className="quotations__form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Main Event Date</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 'normal', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.showEventDateInPdf || false}
                        onChange={(e) => setFormData({ ...formData, showEventDateInPdf: e.target.checked })}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      Show in PDF
                    </label>
                  </div>
                  <input
                    type="date"
                    value={formData.mainEventDate}
                    onChange={(e) => setFormData({ ...formData, mainEventDate: (e.target.value || '') })}
                  />
                </div>
              </div>
              </div>

            <div className="quotations__form-section">
              <div className="quotations__form-section-header">
                <h3>Services</h3>
                <button className="btn-secondary" onClick={addLineItem}>
                  <FaPlus /> Add Item
                </button>
              </div>

              {formData.items.map((item, index) => (
                <div key={index} className="quotations__line-item">
                  {/* Remove button - positioned in top right corner */}
                  {formData.items.length > 1 && (
                    <button
                      className="quotations__remove-item"
                      onClick={() => removeLineItem(index)}
                      title="Remove item"
                    >
                      <FaTimes />
                    </button>
                  )}

                  {/* Service field - full width row */}
                  <div className="quotations__line-item-row quotations__line-item-row--service">
                    <div className="quotations__form-group quotations__form-group--wide">
                      <label>Service</label>
                      <ServiceTypeInput
                        value={item.service || ''}
                        onChange={(val) => selectService(index, val)}
                        availableServices={availableServices}
                        onNewService={handleNewService}
                      />
                    </div>
                  </div>

                  {/* Quantity, Price, Total row */}
                  <div className="quotations__line-item-row quotations__line-item-row--details">
                    {/* Only show quantity/price/total when service is provided */}
                    {item.service && item.service.toString().trim() !== '' ? (
                      <>
                        <div className="quotations__form-group">
                          <label>Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          />
                        </div>
                        <div className="quotations__form-group">
                          <label>Price (₹)</label>
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => updateLineItem(index, 'price', e.target.value)}
                          />
                        </div>
                        <div className="quotations__form-group">
                          <label>Total</label>
                          <div className="quotations__line-total">
                            ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </>
                    ) : (
                      // keep layout consistent: show empty placeholders or small info when no service
                      <>
                        <div className="quotations__form-group quotations__form-group--placeholder">
                          <label>Quantity</label>
                          <div className="quotations__line-total">—</div>
                        </div>
                        <div className="quotations__form-group quotations__form-group--placeholder">
                          <label>Price (₹)</label>
                          <div className="quotations__line-total">—</div>
                        </div>
                        <div className="quotations__form-group quotations__form-group--placeholder">
                          <label>Total</label>
                          <div className="quotations__line-total">—</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Description - always shown below */}
                  <div className="quotations__form-group">
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

              <div className="quotations__summary">
                <div className="quotations__summary-row">
                  <span>Subtotal:</span>
                  <span>₹{calculateSubtotal().toLocaleString('en-IN')}</span>
                </div>
                {/* Additional Charges list (editable in create modal) */}
                {(formData.additionalCharges || []).length > 0 && (
                  <div className="quotations__additional-charges">
                    {(formData.additionalCharges || []).map((c, i) => (
                        <div key={i} className="quotations__charge-row">
                        <div className="quotations__form-group quotations__charge-desc quotations__charge-desc--flex1">
                          <label>Charge</label>
                          <input
                            type="text"
                            placeholder="Charge description"
                            value={c.description}
                            onChange={(e) => updateAdditionalCharge(i, 'description', e.target.value)}
                          />
                        </div>

                        <div className="quotations__form-group quotations__charge-amount quotations__charge-amount--fixed">
                          <label>Amount</label>
                          <input
                            type="number"
                            min="0"
                            value={c.amount}
                            onChange={(e) => updateAdditionalCharge(i, 'amount', e.target.value)}
                          />
                        </div>

                        <div className="quotations__charge-actions">
                          <button type="button" onClick={() => removeAdditionalCharge(i)} className="quotations__remove-item" aria-label="Remove charge">
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="quotations__add-charge-row">
                  <button type="button" onClick={addAdditionalCharge} className="btn-secondary">+ Add Charge</button>
                </div>

                <div className="quotations__summary-row quotations__summary-total">
                  <span>Total:</span>
                  <span>₹{calculateTotal().toLocaleString('en-IN')}</span>
                </div>

                {/* Terms and Conditions - Grouped by Policy */}
                <div className="quotations__form-group quotations__terms-section" style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      Terms & Conditions
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 'normal', fontSize: '0.875rem' }}>
                      <input
                        type="checkbox"
                        checked={formData.showTermsInPdf !== false}
                        onChange={(e) => setFormData({ ...formData, showTermsInPdf: e.target.checked })}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      Show in PDF
                    </label>
                  </div>
                  
                  {Object.keys(groupedPolicies).length === 0 ? (
                    <div style={{ 
                      padding: '1.5rem', 
                      background: '#f9fafb', 
                      border: '2px dashed #e5e7eb', 
                      borderRadius: '8px',
                      textAlign: 'center',
                      color: '#6b7280'
                    }}>
                      <p style={{ margin: '0 0 0.5rem 0' }}>No terms and conditions available.</p>
                      <p style={{ margin: 0, fontSize: '14px' }}>
                        Go to the Policy page to add your terms and conditions.
                      </p>
                    </div>
                  ) : (
                    <div className="quotations__policy-groups">
                      {Object.entries(groupedPolicies).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, policies]) => (
                        <div key={groupName} className="quotations__policy-group" style={{
                          marginBottom: '1rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden'
                        }}>
                          {/* Group Header */}
                          <div style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                          }}>
                            <label style={{
                              margin: 0,
                              color: '#ffffff',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}>
                              <input
                                type="checkbox"
                                checked={isGroupFullySelected(groupName)}
                                ref={el => {
                                  if (el) el.indeterminate = isGroupPartiallySelected(groupName);
                                }}
                                onChange={(e) => handleSelectGroup(groupName, e.target.checked)}
                                style={{ 
                                  cursor: 'pointer',
                                  width: '16px',
                                  height: '16px',
                                  accentColor: '#ffffff'
                                }}
                              />
                              <span>📋 {groupName}</span>
                            </label>
                            <span style={{
                              background: 'rgba(255, 255, 255, 0.2)',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              color: '#ffffff'
                            }}>
                              {policies.length} term{policies.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          {/* Group Terms */}
                          <div style={{ 
                            padding: '0.75rem 1rem',
                            background: '#ffffff'
                          }}>
                            {policies.map((policy, idx) => (
                              <label
                                key={policy.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  padding: '0.5rem',
                                  marginBottom: idx === policies.length - 1 ? 0 : '0.5rem',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  transition: 'background 0.2s',
                                  background: (formData.terms || []).includes(policy.content) ? '#f0fdf4' : 'transparent'
                                }}
                                onMouseEnter={(e) => {
                                  if (!(formData.terms || []).includes(policy.content)) {
                                    e.currentTarget.style.background = '#f9fafb';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!(formData.terms || []).includes(policy.content)) {
                                    e.currentTarget.style.background = 'transparent';
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={(formData.terms || []).includes(policy.content)}
                                  onChange={() => handleTermToggle(policy.content)}
                                  style={{ 
                                    marginTop: '0.25rem',
                                    marginRight: '0.75rem',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    width: '16px',
                                    height: '16px',
                                    accentColor: '#10b981'
                                  }}
                                />
                                <span style={{ 
                                  fontSize: '14px',
                                  color: '#374151',
                                  lineHeight: '1.5'
                                }}>
                                  {policy.content}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {(formData.terms || []).length > 0 && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#166534'
                    }}>
                      <strong>{formData.terms.length}</strong> term{formData.terms.length !== 1 ? 's' : ''} selected
                    </div>
                  )}
                  {/* signatures are printed only in the generated PDF */}
                </div>
              </div>

              {/* PDF Options */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.showPaymentDetailsInPdf !== false}
                      onChange={(e) => setFormData({ ...formData, showPaymentDetailsInPdf: e.target.checked })}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    Show Payment Details in PDF
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 0, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.showQrCodeInPdf !== false}
                      onChange={(e) => setFormData({ ...formData, showQrCodeInPdf: e.target.checked })}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    Show QR Code in PDF
                  </label>
                </div>
            </div>

            <div className="quotations__form-actions">
              {/* Show Save Draft only for CREATE (not when editing an existing quotation) */}
              {!editingQuotationId && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    try { saveQuotationDraftToSession(makeQuotationDraftKey()); } catch (e) {}
                    try { setShowCreateModal(false); } catch (e) {}
                    try { showToast('⚠️ your form saved temporarily, please complete and submit soon.'); } catch (e) {}
                  }}
                  type="button"
                >
                  Save Draft
                </button>
              )}
              {/* Reset moved to modal headerActions */}
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSubmitQuotation}
                disabled={!formData.clientName || !formData.clientPhone || formData.items.every(item => !item.service)}
              >
                Create Quotation
              </button>
            </div>
        </div>
      </Modal>

      {/* View Quotation Modal (render children only when selectedQuotation exists) */}
      {showViewModal && selectedQuotation && (
        <Modal
          isOpen={true}
          title={`Quotation ${selectedQuotation.id}`}
          onClose={() => setShowViewModal(false)}
        >
          <div className="quotations__view">
            <div className="quotations__view-header">
              <div className="quotations__view-header-top">
                <div className="quotations__view-status-left">
                  <span
                    className={`quotations__status quotations__status--${selectedQuotation.status}`}
                    style={{ background: `${getStatusColor(selectedQuotation.status)}20`, color: getStatusColor(selectedQuotation.status) }}
                  >
                    {getStatusIcon(selectedQuotation.status)}
                    {selectedQuotation.status.charAt(0).toUpperCase() + selectedQuotation.status.slice(1)}
                  </span>
                </div>

                <div />

                <div className="quotations__view-top-actions">
                  <button className="btn-secondary" onClick={() => handleEditFromView(selectedQuotation)} title="Edit quotation">
                    <FaEdit /> Edit
                  </button>
                </div>
              </div>

              <div className="quotations__view-client-row">
                <div className="quotations__view-client">
                  <h3><Highlight text={selectedQuotation.clientName} query={searchQuery} /></h3>
                  <p><Highlight text={selectedQuotation.clientPhone} query={searchQuery} /></p>
                  <p><Highlight text={selectedQuotation.clientEmail} query={searchQuery} /></p>
                </div>

                <div className="quotations__view-date-right">
                  <label>Date</label>
                  <span><Highlight text={formatDateDisplay(selectedQuotation.date)} query={searchQuery} /></span>
                </div>
                <div className="quotations__view-date-right">
                  <label>Main Event Date</label>
                  <span><Highlight text={selectedQuotation.mainEventDate ? formatDateDisplay(selectedQuotation.mainEventDate) : ''} query={searchQuery} /></span>
                </div>
              </div>
            </div>

            <div className="quotations__view-section">
              <h4>Services</h4>
              <div className="quotations__view-items">
                {(() => {
                  const filteredItems = Array.isArray(selectedQuotation.items) ? selectedQuotation.items.filter(it => it && it.service && it.service.toString().trim() !== '') : [];
                  if (filteredItems.length > 0) {
                    return (
                      <table className="quotations__items-table">
                        <thead>
                          <tr>
                            <th>Service</th>
                            <th className="quotations__item-qty">Qty</th>
                            <th className="quotations__item-unit">Unit Price (₹)</th>
                            <th className="quotations__item-line">Line Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems.map((item, idx) => {
                            const qty = parseFloat(item.quantity) || 0;
                            const unit = parseFloat(item.price) || 0;
                            const line = qty * unit;
                            return (
                              <tr key={idx}>
                                <td><Highlight text={item.service || item.description || 'Service'} query={searchQuery} /></td>
                                <td className="quotations__item-qty">{qty}</td>
                                <td className="quotations__item-unit"><Highlight text={`₹${unit.toLocaleString('en-IN')}`} query={searchQuery} /></td>
                                <td className="quotations__item-line"><Highlight text={`₹${line.toLocaleString('en-IN')}`} query={searchQuery} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  }
                  // fallback to simple services list if there are no detailed items
                  return (
                    <ul className="quotations__view-services">
                      {Array.isArray(selectedQuotation.services) && selectedQuotation.services.length > 0 ? (
                        selectedQuotation.services.map((service, idx) => (
                          <li key={idx}><Highlight text={service} query={searchQuery} /></li>
                        ))
                      ) : (
                        <li>No services listed</li>
                      )}
                    </ul>
                  );
                })()}
              </div>
            </div>

            {selectedQuotation.additionalCharges && selectedQuotation.additionalCharges.length > 0 && (
              <div className="quotations__view-section">
                <h4>Additional Charges</h4>
                <ul className="quotations__view-charges">
                  {selectedQuotation.additionalCharges.map((c, i) => (
                    <li key={i}>
                      <span className="quotations__charge-desc"><Highlight text={c.description || 'Charge'} query={searchQuery} /></span>
                      <span className="quotations__charge-amount"><Highlight text={`₹${(parseFloat(c.amount) || 0).toLocaleString('en-IN')}`} query={searchQuery} /></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="quotations__view-section">
              <h4>Total Amount</h4>
              <div className="quotations__view-amount">
                <Highlight text={`₹${selectedQuotation.totalAmount.toLocaleString('en-IN')}`} query={searchQuery} />
              </div>
            </div>

            {/* notes removed per UI change */}

            {selectedQuotation.status === 'pending' && (
              <div className="quotations__view-actions">
                <button 
                  className="btn-success"
                  onClick={() => {
                    handleUpdateStatus(selectedQuotation.id, 'approved');
                    setShowViewModal(false);
                  }}
                >
                  <FaCheck /> Approve
                </button>
                <button 
                  className="btn-danger"
                  onClick={() => {
                    handleUpdateStatus(selectedQuotation.id, 'rejected');
                    setShowViewModal(false);
                  }}
                >
                  <FaTimes /> Reject
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Quotations;
