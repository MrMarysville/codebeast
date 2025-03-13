import React, { useState } from 'react';
import { 
  Button, 
  ErrorState, 
  FileInput, 
  LoadingState,
  TextInput,
  Select,
  Checkbox,
  Radio
} from '../components/ui';
import { 
  FiSave, 
  FiTrash, 
  FiEdit, 
  FiInfo, 
  FiAlertTriangle,
  FiCheck,
  FiSearch,
  FiDollarSign,
  FiMail,
  FiFlag,
  FiGlobe
} from 'react-icons/fi';
import './UIDemo.css';

/**
 * UI Demo page that showcases all UI components
 * This page is useful for visual reference and testing
 */
export const metadata = {
  title: "UI Components Demo",
  description: "Demonstration of all UI components available in the application"
};

const UIDemo = () => {
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Demo function for loading simulation
  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };
  
  return (
    <div className="ui-demo-container">
      <h1>UI Components Demo</h1>
      <p className="ui-demo-intro">
        This page demonstrates all the reusable UI components available in the application.
        Use these components to maintain consistent design across the app.
      </p>
      
      <section className="demo-section">
        <h2>Button Component</h2>
        <p>A versatile button component with various states and variants.</p>
        
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Variants</h3>
            <div className="button-row">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="tertiary">Tertiary</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="info">Info</Button>
              <Button variant="link">Link</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Sizes</h3>
            <div className="button-row">
              <Button size="small">Small</Button>
              <Button size="medium">Medium</Button>
              <Button size="large">Large</Button>
            </div>
          </div>
          
          <div className="demo-item">
            <h3>States</h3>
            <div className="button-row">
              <Button disabled>Disabled</Button>
              <Button loading>Loading</Button>
              <Button fullWidth>Full Width</Button>
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Icons</h3>
            <div className="button-row">
              <Button icon={<FiSave />}>Save</Button>
              <Button icon={<FiTrash />} variant="danger">Delete</Button>
              <Button icon={<FiEdit />} iconPosition="right">Edit</Button>
            </div>
          </div>
        </div>
      </section>
      
      <section className="demo-section">
        <h2>Loading State Component</h2>
        <p>Displays various types of loading indicators.</p>
        
        <Button onClick={simulateLoading} disabled={isLoading}>
          Simulate Loading
        </Button>
        
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Spinner</h3>
            <LoadingState type="spinner" message="Loading data..." />
          </div>
          
          <div className="demo-item">
            <h3>Skeleton</h3>
            <LoadingState type="skeleton" message="Loading content..." />
          </div>
          
          <div className="demo-item">
            <h3>Progress</h3>
            <LoadingState type="progress" progress={65} message="Uploading files..." />
          </div>
          
          {isLoading && (
            <div className="demo-item fullwidth">
              <h3>Overlay</h3>
              <div style={{ position: 'relative', height: '150px', border: '1px solid #ddd' }}>
                <LoadingState 
                  type="spinner" 
                  overlay="container" 
                  message="Processing your request..." 
                />
              </div>
            </div>
          )}
        </div>
      </section>
      
      <section className="demo-section">
        <h2>Error State Component</h2>
        <p>Displays error messages with various styles.</p>
        
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Inline Error</h3>
            <ErrorState 
              error="Network request failed" 
              variant="inline"
              onRetry={() => alert('Retry clicked!')}
            />
          </div>
          
          <div className="demo-item">
            <h3>Card Error</h3>
            <ErrorState 
              error="Failed to load data" 
              title="Data Error"
              variant="card"
              onRetry={() => alert('Retry clicked!')}
            />
          </div>
          
          <div className="demo-item fullwidth">
            <h3>Page Error</h3>
            <ErrorState 
              error={new Error("We couldn't process your request due to a server error.")}
              title="Something went wrong"
              variant="page"
              onRetry={() => alert('Retry clicked!')}
            >
              <p>You can include additional content here.</p>
            </ErrorState>
          </div>
        </div>
      </section>
      
      <section className="demo-section">
        <h2>File Input Component</h2>
        <p>Allows users to select files with drag-and-drop support.</p>
        
        <div className="demo-grid">
          <div className="demo-item fullwidth">
            <h3>Multiple Files</h3>
            <FileInput 
              id="demo-files"
              label="Upload Documents"
              multiple
              onChange={(selectedFiles) => {
                setFiles(selectedFiles);
                if (selectedFiles.length > 5) {
                  setFileError('Maximum 5 files allowed');
                } else {
                  setFileError(null);
                }
              }}
              error={fileError}
            />
          </div>
          
          <div className="demo-item fullwidth">
            <h3>Directory Selection</h3>
            <FileInput 
              id="demo-directory"
              label="Upload Project"
              directory
              onChange={setFiles}
              placeholder="Select a project folder"
            />
          </div>
        </div>
      </section>
      
      <section className="demo-section">
        <h2>Text Input Component</h2>
        <p>A versatile text input component with validation and various states.</p>
        
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Basic Text Input</h3>
            <TextInput
              id="basic-input"
              label="Username"
              placeholder="Enter username"
              helperText="Your unique username"
            />
          </div>
          
          <div className="demo-item">
            <h3>Required Input</h3>
            <TextInput
              id="required-input"
              label="Email Address"
              type="email"
              placeholder="Enter email"
              required
            />
          </div>
          
          <div className="demo-item">
            <h3>With Error</h3>
            <TextInput
              id="error-input"
              label="Password"
              type="password"
              error="Password must be at least 8 characters"
              showPasswordToggle
            />
          </div>
          
          <div className="demo-item">
            <h3>With Success</h3>
            <TextInput
              id="success-input"
              label="Verification Code"
              value="123456"
              success
              readOnly
            />
          </div>
          
          <div className="demo-item">
            <h3>With Prefix/Suffix</h3>
            <TextInput
              id="prefix-input"
              label="Amount"
              type="number"
              placeholder="0.00"
              prefix={<FiDollarSign />}
            />
            <div style={{ marginTop: '1rem' }}>
              <TextInput
                id="suffix-input"
                label="Search"
                placeholder="Search..."
                suffix={<FiSearch />}
                clearable
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Sizes</h3>
            <TextInput
              id="small-input"
              placeholder="Small input"
              size="small"
            />
            <div style={{ margin: '0.5rem 0' }}>
              <TextInput
                id="medium-input"
                placeholder="Medium input"
                size="medium"
              />
            </div>
            <TextInput
              id="large-input"
              placeholder="Large input"
              size="large"
            />
          </div>
          
          <div className="demo-item">
            <h3>Disabled & Read-only</h3>
            <TextInput
              id="disabled-input"
              label="Disabled Input"
              value="Cannot be edited"
              disabled
            />
            <div style={{ marginTop: '1rem' }}>
              <TextInput
                id="readonly-input"
                label="Read-only Input"
                value="Can be selected but not edited"
                readOnly
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Password Input</h3>
            <TextInput
              id="password-input"
              label="Password"
              type="password"
              placeholder="Enter password"
              showPasswordToggle
            />
          </div>
          
          <div className="demo-item fullwidth">
            <h3>Form Example with Validation</h3>
            <form className="demo-form">
              <TextInput
                id="email-form"
                label="Email"
                type="email"
                placeholder="your@email.com"
                required
                prefix={<FiMail />}
                helperText="We'll never share your email"
              />
              
              <div style={{ marginTop: '1rem' }}>
                <TextInput
                  id="password-form"
                  label="Password"
                  type="password"
                  placeholder="Create a secure password"
                  required
                  showPasswordToggle
                  helperText="Must be at least 8 characters"
                />
              </div>
              
              <div style={{ marginTop: '1.5rem' }}>
                <Button type="submit" variant="primary">
                  Register
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>
      
      <section className="demo-section">
        <h2>Select Component</h2>
        <p>A versatile select component with single/multiple selection, search, and grouping.</p>
        
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Basic Select</h3>
            <Select
              id="basic-select"
              label="Country"
              placeholder="Select a country"
              options={[
                { value: 'us', label: 'United States' },
                { value: 'ca', label: 'Canada' },
                { value: 'mx', label: 'Mexico' },
                { value: 'uk', label: 'United Kingdom' },
                { value: 'fr', label: 'France' },
                { value: 'de', label: 'Germany' }
              ]}
              helperText="Select your country"
            />
          </div>
          
          <div className="demo-item">
            <h3>With Option Groups</h3>
            <Select
              id="grouped-select"
              label="Region"
              placeholder="Select a region"
              options={[
                { 
                  label: 'North America',
                  options: [
                    { value: 'us', label: 'United States' },
                    { value: 'ca', label: 'Canada' },
                    { value: 'mx', label: 'Mexico' }
                  ]
                },
                {
                  label: 'Europe',
                  options: [
                    { value: 'uk', label: 'United Kingdom' },
                    { value: 'fr', label: 'France' },
                    { value: 'de', label: 'Germany' },
                    { value: 'es', label: 'Spain' },
                    { value: 'it', label: 'Italy' }
                  ]
                },
                {
                  label: 'Asia',
                  options: [
                    { value: 'jp', label: 'Japan' },
                    { value: 'cn', label: 'China' },
                    { value: 'in', label: 'India' }
                  ]
                }
              ]}
            />
          </div>
          
          <div className="demo-item">
            <h3>Multiple Selection</h3>
            <Select
              id="multi-select"
              label="Languages"
              placeholder="Select languages"
              multiple
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
                { value: 'zh', label: 'Chinese' },
                { value: 'ja', label: 'Japanese' }
              ]}
              helperText="Select all that apply"
            />
          </div>
          
          <div className="demo-item">
            <h3>With Search</h3>
            <Select
              id="search-select"
              label="Programming Language"
              placeholder="Search languages"
              searchable
              options={[
                { value: 'js', label: 'JavaScript' },
                { value: 'ts', label: 'TypeScript' },
                { value: 'py', label: 'Python' },
                { value: 'java', label: 'Java' },
                { value: 'csharp', label: 'C#' },
                { value: 'cpp', label: 'C++' },
                { value: 'php', label: 'PHP' },
                { value: 'ruby', label: 'Ruby' },
                { value: 'swift', label: 'Swift' },
                { value: 'kotlin', label: 'Kotlin' },
                { value: 'go', label: 'Go' },
                { value: 'rust', label: 'Rust' }
              ]}
              helperText="Search or select a language"
            />
          </div>
          
          <div className="demo-item">
            <h3>With Prefix</h3>
            <Select
              id="prefix-select"
              label="Country"
              placeholder="Select a country"
              options={[
                { value: 'us', label: 'United States' },
                { value: 'ca', label: 'Canada' },
                { value: 'mx', label: 'Mexico' },
                { value: 'uk', label: 'United Kingdom' },
                { value: 'fr', label: 'France' },
                { value: 'de', label: 'Germany' }
              ]}
              renderOption={(option, isSelected) => (
                <>
                  <FiFlag style={{ marginRight: '8px' }} />
                  {option.label}
                </>
              )}
              renderValue={(value) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FiGlobe style={{ marginRight: '8px' }} />
                  {value === 'us' ? 'United States' : 
                   value === 'ca' ? 'Canada' : 
                   value === 'mx' ? 'Mexico' : 
                   value === 'uk' ? 'United Kingdom' : 
                   value === 'fr' ? 'France' : 
                   value === 'de' ? 'Germany' : 'Select a country'}
                </div>
              )}
            />
          </div>
          
          <div className="demo-item">
            <h3>Validation States</h3>
            <Select
              id="error-select"
              label="Category"
              placeholder="Select category"
              error="Please select a category"
              options={[
                { value: '1', label: 'Technology' },
                { value: '2', label: 'Health' },
                { value: '3', label: 'Finance' }
              ]}
            />
            <div style={{ marginTop: '1rem' }}>
              <Select
                id="success-select"
                label="Category"
                value="1"
                success
                options={[
                  { value: '1', label: 'Technology' },
                  { value: '2', label: 'Health' },
                  { value: '3', label: 'Finance' }
                ]}
                helperText="Category successfully selected"
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>States</h3>
            <Select
              id="disabled-select"
              label="Disabled Select"
              placeholder="Cannot be changed"
              disabled
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' }
              ]}
            />
            <div style={{ marginTop: '1rem' }}>
              <Select
                id="readonly-select"
                label="Read-only Select"
                value="1"
                readOnly
                options={[
                  { value: '1', label: 'Option 1' },
                  { value: '2', label: 'Option 2' }
                ]}
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Sizes</h3>
            <Select
              id="small-select"
              placeholder="Small select"
              size="small"
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' }
              ]}
            />
            <div style={{ margin: '0.5rem 0' }}>
              <Select
                id="medium-select"
                placeholder="Medium select"
                size="medium"
                options={[
                  { value: '1', label: 'Option 1' },
                  { value: '2', label: 'Option 2' }
                ]}
              />
            </div>
            <Select
              id="large-select"
              placeholder="Large select"
              size="large"
              options={[
                { value: '1', label: 'Option 1' },
                { value: '2', label: 'Option 2' }
              ]}
            />
          </div>
        </div>
      </section>
      
      <section className="demo-section">
        <h2>Checkbox Component</h2>
        <p>A versatile checkbox component for boolean options and multiple selections.</p>
        
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Basic Checkbox</h3>
            <Checkbox
              id="basic-checkbox"
              label="Accept terms and conditions"
              helperText="Please read our terms before accepting"
            />
          </div>
          
          <div className="demo-item">
            <h3>Required Checkbox</h3>
            <Checkbox
              id="required-checkbox"
              label="I agree to the privacy policy"
              required
              helperText="This field is required"
            />
          </div>
          
          <div className="demo-item">
            <h3>Checkbox States</h3>
            <div>
              <Checkbox
                id="checked-checkbox"
                label="Checked option"
                checked
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Checkbox
                id="unchecked-checkbox"
                label="Unchecked option"
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Checkbox
                id="indeterminate-checkbox"
                label="Indeterminate option"
                indeterminate
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Validation States</h3>
            <Checkbox
              id="error-checkbox"
              label="Accept terms"
              error="You must accept the terms"
            />
          </div>
          
          <div className="demo-item">
            <h3>Disabled State</h3>
            <div>
              <Checkbox
                id="disabled-checkbox"
                label="Disabled unchecked"
                disabled
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Checkbox
                id="disabled-checked-checkbox"
                label="Disabled checked"
                checked
                disabled
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Size Variants</h3>
            <div>
              <Checkbox
                id="small-checkbox"
                label="Small checkbox"
                size="small"
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Checkbox
                id="medium-checkbox"
                label="Medium checkbox"
                size="medium"
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Checkbox
                id="large-checkbox"
                label="Large checkbox"
                size="large"
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Checkbox Group Example</h3>
            <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
              <legend style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Select your interests:</legend>
              <Checkbox
                id="tech-checkbox"
                name="interests"
                label="Technology"
              />
              <Checkbox
                id="science-checkbox"
                name="interests"
                label="Science"
              />
              <Checkbox
                id="art-checkbox"
                name="interests"
                label="Art & Design"
              />
              <Checkbox
                id="business-checkbox"
                name="interests"
                label="Business"
              />
            </fieldset>
          </div>
          
          <div className="demo-item">
            <h3>Controlled Checkbox Example</h3>
            <CheckboxDemo />
          </div>
        </div>
      </section>
      
      <section className="demo-section">
        <h2>Radio Component</h2>
        <p>A radio button component for selecting a single option from a list.</p>
        
        <div className="demo-grid">
          <div className="demo-item">
            <h3>Basic Radio Group</h3>
            <RadioGroupDemo />
          </div>
          
          <div className="demo-item">
            <h3>Required Radio</h3>
            <Radio
              id="required-radio"
              name="required-example"
              value="required"
              label="Required option"
              required
              helperText="This field is required"
            />
          </div>
          
          <div className="demo-item">
            <h3>Radio States</h3>
            <div>
              <Radio
                id="checked-radio"
                name="states-example"
                value="checked"
                label="Checked option"
                checked
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Radio
                id="unchecked-radio"
                name="states-example"
                value="unchecked"
                label="Unchecked option"
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Validation States</h3>
            <Radio
              id="error-radio"
              name="validation-example"
              value="error"
              label="Option with error"
              error="Please select a valid option"
            />
          </div>
          
          <div className="demo-item">
            <h3>Disabled State</h3>
            <div>
              <Radio
                id="disabled-radio"
                name="disabled-example"
                value="disabled-unchecked"
                label="Disabled unchecked"
                disabled
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Radio
                id="disabled-checked-radio"
                name="disabled-example"
                value="disabled-checked"
                label="Disabled checked"
                checked
                disabled
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Size Variants</h3>
            <div>
              <Radio
                id="small-radio"
                name="size-example"
                value="small"
                label="Small radio"
                size="small"
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Radio
                id="medium-radio"
                name="size-example"
                value="medium"
                label="Medium radio"
                size="medium"
              />
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <Radio
                id="large-radio"
                name="size-example"
                value="large"
                label="Large radio"
                size="large"
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Horizontal Radio Group</h3>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <Radio
                id="option1-radio"
                name="horizontal-example"
                value="option1"
                label="Option 1"
              />
              <Radio
                id="option2-radio"
                name="horizontal-example"
                value="option2"
                label="Option 2"
              />
              <Radio
                id="option3-radio"
                name="horizontal-example"
                value="option3"
                label="Option 3"
              />
            </div>
          </div>
          
          <div className="demo-item">
            <h3>Radio with Helper Text</h3>
            <Radio
              id="helper-radio"
              name="helper-example"
              value="helper"
              label="Radio with helper text"
              helperText="This is additional information about this option"
            />
          </div>
        </div>
      </section>
      
      <div className="demo-footer">
        <p>
          <FiInfo /> These components are designed to work with React 19 and include metadata for document generation.
        </p>
      </div>
    </div>
  );
};

