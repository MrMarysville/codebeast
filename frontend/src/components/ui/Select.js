import React, { useState, useRef, useEffect, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FiChevronDown, FiX, FiAlertCircle, FiCheckCircle, FiSearch } from 'react-icons/fi';
import './Select.css';

/**
 * Select Component
 * 
 * A reusable select component with support for single and multiple selection,
 * option groups, searching, and custom rendering.
 * 
 * @component
 * @version 1.0.0
 */
export const metadata = {
  componentName: "Select",
  description: "Reusable select component with advanced selection features",
  version: "1.0.0",
  author: "Code Beast Team",
  keywords: ["select", "dropdown", "form", "options", "multi-select"]
};

const Select = forwardRef(({
  id,
  label,
  value,
  defaultValue,
  options = [],
  onChange,
  onBlur,
  onFocus,
  placeholder = 'Select an option',
  noOptionsMessage = 'No options available',
  name,
  required = false,
  disabled = false,
  readOnly = false,
  error = null,
  success = false,
  helperText = '',
  multiple = false,
  searchable = false,
  clearable = false,
  renderOption,
  renderValue,
  size = 'medium',
  fullWidth = false,
  className = '',
  maxMenuHeight = 250,
  isLoading = false,
  ...props
}, ref) => {
  // Internal state
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    multiple ? (value || defaultValue || []) : (value || defaultValue || '')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const selectRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const mergedRef = ref || selectRef;
  
  // Flattened options for easier handling
  const flattenedOptions = options.reduce((acc, option) => {
    if (option.options) {
      // It's an option group
      return [...acc, ...option.options];
    }
    return [...acc, option];
  }, []);
  
  // Filtered options based on search query
  const filteredOptions = searchQuery && searchable
    ? options.map(option => {
        if (option.options) {
          // It's an option group
          return {
            ...option,
            options: option.options.filter(subOption => 
              subOption.label.toLowerCase().includes(searchQuery.toLowerCase())
            )
          };
        }
        return option.label.toLowerCase().includes(searchQuery.toLowerCase()) ? option : null;
      }).filter(Boolean)
    : options;
  
  // Check if filteredOptions is empty (for all groups)
  const hasNoOptions = filteredOptions.length === 0 || 
    (filteredOptions.every(option => 
      option.options ? option.options.length === 0 : false
    ) && filteredOptions.filter(option => !option.options).length === 0);
  
  // Find selected option(s) label(s)
  const findOptionLabel = (val) => {
    const option = flattenedOptions.find(opt => opt.value === val);
    return option ? option.label : '';
  };
  
  // Format display value
  const formatDisplayValue = () => {
    if (!internalValue || (Array.isArray(internalValue) && internalValue.length === 0)) {
      return placeholder;
    }
    
    if (multiple) {
      if (renderValue) {
        return renderValue(internalValue);
      }
      
      const selectedCount = internalValue.length;
      if (selectedCount <= 2) {
        return internalValue.map(val => findOptionLabel(val)).join(', ');
      }
      return `${selectedCount} items selected`;
    }
    
    if (renderValue) {
      return renderValue(internalValue);
    }
    
    return findOptionLabel(internalValue) || placeholder;
  };
  
  // Handle click on option
  const handleOptionClick = (optionValue) => {
    if (disabled || readOnly) return;
    
    if (multiple) {
      const newValue = internalValue.includes(optionValue)
        ? internalValue.filter(v => v !== optionValue)
        : [...internalValue, optionValue];
      
      setInternalValue(newValue);
      
      if (onChange) {
        const event = {
          target: { name, value: newValue },
          currentTarget: { name, value: newValue }
        };
        onChange(event);
      }
    } else {
      setInternalValue(optionValue);
      setIsOpen(false);
      
      if (onChange) {
        const event = {
          target: { name, value: optionValue },
          currentTarget: { name, value: optionValue }
        };
        onChange(event);
      }
    }
  };
  
  // Handle clear 
  const handleClear = (e) => {
    e.stopPropagation();
    
    const newValue = multiple ? [] : '';
    setInternalValue(newValue);
    
    if (onChange) {
      const event = {
        target: { name, value: newValue },
        currentTarget: { name, value: newValue }
      };
      onChange(event);
    }
  };
  
  // Handle toggling the dropdown
  const handleToggle = () => {
    if (disabled || readOnly) return;
    
    setIsOpen(!isOpen);
    
    if (!isOpen && searchable) {
      // Focus on search input when opening
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 10);
    }
  };
  
  // Handle focus
  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(e);
    }
  };
  
  // Handle blur
  const handleBlur = (e) => {
    // Only blur if the related target is outside our component
    if (!selectRef.current?.contains(e.relatedTarget)) {
      setIsFocused(false);
      setIsOpen(false);
      
      if (onBlur) {
        onBlur(e);
      }
    }
  };
  
  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);
  
  // Determine container CSS classes
  const containerClasses = [
    'select-container',
    `size-${size}`,
    fullWidth ? 'full-width' : '',
    className
  ].filter(Boolean).join(' ');
  
  // Determine select wrapper CSS classes
  const selectWrapperClasses = [
    'select-wrapper',
    isOpen ? 'open' : '',
    isFocused ? 'focused' : '',
    disabled ? 'disabled' : '',
    readOnly ? 'readonly' : '',
    error ? 'error' : '',
    success ? 'success' : '',
    multiple ? 'multiple' : ''
  ].filter(Boolean).join(' ');
  
  // Render an option
  const renderOptionItem = (option, isGroupOption = false) => {
    if (!option) return null;
    
    const isSelected = multiple 
      ? internalValue.includes(option.value)
      : internalValue === option.value;
    
    const optionClasses = [
      'select-option',
      isSelected ? 'selected' : '',
      option.disabled ? 'disabled' : '',
      isGroupOption ? 'group-option' : ''
    ].filter(Boolean).join(' ');
    
    return (
      <div
        key={option.value}
        className={optionClasses}
        onClick={() => !option.disabled && handleOptionClick(option.value)}
        role="option"
        aria-selected={isSelected}
        tabIndex={option.disabled ? -1 : 0}
      >
        {renderOption ? (
          renderOption(option, isSelected)
        ) : (
          <>
            {multiple && (
              <div className="option-checkbox">
                {isSelected && <span className="checkbox-icon">✓</span>}
              </div>
            )}
            <div className="option-label">{option.label}</div>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className={containerClasses} ref={selectRef}>
      {label && (
        <label
          htmlFor={id}
          className="select-label"
        >
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      <div 
        className={selectWrapperClasses}
        onClick={handleToggle}
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        aria-readonly={readOnly}
        aria-invalid={!!error}
        aria-describedby={id ? `${id}-helper-text` : undefined}
        ref={mergedRef}
        {...props}
      >
        <div className="select-value">
          {formatDisplayValue()}
        </div>
        
        <div className="select-actions">
          {clearable && !disabled && !readOnly && (internalValue && (!Array.isArray(internalValue) || internalValue.length > 0)) && (
            <button 
              type="button"
              className="select-clear-button"
              onClick={handleClear}
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <FiX />
            </button>
          )}
          
          {!disabled && !readOnly && (
            <span className="select-arrow">
              <FiChevronDown />
            </span>
          )}
          
          {!disabled && !readOnly && (
            <>
              {error && <FiAlertCircle className="select-icon error-icon" />}
              {success && !error && <FiCheckCircle className="select-icon success-icon" />}
            </>
          )}
        </div>
        
        {isOpen && (
          <div 
            className="select-menu"
            ref={menuRef}
            style={{ maxHeight: `${maxMenuHeight}px` }}
            role="listbox"
            aria-multiselectable={multiple}
          >
            {searchable && (
              <div className="select-search">
                <FiSearch className="search-icon" />
                <input
                  ref={searchInputRef}
                  type="text"
                  className="search-input"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Search options"
                />
              </div>
            )}
            
            <div className="select-options">
              {isLoading ? (
                <div className="select-loading">Loading options...</div>
              ) : hasNoOptions ? (
                <div className="select-no-options">{noOptionsMessage}</div>
              ) : (
                filteredOptions.map(option => {
                  if (option.options) {
                    // It's an option group
                    if (option.options.length === 0) return null;
                    
                    return (
                      <div key={option.label} className="select-option-group">
                        <div className="group-label">{option.label}</div>
                        {option.options.map(subOption => renderOptionItem(subOption, true))}
                      </div>
                    );
                  }
                  
                  // It's a single option
                  return renderOptionItem(option);
                })
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Helper text or error message */}
      {(helperText || error) && (
        <div 
          className={`select-helper-text ${error ? 'error' : ''} ${success && !error ? 'success' : ''}`}
          id={id ? `${id}-helper-text` : undefined}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

Select.propTypes = {
  id: PropTypes.string,
  label: PropTypes.node,
  value: PropTypes.any,
  defaultValue: PropTypes.any,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({
        value: PropTypes.any.isRequired,
        label: PropTypes.node.isRequired,
        disabled: PropTypes.bool
      }),
      PropTypes.shape({
        label: PropTypes.string.isRequired,
        options: PropTypes.arrayOf(
          PropTypes.shape({
            value: PropTypes.any.isRequired,
            label: PropTypes.node.isRequired,
            disabled: PropTypes.bool
          })
        ).isRequired
      })
    ])
  ),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  noOptionsMessage: PropTypes.string,
  name: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  error: PropTypes.string,
  success: PropTypes.bool,
  helperText: PropTypes.string,
  multiple: PropTypes.bool,
  searchable: PropTypes.bool,
  clearable: PropTypes.bool,
  renderOption: PropTypes.func,
  renderValue: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  maxMenuHeight: PropTypes.number,
  isLoading: PropTypes.bool
};

export default Select; 