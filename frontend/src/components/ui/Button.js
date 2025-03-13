import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { FiLoader } from 'react-icons/fi';
import './Button.css';

/**
 * Button Component
 *
 * A reusable button component with consistent styling and behavior
 * for the application. Supports various variants, sizes, and states.
 *
 * @component
 * @version 1.0.0
 */
export const metadata = {
  componentName: "Button",
  description: "Reusable button component with consistent styling",
  version: "1.0.0",
  author: "Code Beast Team",
  keywords: ["ui", "button", "interaction", "form"]
};

const Button = forwardRef(({
  children,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon = null,
  iconPosition = 'left',
  onClick,
  className = '',
  form,
  ...props
}, ref) => {
  // Determine button classes based on props
  const buttonClasses = [
    'ui-button',
    `variant-${variant}`,
    `size-${size}`,
    fullWidth ? 'full-width' : '',
    loading ? 'loading' : '',
    className
  ].filter(Boolean).join(' ');

  // Handle click events
  const handleClick = (event) => {
    if (!disabled && !loading && onClick) {
      onClick(event);
    }
  };

  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      form={form}
      {...props}
    >
      {loading && (
        <span className="button-loader">
          <FiLoader className="spin-animation" />
        </span>
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="button-icon button-icon-left">
          {icon}
        </span>
      )}
      
      <span className="button-text">{children}</span>
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="button-icon button-icon-right">
          {icon}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node.isRequired,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary', 'danger', 'success', 'warning', 'info', 'link', 'ghost']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  onClick: PropTypes.func,
  className: PropTypes.string,
  form: PropTypes.string
};

export default Button; 