import React, { useState, useRef, forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FiEye, FiEyeOff, FiX, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import './TextInput.css';

/**
 * TextInput Component
 * 
 * A reusable text input component with validation, accessibility features, and
 * support for React 19's form handling capabilities.
 * 
 * @component
 * @version 1.0.0
 */
export const metadata = {
  componentName: "TextInput",
  description: "Reusable text input component with validation support",
  version: "1.0.0",
  author: "Code Beast Team",
  keywords: ["input", "form", "text", "validation"]
};

const TextInput = forwardRef(({
  id,
  label,
  type = 'text',
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  placeholder = '',
  name,
  required = false,
  disabled = false,
  readOnly = false,
  error = null,
  success = false,
  helperText = '',
  prefix = null,
  suffix = null,
  clearable = false,
  showPasswordToggle = false,
  maxLength,
  minLength,
  pattern,
  autoComplete,
  autoCapitalize,
  spellCheck,
  size = 'medium',
  fullWidth = false,
  className = '',
  validateOnBlur = false,
  validate,
  ...props
}, ref) => {
  // Internal state
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value || defaultValue || '');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const inputRef = useRef(null);
  const mergedRef = ref || inputRef;

  // Determine effective type (for password visibility toggle)
  const effectiveType = type === 'password' && showPassword ? 'text' : type;

  // Handle value changes
  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);

    // Call external onChange handler
    if (onChange) {
      onChange(e);
    }

    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
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
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }

    // Run validation on blur if enabled
    if (validateOnBlur && validate) {
      const result = validate(e.target.value);
      if (result !== true) {
        setValidationError(result);
      } else {
        setValidationError(null);
      }
    }
  };

  // Handle clearing the input
  const handleClear = () => {
    // Update internal state
    setInternalValue('');
    
    // Programmatically update the input
    if (mergedRef.current) {
      const nativeInputValue = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      );
      
      if (nativeInputValue) {
        const event = new Event('input', { bubbles: true });
        nativeInputValue.set.call(mergedRef.current, '');
        mergedRef.current.dispatchEvent(event);
      }
    }
    
    // Focus input after clearing
    if (mergedRef.current) {
      mergedRef.current.focus();
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Determine container CSS classes
  const containerClasses = [
    'text-input-container',
    `size-${size}`,
    fullWidth ? 'full-width' : '',
    className
  ].filter(Boolean).join(' ');

  // Determine input wrapper CSS classes
  const inputWrapperClasses = [
    'text-input-wrapper',
    isFocused ? 'focused' : '',
    disabled ? 'disabled' : '',
    readOnly ? 'readonly' : '',
    error || validationError ? 'error' : '',
    success ? 'success' : '',
    prefix ? 'has-prefix' : '',
    suffix || clearable || (type === 'password' && showPasswordToggle) ? 'has-suffix' : ''
  ].filter(Boolean).join(' ');

  // Determine helper text to display (prioritize validation error)
  const displayHelperText = validationError || error || helperText;
  const isError = validationError || error;

  return (
    <div className={containerClasses}>
      {label && (
        <label
          htmlFor={id}
          className="text-input-label"
        >
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}

      <div className={inputWrapperClasses}>
        {prefix && (
          <div className="text-input-prefix">
            {prefix}
          </div>
        )}

        <input
          id={id}
          ref={mergedRef}
          type={effectiveType}
          value={value !== undefined ? value : internalValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          name={name}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          spellCheck={spellCheck}
          className="text-input"
          aria-invalid={!!error || !!validationError}
          aria-describedby={id ? `${id}-helper-text` : undefined}
          {...props}
        />

        {/* Action icons in the suffix area */}
        <div className="text-input-suffix">
          {/* Show validation status icons */}
          {!disabled && !readOnly && (
            <>
              {isError && <FiAlertCircle className="text-input-icon error-icon" />}
              {success && !isError && <FiCheckCircle className="text-input-icon success-icon" />}
            </>
          )}

          {/* Show clear button if enabled and has value */}
          {clearable && !disabled && !readOnly && (value || internalValue) && (
            <button 
              type="button"
              className="text-input-clear-button"
              onClick={handleClear}
              aria-label="Clear input"
              tabIndex={-1}
            >
              <FiX />
            </button>
          )}

          {/* Show password toggle for password inputs */}
          {type === 'password' && showPasswordToggle && !disabled && !readOnly && (
            <button 
              type="button"
              className="text-input-password-toggle"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          )}

          {/* Custom suffix */}
          {suffix && !disabled && !readOnly && (
            <div className="text-input-custom-suffix">
              {suffix}
            </div>
          )}
        </div>
      </div>

      {/* Helper text or error message */}
      {displayHelperText && (
        <div 
          className={`text-input-helper-text ${isError ? 'error' : ''} ${success && !isError ? 'success' : ''}`}
          id={id ? `${id}-helper-text` : undefined}
        >
          {displayHelperText}
        </div>
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

TextInput.propTypes = {
  id: PropTypes.string,
  label: PropTypes.node,
  type: PropTypes.oneOf([
    'text', 'password', 'email', 'number', 'tel', 'url', 'search', 
    'date', 'time', 'datetime-local', 'month', 'week'
  ]),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  name: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
  error: PropTypes.string,
  success: PropTypes.bool,
  helperText: PropTypes.string,
  prefix: PropTypes.node,
  suffix: PropTypes.node,
  clearable: PropTypes.bool,
  showPasswordToggle: PropTypes.bool,
  maxLength: PropTypes.number,
  minLength: PropTypes.number,
  pattern: PropTypes.string,
  autoComplete: PropTypes.string,
  autoCapitalize: PropTypes.string,
  spellCheck: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
  className: PropTypes.string,
  validateOnBlur: PropTypes.bool,
  validate: PropTypes.func
};

export default TextInput; 