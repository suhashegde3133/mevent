import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaUsers, FaTrash, FaEdit, FaReceipt, FaEllipsisV, FaWhatsapp, FaPlusCircle, FaMoneyBillWave, FaCheckCircle, FaClock } from 'react-icons/fa';
import './Team.scss';
import Modal from '../components/Modal/Modal';

import { storage } from '../utils/storage';
import useConfirm from '../hooks/useConfirm';
import { STORAGE_KEYS, API_BASE_URL } from '../utils/constants';
import session from '../utils/session';
import { showToast } from '../utils/toast';
import logger from '../utils/logger';

const initialMembers = storage.getJSON(STORAGE_KEYS.TEAM, []);

const emptyMember = { 
  name: '', 
  role: '', 
  phone: '', 
  email: '', 
  avatar: null,
  payments: [] // Array of { eventId, eventName, amount, date, status, notes }
};

const Team = () => {
  const [teamMembers, setTeamMembers] = useState(initialMembers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState(emptyMember);
  const [errors, setErrors] = useState({});
  const confirm = useConfirm();
  
  // Get current logged-in user from Redux
  const authUser = useSelector((state) => state.auth.user);
  const currentUserId = authUser?.id || authUser?._id || authUser?.email || 'anonymous';
  const currentUserEmail = authUser?.email || '';
  const currentUserName = authUser?.name || authUser?.email || 'You';
  
  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    eventId: '',
    eventName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    status: 'pending', // pending, paid, partial
    notes: ''
  });
  const [paymentErrors, setPaymentErrors] = useState({});
  
  // Load events for payment dropdown
  const [events, setEvents] = useState([]);
  // Events filtered for the selected member in payment modal
  const [eventsForMember, setEventsForMember] = useState([]);
  
  // Pagination for payments table
  const [paymentsPage, setPaymentsPage] = useState(1);
  const itemsPerPage = 10;

  // Helper to format dates for display as dd-mm-yyyy
  const formatDate = (dateInput) => {
    if (!dateInput && dateInput !== 0) return '—';
    try {
      // Normalize common formats
      const s = String(dateInput);
      // If already in yyyy-mm-dd (from input[type=date]) convert to dd-mm-yyyy
      const isoMatch = s.match(/^\d{4}-\d{1,2}-\d{1,2}$/);
      if (isoMatch) {
        const [y, m, d] = s.split('-');
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
      }
      const dt = new Date(dateInput);
      if (!isFinite(dt.getTime())) return s;
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = dt.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch (e) {
      return String(dateInput);
    }
  };

  // Escape regex special chars
  const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&');

  // Highlight occurrences of `query` inside `text` (case-insensitive)
  // Returns a mix of strings and <span className="search-highlight">matched</span>
  const highlightText = (text, query) => {
    const q = String(query || '').trim();
    if (!q) return text;
    const str = String(text == null ? '' : text);
    if (!str) return str;
    try {
      const splitRe = new RegExp(`(${escapeRegExp(q)})`, 'ig');
      const testRe = new RegExp(`^${escapeRegExp(q)}$`, 'i');
      const parts = str.split(splitRe);
      return parts.map((part, idx) => (
        testRe.test(part) ? <span key={idx} className="search-highlight">{part}</span> : part
      ));
    } catch (e) {
      return str;
    }
  };
  
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const token = session.getToken();
        if (!token) {
          setEvents([]);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/events`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const data = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        setEvents([]);
      }
    };
    loadEvents();
  }, []);

  // Load team members from server when authenticated; fall back to local storage
  useEffect(() => {
    const load = async () => {
      try {
        const token = session.getToken();
        if (!token) return; // unauthenticated
        const res = await fetch(`${API_BASE_URL}/team`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setTeamMembers(data);
          return;
        }
      } catch (e) {
        // ignore and fall back to local
      }
      try {
        const local = storage.getJSON(STORAGE_KEYS.TEAM, []);
        setTeamMembers(Array.isArray(local) ? local : []);
      } catch (e) {
        setTeamMembers([]);
      }
    };
    load();
  }, []);

  // Payments viewer modal
  const [isPaymentsViewOpen, setIsPaymentsViewOpen] = useState(false);
  const [paymentsViewerMember, setPaymentsViewerMember] = useState(null);
  // Search for payments viewer
  const [paymentsSearch, setPaymentsSearch] = useState('');
  // Search for team list (name / role / phone)
  const [searchQuery, setSearchQuery] = useState('');
  // Track which card's menu is open
  const [openMenuId, setOpenMenuId] = useState(null);

  // Toggle card menu (stop propagation so card click doesn't open payments)
  const toggleMenu = (e, memberId) => {
    e.stopPropagation();
    setOpenMenuId((prev) => (prev === memberId ? null : memberId));
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!openMenuId) return undefined;
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Open WhatsApp with a cleaned phone number (uses wa.me)
  const openWhatsApp = (e, phone) => {
    e.stopPropagation();
    if (!phone) {
      showToast('No phone number available', 'error');
      return;
    }
    const clean = String(phone).replace(/[^0-9]/g, '');
    if (!clean) {
      showToast('Invalid phone number', 'error');
      return;
    }
    try {
      window.open(`https://wa.me/${clean}`, '_blank');
    } catch (err) {
      // Fallback: copy number to clipboard
      try { navigator.clipboard.writeText(clean); showToast('Phone copied to clipboard', 'info'); } catch (_) {}
    }
  };

  const openAdd = () => {
    setForm(emptyMember);
    setEditingMember(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const location = useLocation();

  useEffect(() => {
    if (location?.state?.openAdd) {
      openAdd();
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (member) => {
    setForm({ ...member });
    setEditingMember(member._id);
    setErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const err = {};
    if (!form.name || form.name.trim().length < 2) err.name = 'Name is required';
    if (form.phone && !/^\+?[0-9\s\-()]{6,20}$/.test(form.phone)) err.phone = 'Enter a valid phone number';
    if (!form.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) err.email = 'Valid email required';
    if (!form.role || form.role.trim().length < 2) err.role = 'Role is required';
    return err;
  };

  const saveMember = () => {
    const validation = validate();
    if (Object.keys(validation).length) {
      setErrors(validation);
      return;
    }

    if (editingMember) {
      // Optimistic update
      const updatedMembers = teamMembers.map((m) => (m._id === editingMember ? { ...m, ...form } : m));
      setTeamMembers(updatedMembers);
      // Persist to server
      (async () => {
        try {
          const token = session.getToken();
          if (!token) return;
          const res = await fetch(`${API_BASE_URL}/team/${encodeURIComponent(editingMember)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...form, _id: editingMember }),
          });
          if (res.ok) {
            const updated = await res.json();
            setTeamMembers((prev) => prev.map((m) => (m._id === editingMember ? updated : m)));
          } else {
            // Revert on error and show error message
            const errorData = await res.json().catch(() => ({ error: 'Failed to update team member' }));
            setTeamMembers(teamMembers);
            showToast(errorData.error || 'Failed to update team member', 'error');
            logger.error('Failed to update team member', errorData, 'Team');
          }
        } catch (e) {
          // Revert on error
          setTeamMembers(teamMembers);
          logger.error('Error updating team member', e, 'Team');
        }
      })();
    } else {
      // Add new member
      const tempId = `temp-${Date.now()}`; // Temporary ID for optimistic update
      const newMember = { ...form, _id: tempId };
      const newMembers = [newMember, ...teamMembers];
      setTeamMembers(newMembers);
      (async () => {
        try {
          const token = session.getToken();
          logger.debug("Token from session retrieved", null, 'Team');
          if (!token) {
            setTeamMembers(teamMembers); // Revert
            logger.warn("No token available, cannot create team member", null, 'Team');
            return;
          }
          // Don't send _id to backend; let the backend generate it
          const { _id, ...memberData } = form;
          logger.debug("Sending member data to backend", memberData, 'Team');
          const res = await fetch(`${API_BASE_URL}/team`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(memberData),
          });
          logger.debug(`Response status: ${res.status}`, null, 'Team');
          if (res.ok) {
            const created = await res.json();
            logger.debug("Team member created successfully", created, 'Team');
            setTeamMembers((prev) => prev.map((m) => (m._id === tempId ? created : m)));
          } else {
            const errorData = await res.json().catch(() => ({ error: 'Failed to create team member' }));
            logger.error(`Failed to create team member. Status: ${res.status}`, errorData, 'Team');
            // Revert on error and show error to user
            setTeamMembers(teamMembers);
            showToast(errorData.error || 'Failed to create team member', 'error');
          }
        } catch (e) {
          // Revert on error
          setTeamMembers(teamMembers);
          logger.error('Error creating team member', e, 'Team');
        }
      })();
    }

    setIsModalOpen(false);
  };

  const deleteMember = async (id) => {
    const ok = await confirm('Delete this team member?');
    if (!ok) return;
    const memberToDelete = teamMembers.find(m => m._id === id);
    setTeamMembers((prev) => prev.filter((m) => m._id !== id));
    // Fire-and-forget server delete
    (async () => {
      try {
        const token = session.getToken();
        if (!token) {
          // Revert on error
          setTeamMembers((prev) => [...prev, memberToDelete]);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/team/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          // Revert on error
          setTeamMembers((prev) => [...prev, memberToDelete]);
          console.error('Failed to delete team member');
        }
      } catch (e) {
        // Revert on error
        setTeamMembers((prev) => [...prev, memberToDelete]);
        console.error('Error deleting team member:', e);
      }
    })();
  };
  
  // Payment management functions
  const openPaymentModal = (member) => {
    setSelectedMemberForPayment(member);
    setPaymentForm({
      eventId: '',
      eventName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: ''
    });
    setPaymentErrors({});
    // compute events available for this member (by name or by id)
    try {
      const memberId = member?._id;
      const memberName = member?.name;
      const filtered = (events || []).filter(ev => {
        if (!ev) return false;
        // support event.team as array of names
        if (Array.isArray(ev.team) && ev.team.length > 0) {
          return ev.team.includes(memberName) || ev.team.includes(memberId) || ev.team.includes(String(memberId));
        }
        // support event.teamIds or event.memberIds
        if (Array.isArray(ev.teamIds) && ev.teamIds.length > 0) {
          return ev.teamIds.includes(memberId) || ev.teamIds.includes(String(memberId));
        }
        if (Array.isArray(ev.memberIds) && ev.memberIds.length > 0) {
          return ev.memberIds.includes(memberId) || ev.memberIds.includes(String(memberId));
        }
        // fallback: check if event has a 'team' string list in services or other fields
        if (typeof ev.team === 'string' && memberName) {
          return ev.team.split(',').map(s => s.trim()).includes(memberName);
        }
        return false;
      });
      setEventsForMember(filtered);
    } catch (e) {
      setEventsForMember([]);
    }

    setIsPaymentModalOpen(true);
  };

  const openPaymentsForMember = (member) => {
    setPaymentsViewerMember(member);
    setIsPaymentsViewOpen(true);
  };

  const closePaymentsViewer = () => {
    setIsPaymentsViewOpen(false);
    setPaymentsViewerMember(null);
    setPaymentsPage(1);
    setPaymentsSearch('');
  };

  const handlePaymentsSearch = (e) => {
    setPaymentsSearch(e.target.value || '');
    setPaymentsPage(1);
  };
  
  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedMemberForPayment(null);
  };
  
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
    
    // Auto-fill event name when event is selected
    if (name === 'eventId' && value) {
      // Compare IDs as strings to tolerate numbers vs strings in storage
      const selectedEvent = events.find(ev => String(ev.id) === String(value));
      if (selectedEvent) {
        setPaymentForm((prev) => ({
          ...prev,
          eventName: selectedEvent.clientName || `Event ${selectedEvent.quotationId || selectedEvent.id}`
        }));
      }
    }
  };
  
  const validatePayment = () => {
    const err = {};
    if (!paymentForm.eventId) err.eventId = 'Please select an event';
    if (!paymentForm.amount || isNaN(paymentForm.amount) || Number(paymentForm.amount) <= 0) {
      err.amount = 'Enter a valid amount';
    }
    if (!paymentForm.date) err.date = 'Payment date is required';
    return err;
  };
  
  const savePayment = () => {
    const validation = validatePayment();
    if (Object.keys(validation).length) {
      setPaymentErrors(validation);
      return;
    }
    
    const payment = {
      eventId: paymentForm.eventId,
      eventName: paymentForm.eventName,
      amount: parseFloat(paymentForm.amount),
      date: paymentForm.date,
      status: paymentForm.status,
      notes: paymentForm.notes
    };
    
    const updatedMembers = teamMembers.map((m) => {
      if (m._id === selectedMemberForPayment._id) {
        const payments = Array.isArray(m.payments) ? [...m.payments, payment] : [payment];
        return { ...m, payments };
      }
      return m;
    });
    
  setTeamMembers(updatedMembers);
  // If payments viewer is open for this member, refresh it so the table updates instantly
  setPaymentsViewerMember((prev) => (prev && prev._id === selectedMemberForPayment?._id ? updatedMembers.find(m => m._id === selectedMemberForPayment._id) : prev));
  // Persist member payments by updating the member on server
  (async () => {
    try {
      const token = session.getToken();
      if (!token) return;
      const member = updatedMembers.find(m => m._id === selectedMemberForPayment._id);
      if (!member) return;
      const res = await fetch(`${API_BASE_URL}/team/${encodeURIComponent(member._id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(member),
      });
      if (!res.ok) {
        // Revert on error
        setTeamMembers(teamMembers);
        console.error('Failed to save payment');
      }
    } catch (e) {
      // Revert on error
      setTeamMembers(teamMembers);
      console.error('Error saving payment:', e);
    }
  })();
    setIsPaymentModalOpen(false);
  };
  
  const deletePayment = async (memberId, paymentId) => {
    const ok = await confirm('Delete this payment record?');
    if (!ok) return;
    
    const memberToUpdate = teamMembers.find(m => m._id === memberId);
    const updatedMembers = teamMembers.map((m) => {
      if (m._id === memberId) {
        const payments = (m.payments || []).filter(p => p.id !== paymentId);
        return { ...m, payments };
      }
      return m;
    });
    
  setTeamMembers(updatedMembers);
  // Refresh payments viewer if it's showing this member
  setPaymentsViewerMember((prev) => (prev && prev._id === memberId ? updatedMembers.find(m => m._id === memberId) || null : prev));
  (async () => {
    try {
      const token = session.getToken();
      if (!token) {
        // Revert on error
        setTeamMembers((prev) => prev.map(m => m._id === memberId ? memberToUpdate : m));
        return;
      }
      const member = updatedMembers.find(m => m._id === memberId);
      if (!member) return;
      const res = await fetch(`${API_BASE_URL}/team/${encodeURIComponent(memberId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(member),
      });
      if (!res.ok) {
        // Revert on error
        setTeamMembers((prev) => prev.map(m => m._id === memberId ? memberToUpdate : m));
        console.error('Failed to delete payment');
      }
    } catch (e) {
      // Revert on error
      setTeamMembers((prev) => prev.map(m => m._id === memberId ? memberToUpdate : m));
      console.error('Error deleting payment:', e);
    }
  })();
  };
  
  const updatePaymentStatus = (memberId, paymentId, newStatus) => {
    const memberToUpdate = teamMembers.find(m => m._id === memberId);
    const updatedMembers = teamMembers.map((m) => {
      if (m._id === memberId) {
        const payments = (m.payments || []).map(p => 
          p.id === paymentId ? { ...p, status: newStatus } : p
        );
        return { ...m, payments };
      }
      return m;
    });
    
  setTeamMembers(updatedMembers);
  // Refresh payments viewer if it's showing this member so status change is visible immediately
  setPaymentsViewerMember((prev) => (prev && prev._id === memberId ? updatedMembers.find(m => m._id === memberId) : prev));
  (async () => {
    try {
      const token = session.getToken();
      if (!token) {
        // Revert on error
        setTeamMembers((prev) => prev.map(m => m._id === memberId ? memberToUpdate : m));
        return;
      }
      const member = updatedMembers.find(m => m._id === memberId);
      if (!member) return;
      const res = await fetch(`${API_BASE_URL}/team/${encodeURIComponent(memberId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(member),
      });
      if (!res.ok) {
        // Revert on error
        setTeamMembers((prev) => prev.map(m => m._id === memberId ? memberToUpdate : m));
        console.error('Failed to update payment status');
      }
    } catch (e) {
      // Revert on error
      setTeamMembers((prev) => prev.map(m => m._id === memberId ? memberToUpdate : m));
      console.error('Error updating payment status:', e);
    }
  })();
  };
  
  // Calculate total payments for a member
  const getTotalPayments = (member) => {
    if (!member || !member.payments || !Array.isArray(member.payments)) return 0;
    return member.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  };
  
  const getPaidAmount = (member) => {
    if (!member || !member.payments || !Array.isArray(member.payments)) return 0;
    return member.payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };
  
  const getPendingAmount = (member) => {
    if (!member || !member.payments || !Array.isArray(member.payments)) return 0;
    return member.payments
      .filter(p => p.status === 'pending' || p.status === 'partial')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Calculate global stats from all team members
  const totalMembers = teamMembers.length;
  const totalPayment = teamMembers.reduce((sum, m) => sum + getTotalPayments(m), 0);
  const totalPaid = teamMembers.reduce((sum, m) => sum + getPaidAmount(m), 0);
  const totalPending = teamMembers.reduce((sum, m) => sum + getPendingAmount(m), 0);

  // Format currency for display
  const formatCurrency = (amount) => {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };

  return (
    <div className="team">
      <div className="team__header">
        <div>
          <h1 className="team__title"><FaUsers />Team</h1>
          <p className="team__subtitle">Manage all your team members here</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Team Member</button>
      </div>

      {/* Stats Section */}
      <div className="team__stats">
        <div className="team__stat-card">
          <div className="team__stat-icon team__stat-icon--total">
            <FaUsers />
          </div>
          <div className="team__stat-info">
            <h3>{totalMembers}</h3>
            <p>Total Members</p>
          </div>
        </div>
        <div className="team__stat-card">
          <div className="team__stat-icon team__stat-icon--payment">
            <FaMoneyBillWave />
          </div>
          <div className="team__stat-info">
            <h3>{formatCurrency(totalPayment)}</h3>
            <p>Total Payment</p>
          </div>
        </div>
        <div className="team__stat-card">
          <div className="team__stat-icon team__stat-icon--paid">
            <FaCheckCircle />
          </div>
          <div className="team__stat-info">
            <h3>{formatCurrency(totalPaid)}</h3>
            <p>Paid Amount</p>
          </div>
        </div>
        <div className="team__stat-card">
          <div className="team__stat-icon team__stat-icon--pending">
            <FaClock />
          </div>
          <div className="team__stat-info">
            <h3>{formatCurrency(totalPending)}</h3>
            <p>Pending Amount</p>
          </div>
        </div>
      </div>

      <div className="team__search">
        <input
          type="search"
          placeholder="Search by name, role or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="team__grid">
        {(() => {
          const q = (searchQuery || '').trim().toLowerCase();
          const filtered = (teamMembers || []).filter((member) => {
            if (!q) return true;
            const name = String(member?.name || '').toLowerCase();
            const role = String(member?.role || '').toLowerCase();
            const phone = String(member?.phone || '').toLowerCase();
            return name.includes(q) || role.includes(q) || phone.includes(q);
          });

          if (filtered.length === 0) {
            return <div className="team__empty">No team members found.</div>;
          }

          return filtered.map((member) => (
            <div key={member._id} className="team-card" onClick={() => openPaymentsForMember(member)}>
              {/* 3-dot menu at top right */}
              <div className="team-card__menu">
                <button 
                  className="team-card__menu-button" 
                  onClick={(e) => toggleMenu(e, member._id)}
                  title="More options"
                >
                  <FaEllipsisV />
                </button>
                {openMenuId === member._id && (
                  <div className="team-card__dropdown">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); openEdit(member); }}
                      className="dropdown-item"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); deleteMember(member._id); }}
                      className="dropdown-item dropdown-item--danger"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="team-card__avatar">
                {member.name ? String(member.name).charAt(0) : '?'}
              </div>
              <h3 className="team-card__name">{highlightText(member.name, searchQuery)}</h3>
              <p className="team-card__role">{highlightText(member.role, searchQuery)}</p>
              {member.phone && <p className="team-card__phone">{highlightText(member.phone, searchQuery)}</p>}
              <p className="team-card__email">{member.email}</p>

              <div className="team-card__actions">
                <button
                  className="btn-primary btn-whatsapp"
                  onClick={(e) => openWhatsApp(e, member.phone)}
                  title="Open WhatsApp"
                  aria-label={`Open WhatsApp for ${member?.name || 'member'}`}
                >
                  <FaWhatsapp />
                </button>
                <button
                  className="btn-primary btn-view-payments"
                  onClick={(e) => { e.stopPropagation(); openPaymentsForMember(member); }}
                  title={`View payments - ${member?.name || ''}`}
                  aria-label={`View payments for ${member?.name || 'member'}`}
                >
                  <FaReceipt />
                </button>
                <button
                  className="btn-primary btn-add-payment"
                  onClick={(e) => { e.stopPropagation(); openPaymentModal(member); }}
                  title="Add Payment"
                  aria-label={`Add payment for ${member?.name || 'member'}`}
                >
                  <FaPlusCircle />
                </button>
              </div>
            </div>
          ));
        })()}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingMember ? 'Edit Team Member' : 'Add Team Member'} size="small">
        <div className="team-form">
          <label className="team-form__label">Name</label>
          <input name="name" value={form.name} onChange={handleChange} className="team-form__input" />
          {errors.name && <div className="team-form__error">{errors.name}</div>}

          <label className="team-form__label">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="team-form__input" />
          {errors.phone && <div className="team-form__error">{errors.phone}</div>}

          <label className="team-form__label">Email</label>
          <input name="email" value={form.email} onChange={handleChange} className="team-form__input" />
          {errors.email && <div className="team-form__error">{errors.email}</div>}

          <label className="team-form__label">Role</label>
          <input name="role" value={form.role} onChange={handleChange} className="team-form__input" />
          {errors.role && <div className="team-form__error">{errors.role}</div>}



          <div className="modal-actions">
            <button className="btn-primary btn-cancel" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={saveMember}>Save</button>
          </div>
        </div>
      </Modal>
      
      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={closePaymentModal} 
        title={`Add Payment - ${selectedMemberForPayment?.name || ''}`}
        size="small"
      >
        <div className="team-form">
          <label className="team-form__label">Event</label>
          <select 
            name="eventId" 
            value={paymentForm.eventId} 
            onChange={handlePaymentChange} 
            className="team-form__input"
          >
            <option value="">Select Event</option>
            {eventsForMember.length === 0 ? (
              <option value="" disabled>No events for this member</option>
            ) : (
              eventsForMember.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.clientName || `Event ${event.quotationId || event.id}`} - {formatDate(event.services?.[0]?.date) || 'No date'}
                </option>
              ))
            )}
          </select>
          {paymentErrors.eventId && <div className="team-form__error">{paymentErrors.eventId}</div>}

          <label className="team-form__label">Amount (₹)</label>
          <input 
            type="decimal"
            name="amount" 
            value={paymentForm.amount} 
            onChange={handlePaymentChange} 
            className="team-form__input"
            placeholder="0"
            step="1"
            min="0"
          />
          {paymentErrors.amount && <div className="team-form__error">{paymentErrors.amount}</div>}

          <label className="team-form__label">Payment Date</label>
          <input 
            type="date" 
            name="date" 
            value={paymentForm.date} 
            onChange={handlePaymentChange} 
            className="team-form__input"
          />
          {paymentErrors.date && <div className="team-form__error">{paymentErrors.date}</div>}

          <label className="team-form__label">Status</label>
          <select 
            name="status" 
            value={paymentForm.status} 
            onChange={handlePaymentChange} 
            className="team-form__input"
          >
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>

          <label className="team-form__label">Notes (Optional)</label>
          <textarea 
            name="notes" 
            value={paymentForm.notes} 
            onChange={handlePaymentChange} 
            className="team-form__input"
            rows="3"
            placeholder="Add any notes about this payment..."
          />

          <div className="modal-actions">
            <button className="btn-primary" onClick={savePayment}>Add Payment</button>
            <button className="btn-primary btn-cancel" onClick={closePaymentModal}>Cancel</button>
          </div>
        </div>
      </Modal>

      {/* Payments Viewer Modal (table) */}
      <Modal
        isOpen={isPaymentsViewOpen}
        onClose={closePaymentsViewer}
        title={`Payments - ${paymentsViewerMember?.name || ''}`}
        size="large"
      >
        <div className="payments-viewer">
          <div className="payments-viewer__header">
            <div className="payments-viewer__stat">
              <div className="label">Total</div>
              <div className="value">₹{Math.round(getTotalPayments(paymentsViewerMember))}</div>
            </div>
            <div className="payments-viewer__stat">
              <div className="label">Paid</div>
              <div className="value paid">₹{Math.round(getPaidAmount(paymentsViewerMember))}</div>
            </div>
            <div className="payments-viewer__stat">
              <div className="label">Pending</div>
              <div className="value pending">₹{Math.round(getPendingAmount(paymentsViewerMember))}</div>
            </div>
          </div>
          <div className="payments-viewer__search">
            <input
              type="search"
              placeholder="Search by anything..."
              value={paymentsSearch}
              onChange={handlePaymentsSearch}
            />
          </div>
          <div className="payments-table">
          {paymentsViewerMember && (!paymentsViewerMember.payments || paymentsViewerMember.payments.length === 0) && (
            <p>No payments recorded for this member.</p>
          )}

          {paymentsViewerMember && paymentsViewerMember.payments && paymentsViewerMember.payments.length > 0 && (
            <>
              <div className="payments-table-scrollable">
                <table>
                  <thead>
                    <tr>
                      <th>Event ID</th>
                      <th>Event</th>
                      <th>Payment</th>
                      <th>Payment Date</th>
                      <th>Status</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const q = (paymentsSearch || '').trim().toLowerCase();
                      const allPayments = paymentsViewerMember.payments.slice().reverse().filter((p) => {
                        if (!q) return true;
                        const eventId = String(p.eventId || '').toLowerCase();
                        const eventName = String(p.eventName || '').toLowerCase();
                        const amount = String(p.amount || '').toLowerCase();
                        const dateStr = String(formatDate(p.date)).toLowerCase();
                        return (
                          eventId.includes(q) ||
                          eventName.includes(q) ||
                          amount.includes(q) ||
                          dateStr.includes(q)
                        );
                      });
                      const totalPages = Math.ceil(allPayments.length / itemsPerPage);
                      const paginatedPayments = allPayments.slice((paymentsPage - 1) * itemsPerPage, paymentsPage * itemsPerPage);
                      return paginatedPayments.map((p) => {
                        // displayEventId: prefer stored payment.eventId, otherwise try to resolve from events list
                        const matchedEvent = events.find(ev => String(ev.id) === String(p.eventId));
                        const displayEventId = p.eventId || (matchedEvent ? matchedEvent.id : '—');
                        const displayEventName = p.eventName || (matchedEvent ? (matchedEvent.clientName || `Event ${matchedEvent.quotationId || matchedEvent.id}`) : 'Unnamed Event');
                        return (
                            <tr key={p.id}>
                              <td>{highlightText(displayEventId, paymentsSearch)}</td>
                              <td>{highlightText(displayEventName, paymentsSearch)}</td>
                              <td>₹{highlightText(Math.round(p.amount || 0), paymentsSearch)}</td>
                              <td>{highlightText(formatDate(p.date), paymentsSearch)}</td>
                              <td className={`payment-status status-${p.status}`}>{p.status}</td>
                              <td>{highlightText(p.notes || '', paymentsSearch)}</td>
                              <td>
                                {p.status !== 'paid' && (
                                  <button className="btn-status-change" onClick={() => updatePaymentStatus(paymentsViewerMember._id, p.id, 'paid')}>Mark Paid</button>
                                )}
                                <button className="btn-delete-payment" onClick={() => deletePayment(paymentsViewerMember._id, p.id)} title="Delete"><FaTrash /></button>
                              </td>
                            </tr>
                          );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              {(() => {
                const q = (paymentsSearch || '').trim().toLowerCase();
                const allPayments = paymentsViewerMember.payments.slice().reverse().filter((p) => {
                  if (!q) return true;
                  const eventId = String(p.eventId || '').toLowerCase();
                  const eventName = String(p.eventName || '').toLowerCase();
                  const amount = String(p.amount || '').toLowerCase();
                  const dateStr = String(formatDate(p.date)).toLowerCase();
                  return (
                    eventId.includes(q) ||
                    eventName.includes(q) ||
                    amount.includes(q) ||
                    dateStr.includes(q)
                  );
                });
                const totalPages = Math.ceil(allPayments.length / itemsPerPage);
                if (totalPages > 1) {
                  return (
                    <div className="pagination-controls">
                      <button 
                        onClick={() => setPaymentsPage(Math.max(1, paymentsPage - 1))} 
                        disabled={paymentsPage === 1}
                      >
                        Previous
                      </button>
                      <span>Page {paymentsPage} of {totalPages}</span>
                      <button 
                        onClick={() => setPaymentsPage(Math.min(totalPages, paymentsPage + 1))} 
                        disabled={paymentsPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Team;
