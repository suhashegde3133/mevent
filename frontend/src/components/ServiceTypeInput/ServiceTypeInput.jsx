import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaTimes } from 'react-icons/fa';
import './ServiceTypeInput.scss';

const ServiceTypeInput = ({ value = '', onChange, availableServices = [], onNewService }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter services based on search query
  const filteredServices = availableServices.filter(service => {
    const name = (service.name || service).toString().toLowerCase();
    const query = searchQuery.toLowerCase();
    return query === '' || name.includes(query);
  });

  // Check if the current value is a new service (not in available list)
  const isNewService = (serviceName) => {
    if (!serviceName || !serviceName.trim()) return false;
    const trimmed = serviceName.trim().toLowerCase();
    return !availableServices.some(s => {
      const name = (s.name || s).toString().toLowerCase();
      return name === trimmed;
    });
  };

  // Save new service if it doesn't exist
  const saveNewServiceIfNeeded = (serviceName) => {
    if (isNewService(serviceName) && onNewService) {
      onNewService(serviceName.trim());
    }
  };

  // Sync internal search state with external value prop
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    onChange(val);
    setHighlightedIndex(-1);
    if (val.length > 0) {
      setIsOpen(true);
    }
  };

  // Handle service selection
  const handleSelectService = (service) => {
    const name = service.name || service;
    setSearchQuery(name);
    onChange(name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen && e.key !== 'ArrowDown') return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          prev < filteredServices.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredServices.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredServices[highlightedIndex]) {
          handleSelectService(filteredServices[highlightedIndex]);
        } else if (searchQuery.trim()) {
          // Save as new service if it doesn't exist
          saveNewServiceIfNeeded(searchQuery);
          onChange(searchQuery.trim());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        // On tab, save new service if needed before moving to next field
        if (searchQuery.trim() && isNewService(searchQuery)) {
          saveNewServiceIfNeeded(searchQuery);
        }
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Handle blur - save new service when focus leaves
  const handleBlur = () => {
    // Delay to allow click events on dropdown items to fire first
    setTimeout(() => {
      if (searchQuery.trim() && isNewService(searchQuery)) {
        saveNewServiceIfNeeded(searchQuery);
      }
    }, 150);
  };

  // Clear input
  const handleClear = () => {
    setSearchQuery('');
    onChange('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="service-type-input" ref={containerRef}>
      <div className="service-type-input__wrapper">
        <div className="service-type-input__input-group">
          <input
            ref={inputRef}
            type="text"
            className="service-type-input__input"
            placeholder="Select or type a service..."
            value={searchQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => searchQuery.length > 0 && setIsOpen(true)}
            onBlur={handleBlur}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              className="service-type-input__clear"
              onClick={handleClear}
              type="button"
              title="Clear"
            >
              <FaTimes />
            </button>
          )}
          <button
            className="service-type-input__toggle"
            onClick={() => {
              setIsOpen(!isOpen);
              inputRef.current?.focus();
            }}
            type="button"
            title="Toggle dropdown"
          >
            <FaChevronDown />
          </button>
        </div>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="service-type-input__dropdown" ref={dropdownRef}>
            {filteredServices.length > 0 ? (
              <ul className="service-type-input__list">
                {filteredServices.map((service, index) => (
                  <li
                    key={index}
                    className={`service-type-input__item ${
                      index === highlightedIndex
                        ? 'service-type-input__item--highlighted'
                        : ''
                    }`}
                    onClick={() => handleSelectService(service)}
                  >
                    <span className="service-type-input__item-name">
                      {service.name || service}
                    </span>
                    {service.price && (
                      <span className="service-type-input__item-price">
                        ₹{Number(service.price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : searchQuery.trim() ? (
              <div className="service-type-input__no-results">
                <p>No services found</p>
                <p className="service-type-input__no-results-hint">
                  Press Enter to add "{searchQuery}" as a custom service
                </p>
              </div>
            ) : (
              <div className="service-type-input__empty">
                <p>No services available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceTypeInput;
