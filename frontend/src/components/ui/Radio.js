import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import './Radio.css';

export const metadata = {
  name: 'Radio',
  description: 'A radio button component for selecting one option from a set',
  props: {
    id: 'Unique identifier for the radio button',
    name: 'Name attribute for the radio input (required for grouping)',
    value: 'Value of the radio button',
    checked: 'Boolean indicating if the radio is checked',
    label: 'Text label for the radio button',
    disabled: 'Boolean indicating if the radio is disabled',
    error: 'Error message or boolean indicating an error state',
    required: 'Boolean indicating if the radio is required',
    onChange: 'Function called when the radio value changes',
    className: 'Additional CSS class(es) to apply to the radio container',
    style: 'Additional inline styles to apply',
    helperText: 'Helper text displayed below the radio',
    size: 'Size of the radio (small, medium, or large)',
  }
};

const Radio = forwardRef(({
  id,
  name,
  value,
  checked = false,
  label,
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
  const uniqueId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine if we have an error message
  const errorMessage = typeof error === 'string' ? error : '';
  const hasError = error !== false;
  
  // Generate CSS classes
  const containerClasses = [
    'radio-container',
    `size-${size}`,
    disabled ? 'disabled' : '',
    hasError ? 'has-error' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClasses} style={style}>
      <div className="radio-wrapper">
        <input
          type="radio"
          id={uniqueId}
          name={name}
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          required={required}
          aria-invalid={hasError}
          aria-describedby={helperText || errorMessage ? `${uniqueId}-helper` : undefined}
          className="radio-input"
          ref={ref}
        />
        <div className="radio-control">
          <div className="radio-inner"></div>
        </div>
        {label && (
          <label htmlFor={uniqueId} className="radio-label">
            {label}
            {required && <span className="required-indicator"> *</span>}
          </label>
        )}
      </div>
      
      {(helperText || errorMessage) && (
        <div 
          id={`${uniqueId}-helper`} 
          className={`radio-helper-text ${hasError ? 'error' : ''}`}
        >
          {errorMessage || helperText}
        </div>
      )}
    </div>
  );
});

Radio.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string,
  checked: PropTypes.bool,
  label: PropTypes.node,
  disabled: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  required: PropTypes.bool,
  onChange: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
  helperText: PropTypes.node,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

Radio.displayName = 'Radio';

export default Radio; 