// Create a simple controlled checkbox demo component
function CheckboxDemo() {
  const [checked, setChecked] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);
  
  const handleToggle = (e) => {
    setChecked(e.target.checked);
    setIndeterminate(false);
  };
  
  const handleIndeterminate = () => {
    setIndeterminate(!indeterminate);
  };
  
  return (
    <div>
      <Checkbox
        id="controlled-checkbox"
        label={`Status: ${checked ? 'Checked' : indeterminate ? 'Indeterminate' : 'Unchecked'}`}
        checked={checked}
        indeterminate={indeterminate}
        onChange={handleToggle}
      />
      <div style={{ marginTop: '0.5rem' }}>
        <Button 
          size="small"
          onClick={handleIndeterminate}
        >
          Toggle Indeterminate
        </Button>
      </div>
    </div>
  );
}

// Create a controlled radio group demo
function RadioGroupDemo() {
  const [selectedOption, setSelectedOption] = useState('');
  
  const handleOptionChange = (e) => {
    setSelectedOption(e.target.value);
  };
  
  return (
    <div>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Select a plan:</legend>
        
        <Radio
          id="basic-plan"
          name="plan"
          value="basic"
          label="Basic Plan"
          checked={selectedOption === 'basic'}
          onChange={handleOptionChange}
          helperText="Free, limited features"
        />
        
        <Radio
          id="pro-plan"
          name="plan"
          value="pro"
          label="Pro Plan"
          checked={selectedOption === 'pro'}
          onChange={handleOptionChange}
          helperText="$9.99/month, all features"
        />
        
        <Radio
          id="enterprise-plan"
          name="plan"
          value="enterprise"
          label="Enterprise Plan"
          checked={selectedOption === 'enterprise'}
          onChange={handleOptionChange}
          helperText="Custom pricing, priority support"
        />
      </fieldset>
      
      {selectedOption && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <p style={{ margin: 0 }}>Selected plan: <strong>{selectedOption}</strong></p>
        </div>
      )}
    </div>
  );
}

export default UIDemo; 