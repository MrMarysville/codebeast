import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FiCheck, FiMinus } from 'react-icons/fi';
import './Checkbox.css';

export const metadata = {
  name: 'Checkbox',
  description: 'A checkbox component for selecting single or multiple options',
  props: {
    id: 'Unique identifier for the checkbox',
    name: 'Name attribute for the checkbox input',
    checked: 'Boolean indicating if the checkbox is checked',
    label: 'Text label for the checkbox',
    indeterminate: 'Boolean indicating if the checkbox is in an indeterminate state',
    disabled: 'Boolean indicating if the checkbox is disabled',
    error: 'Error message or boolean indicating an error state',
    required: 'Boolean indicating if the checkbox is required',
    onChange: 'Function called when the checkbox value changes',
    className: 'Additional CSS class(es) to apply to the checkbox container',
    style: 'Additional inline styles to apply',
    helperText: 'Helper text displayed below the checkbox',
    size: 'Size of the checkbox (small, medium, or large)',
  }
};

const Checkbox = forwardRef(({
  id,
  name,
  checked = false,
  label,
  indeterminate = false,
  disabled = false,
  error = false,
  required = false,
  onChange,
  className = '',
  style = {},
  helperText,
  size = 'medium',
}, ref) => {
  // Generate a unique ID if one is not provided
  const uniqueId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine if we have an error message
  const errorMessage = typeof error === 'string' ? error : '';
  const hasError = error !== false;
  
  // Generate CSS classes
  const containerClasses = [
    'checkbox-container',
    `size-${size}`,
    disabled ? 'disabled' : '',
    hasError ? 'has-error' : '',
    className
  ].filter(Boolean).join(' ');
  
  // Create the checkbox ref to handle indeterminate state
  const checkboxRef = React.useRef(null);
  
  // Initialize and update indeterminate state
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);
  
  // Combine refs
  const handleRef = (el) => {
    checkboxRef.current = el;
    
    // Forward the ref if provided
    if (ref) {
      if (typeof ref === 'function') {
        ref(el);
      } else {
        ref.current = el;
      }
    }
  };
  
  return (
    <div className={containerClasses} style={style}>
      <div className="checkbox-wrapper">
        <input
          type="checkbox"
          id={uniqueId}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          required={required}
          aria-invalid={hasError}
          aria-describedby={helperText || errorMessage ? `${uniqueId}-helper` : undefined}
          className="checkbox-input"
          ref={handleRef}
        />
        <div className="checkbox-control">
          {checked && !indeterminate && <FiCheck className="checkbox-icon" />}
          {indeterminate && <FiMinus className="checkbox-icon" />}
        </div>
        {label && (
          <label htmlFor={uniqueId} className="checkbox-label">
            {label}
            {required && <span className="required-indicator"> *</span>}
          </label>
        )}
      </div>
      
      {(helperText || errorMessage) && (
        <div 
          id={`${uniqueId}-helper`} 
          className={`checkbox-helper-text ${hasError ? 'error' : ''}`}
        >
          {errorMessage || helperText}
        </div>
      )}
    </div>
  );
});

Checkbox.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  checked: PropTypes.bool,
  label: PropTypes.node,
  indeterminate: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  required: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  helperText: PropTypes.node,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

Checkbox.displayName = 'Checkbox';

export default Checkbox; 