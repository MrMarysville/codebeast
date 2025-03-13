import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FiUpload, FiFile, FiFolder, FiX } from 'react-icons/fi';
import './FileInput.css';

/**
 * FileInput Component
 * 
 * A reusable file input component that supports single file, 
 * multiple files, and directory selection with consistent styling.
 * 
 * @component
 * @version 1.0.0
 */
export const metadata = {
  componentName: "FileInput",
  description: "Reusable file input component with support for files and directories",
  version: "1.0.0",
  author: "Code Beast Team",
  keywords: ["input", "file", "upload", "directory", "drag-drop"]
};

const FileInput = ({
  id,
  label,
  accept,
  multiple = false,
  directory = false,
  onChange,
  placeholder = "Choose file(s)",
  maxSize = 100, // in MB
  allowedExtensions = [],
  error,
  disabled = false,
  required = false,
  className = '',
  showFileList = true,
  value,
  onClear,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Handle files from drag-drop or file input
  const handleFiles = useCallback((selectedFiles) => {
    // Convert FileList to Array
    const fileArray = Array.from(selectedFiles);
    
    // Apply validation
    let validFiles = fileArray;
    
    // Check file size
    if (maxSize > 0) {
      validFiles = validFiles.filter(file => file.size <= maxSize * 1024 * 1024);
    }
    
    // Check file extensions
    if (allowedExtensions.length > 0) {
      validFiles = validFiles.filter(file => {
        const extension = file.name.split('.').pop().toLowerCase();
        return allowedExtensions.includes(extension);
      });
    }
    
    setFiles(validFiles);
    
    // Call onChange callback with files
    if (onChange) {
      onChange(multiple ? validFiles : validFiles[0]);
    }
  }, [multiple, maxSize, allowedExtensions, onChange]);

  // Handle file input change
  const handleInputChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop event
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  // Handle button click to trigger file input
  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Handle removing a file from the list
  const handleRemoveFile = useCallback((index) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    // Call onChange callback with updated files
    if (onChange) {
      onChange(multiple ? newFiles : newFiles[0] || null);
    }
  }, [files, multiple, onChange]);

  // Handle clearing all files
  const handleClear = useCallback(() => {
    setFiles([]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Call onChange callback with null
    if (onChange) {
      onChange(multiple ? [] : null);
    }
    
    // Call onClear callback if provided
    if (onClear) {
      onClear();
    }
  }, [onChange, multiple, onClear]);

  return (
    <div className={`file-input-container ${className}`}>
      {label && (
        <label htmlFor={id} className="file-input-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      <div 
        className={`file-input-dropzone ${dragActive ? 'active' : ''} ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={!disabled ? handleDrop : undefined}
        onClick={!disabled ? handleButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          id={id}
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          required={required}
          {...(directory ? { webkitdirectory: "", directory: "" } : {})}
          className="file-input-hidden"
        />
        
        <div className="file-input-content">
          <FiUpload className="file-input-icon" />
          <div className="file-input-placeholder">
            {directory ? 
              "Drop a folder here, or click to select a folder" : 
              (files.length > 0 ? 
                `${files.length} file${files.length !== 1 ? 's' : ''} selected` : 
                placeholder)
            }
          </div>
          {!disabled && (
            <button 
              type="button" 
              className="file-input-button"
              onClick={(e) => {
                e.stopPropagation();
                handleButtonClick();
              }}
            >
              Browse
            </button>
          )}
        </div>
      </div>
      
      {error && <div className="file-input-error">{error}</div>}
      
      {showFileList && files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="file-item">
              {file.type.includes('image') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="file-thumbnail"
                />
              ) : (
                file.type.includes('directory') ? (
                  <FiFolder className="file-icon" />
                ) : (
                  <FiFile className="file-icon" />
                )
              )}
              <div className="file-details">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <button
                type="button"
                className="file-remove-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(index);
                }}
                title="Remove file"
              >
                <FiX />
              </button>
            </div>
          ))}
          
          {files.length > 1 && (
            <button
              type="button"
              className="file-clear-button"
              onClick={handleClear}
            >
              Clear All
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Format file size to human-readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

FileInput.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  directory: PropTypes.bool,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  maxSize: PropTypes.number,
  allowedExtensions: PropTypes.arrayOf(PropTypes.string),
  error: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  showFileList: PropTypes.bool,
  value: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.arrayOf(PropTypes.object)
  ]),
  onClear: PropTypes.func
};

export default FileInput; 