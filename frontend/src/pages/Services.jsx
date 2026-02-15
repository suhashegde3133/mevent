import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FaConciergeBell,
  FaEdit, 
  FaPlus, 
  FaTrash,
  FaRupeeSign
  ,FaBriefcase
  ,FaSearch
} from 'react-icons/fa';
import Modal from '../components/Modal/Modal';
import { storage } from '../utils/storage';
import useConfirm from '../hooks/useConfirm';
import { STORAGE_KEYS, API_BASE_URL } from '../utils/constants';
import session from '../utils/session';
import './Services.scss';

const Services = () => {
  // start with persisted services if available
  const [services, setServices] = useState(() => {
    const persisted = storage.getJSON(STORAGE_KEYS.SERVICES, null);
    return Array.isArray(persisted) ? persisted : [];
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState('default');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    basePrice: '',
    deliverables: [],
    features: []
  });
  const [formErrors, setFormErrors] = useState({});
  const confirm = useConfirm();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Get unique categories dynamically from services
  const getUniqueCategories = () => {
    const cats = new Set(services.map(s => s.category).filter(Boolean));
    // include current form value so newly-entered category shows in the select
    if (formData && formData.category) {
      const c = String(formData.category).trim();
      if (c) cats.add(c);
    }
    return ['all', ...Array.from(cats).sort()];
  };

  const handleAddService = () => {
    setEditingService(null);
    setShowNewCategoryInput(false);
    setNewCategoryInput('');
    setFormErrors({});
    setFormData({
      name: '',
      category: '',
      description: '',
      basePrice: '',
      deliverables: [],
      features: []
    });
    setShowAddModal(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setShowNewCategoryInput(false);
    setNewCategoryInput('');
    setFormErrors({});
    setFormData({
      name: service.name,
      category: service.category,
      description: service.description,
      basePrice: service.basePrice,
      deliverables: [...(service.deliverables || [])],
      features: [...(service.features || [])]
    });
    setShowAddModal(true);
  };

  const handleDeleteService = async (serviceId) => {
    const ok = await confirm('Are you sure you want to delete this service?');
    if (!ok) return;

    // Store original services for rollback
    const previousServices = services;
    
    // Optimistic UI update
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    
    // Attempt delete on server
    try {
      const token = session.getToken();
      if (!token) {
        // No token, restore services
        setServices(previousServices);
        return;
      }
      // Use _id if available, otherwise use id
      const deleteId = previousServices.find(s => s.id === serviceId)?._id || serviceId;
      const res = await fetch(`${API_BASE_URL}/services/${encodeURIComponent(deleteId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // Delete failed, restore services
        setServices(previousServices);
        console.error('Failed to delete service:', res.statusText);
      }
    } catch (e) {
      // Error during delete, restore services
      setServices(previousServices);
      console.error('Error deleting service:', e);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Service name is required';
    }
    if (!formData.category || !formData.category.trim()) {
      errors.category = 'Category is required';
    }
    if (!formData.basePrice || parseFloat(formData.basePrice) <= 0) {
      errors.basePrice = 'A valid price is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    if (editingService) {
      const previousServices = services;
      const updatedService = { ...editingService, name: formData.name, category: formData.category, description: formData.description, basePrice: formData.basePrice };
      
      // Update existing service (optimistic)
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingService.id ? updatedService : s
        )
      );
      
      try {
        const token = session.getToken();
        if (!token) {
          setServices(previousServices);
          return;
        }
        // Use _id if available, otherwise use id
        const updateId = editingService._id || editingService.id;
        const res = await fetch(`${API_BASE_URL}/services/${encodeURIComponent(updateId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(updatedService),
        });
        if (!res.ok) {
          // Update failed, restore services
          setServices(previousServices);
          console.error('Failed to update service:', res.statusText);
          return;
        }
        const updated = await res.json();
        setServices((prev) => prev.map((s) => (s.id === editingService.id ? updated : s)));
      } catch (e) {
        // Error during update, restore services
        setServices(previousServices);
        console.error('Error updating service:', e);
      }
    } else {
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newService = {
        id: newId,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        basePrice: formData.basePrice,
        deliverables: formData.deliverables || [],
        features: formData.features || [],
      };
      // Optimistic add
      setServices((prev) => [...prev, newService]);
      
      try {
        const token = session.getToken();
        if (!token) {
          // No token, remove the optimistically added service
          setServices((prev) => prev.filter((s) => s.id !== newId));
          return;
        }
        const res = await fetch(`${API_BASE_URL}/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(newService),
        });
        if (res.ok) {
          const created = await res.json();
          setServices((prev) => prev.map((s) => (s.id === newService.id ? created : s)));
        } else {
          // Add failed, remove optimistic service
          setServices((prev) => prev.filter((s) => s.id !== newId));
          console.error('Failed to add service:', res.statusText);
        }
      } catch (e) {
        // Error during add, remove optimistic service
        setServices((prev) => prev.filter((s) => s.id !== newId));
        console.error('Error adding service:', e);
      }
    }
    setShowAddModal(false);
  };

  const location = useLocation();

  useEffect(() => {
    // Try to load services from server when authenticated. Fall back to local state.
    const load = async () => {
      try {
        const token = session.getToken();
        if (!token) return; // not authenticated
        const res = await fetch(`${API_BASE_URL}/services`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setServices(data);
      } catch (e) {
        // ignore - keep local state
      }
    };
    load();

    if (location?.state?.openAdd) {
      handleAddService();
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFormArray = (field, index, value) => {
    // no-op: arrays removed from modal UI but keep function for compatibility
    const newArray = [...(formData[field] || [])];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addFormArrayItem = (field) => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ''] });
  };

  const removeFormArrayItem = (field, index) => {
    setFormData({ 
      ...formData, 
      [field]: (formData[field] || []).filter((_, i) => i !== index) 
    });
  };

  const getFilteredServices = () => {
    const q = (searchQuery || '').toString().trim().toLowerCase();
    // Extract only digits and decimal point for a numeric comparison (e.g. "5000" or "₹5,000")
    const numericPart = (searchQuery || '').toString().replace(/[^0-9.]/g, '');
    const parsedNumber = numericPart === '' ? NaN : Number(numericPart);

    const results = services.filter(service => {
      const cat = service?.category || '';
      const name = (service?.name || '').toString().toLowerCase();
      const desc = (service?.description || '').toString().toLowerCase();
      const priceStr = service?.basePrice != null ? service.basePrice.toString() : '';

      const matchesCategory = filterCategory === 'all' || cat === filterCategory;

      // Textual match (name or description)
      const matchesText = q === '' || name.includes(q) || desc.includes(q);

      // Price match: if query contains digits, allow matching numeric value or substring of price
      const matchesPrice = (!isNaN(parsedNumber) && numericPart !== '')
        ? (Number(service.basePrice) === parsedNumber || priceStr.includes(parsedNumber.toString()))
        : false;

      // Combine text and price matches: if query is empty we pass through, otherwise either text or price match is enough
      const matchesSearch = q === '' ? true : (matchesText || matchesPrice);

      return matchesCategory && matchesSearch;
    });

    // Apply price sorting if requested
    if (priceSort === 'low') {
      return results.slice().sort((a, b) => (Number(a.basePrice) || 0) - (Number(b.basePrice) || 0));
    }
    if (priceSort === 'high') {
      return results.slice().sort((a, b) => (Number(b.basePrice) || 0) - (Number(a.basePrice) || 0));
    }

    return results;
  };

  const getCategoryIcon = (category) => {
    // Always use the concierge bell icon for consistency across cards
    return <FaConciergeBell />;
  };

  const filteredServices = getFilteredServices();

  // Pagination calculations
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchQuery, priceSort]);

  // Count unique categories (exclude the 'all' placeholder)
  const categoryCount = Math.max(0, getUniqueCategories().filter(c => c !== 'all').length);

  // persist whenever services change (sync to server only)
  useEffect(() => {
    try { storage.setJSONAndSync(STORAGE_KEYS.SERVICES, services); } catch (e) {}
  }, [services]);

  return (
    <div className="services">
      {/* Header */}
      <div className="services__header">
        <div className="services__title-section">
          <h1 className="services__title">
            <FaConciergeBell />
            Services & Packages
          </h1>
          <p className="services__subtitle">
            Manage your all services and category offerings
          </p>
        </div>
        <button className="btn-primary" onClick={handleAddService}>
          <FaPlus />
          Add New Service
        </button>
      </div>

       {/* Stats Cards */}
      <div className="services__stats">
        <div className="services__stat-card">
          <div className="services__stat-icon services__stat-icon--indigo">
            <FaConciergeBell className="services__stat-svg--indigo" />
          </div>
          <div className="services__stat-info">
            <h3>{services.length}</h3>
            <p>Total Services</p>
          </div>
        </div>

        <div className="services__stat-card">
          <div className="services__stat-icon services__stat-icon--indigo">
            <FaBriefcase className="services__stat-svg--indigo" />
          </div>
          <div className="services__stat-info">
            <h3>{categoryCount}</h3>
            <p>Total Categories</p>
          </div>
        </div>
        
        <div className="services__stat-card">
          <div className="services__stat-icon services__stat-icon--sky">
            <FaRupeeSign className="services__stat-svg--sky" />
          </div>
          <div className="services__stat-info">
            <h3>{Number(services.reduce((sum, s) => sum + (Number(s.basePrice) || 0), 0)).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</h3>
            <p>Total Value</p>
          </div>
        </div>
        
      </div>


      {/* Toolbar */}
      <div className="services__toolbar">
        <div className="services__search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="services__filters">
          <div className="services__filter">
            <label>Price:</label>
            <select value={priceSort} onChange={(e) => setPriceSort(e.target.value)}>
              <option value="default">Default</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
          </div>
          <div className="services__filter">
            <label>Category:</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              {getUniqueCategories().map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="services__content">
        {filteredServices.length === 0 ? (
          <div className="services__empty">
            <FaConciergeBell />
            <h3>No services found</h3>
            <p>Try adjusting your filters or add a new service</p>
          </div>
        ) : (
          <div className="services__grid">
            {paginatedServices.map(service => (
              <div key={service.id} className={`services__card`}>
                
                <div className="services__card-header">
                  <div className="services__card-icon">
                    {getCategoryIcon(service.category)}
                  </div>
                  <div className="services__card-actions">
                    <button 
                      className="services__action-btn services__action-btn--edit"
                      onClick={() => handleEditService(service)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      className="services__action-btn services__action-btn--delete"
                      onClick={() => handleDeleteService(service.id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="services__card-body">
                  <span className="services__category">{service.category}</span>
                  <h3 className="services__card-title">{service.name}</h3>
                  {service.description ? <p className="services__description">{service.description}</p> : null}

                 
                    {/* Only showing basic info per requirement */}
                  </div>

                  {/* deliverables and features intentionally hidden per requirement */}

                

                <div className="services__card-footer">
                  <div className="services__price">
                    <span className="services__price-label">Starting at</span>
                    <span className="services__price-value">{Number(service.basePrice).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
                  </div>
                  {/* status removed per request */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      <Modal
        isOpen={showAddModal}
        title={editingService ? 'Edit Service' : 'Add New Service'}
        onClose={() => setShowAddModal(false)}
      >
        <div className="services__form">
            <div className="services__form-group">
              <label>Service Name <span className="required">*</span></label>
              <input
                type="text"
                placeholder="e.g., Wedding Photography"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                className={formErrors.name ? 'input-error' : ''}
              />
              {formErrors.name && <span className="error-message">{formErrors.name}</span>}
            </div>

            <div className="services__form-row">
              <div className="services__form-group">
                <label>Category <span className="required">*</span></label>
                {!showNewCategoryInput ? (
                  <div className="services__category-selector">
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setShowNewCategoryInput(true);
                          setNewCategoryInput('');
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                          if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                        }
                      }}
                      className={`services__category-select ${formErrors.category ? 'input-error' : ''}`}
                    >
                      <option value="">-- Select Category --</option>
                      {getUniqueCategories()
                        .filter(c => c !== 'all')
                        .map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      <option value="__ADD_NEW__" className="services__add-new-option">
                        + Add New Category
                      </option>
                    </select>
                    {formErrors.category && <span className="error-message">{formErrors.category}</span>}
                  </div>
                ) : (
                  <div className="services__category-input-wrapper">
                    <div className="services__category-input-group">
                      <input
                        type="text"
                        placeholder="Enter new category name"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        autoFocus
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newCategoryInput.trim()) {
                            setFormData({ ...formData, category: newCategoryInput.trim() });
                            setShowNewCategoryInput(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="services__category-btn services__category-btn--confirm"
                        onClick={() => {
                          if (newCategoryInput.trim()) {
                            setFormData({ ...formData, category: newCategoryInput.trim() });
                            setShowNewCategoryInput(false);
                          }
                        }}
                        title="Confirm"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="services__category-btn services__category-btn--cancel"
                        onClick={() => setShowNewCategoryInput(false)}
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="services__form-group">
                <label>Base Price (₹) <span className="required">*</span></label>
                <input
                  type="number"
                  placeholder="0"
                  value={formData.basePrice}
                  onChange={(e) => {
                    setFormData({ ...formData, basePrice: parseFloat(e.target.value) || '' });
                    if (formErrors.basePrice) setFormErrors({ ...formErrors, basePrice: '' });
                  }}
                  className={formErrors.basePrice ? 'input-error' : ''}
                />
                {formErrors.basePrice && <span className="error-message">{formErrors.basePrice}</span>}
              </div>
            </div>

            <div className="services__form-group">
              <label>Description (optional)</label>
              <textarea
                placeholder="Brief description of the service (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            {/* Only basic fields required: name, basePrice (description optional, category kept) */}

            {/* Popular/Active checkboxes removed per request */}

            <div className="services__form-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSubmit}
                disabled={!formData.name || !formData.category || !formData.basePrice}
              >
                {editingService ? 'Update' : 'Save'}
              </button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Services;
