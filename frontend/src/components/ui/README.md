# UI Component Library

This UI component library provides a set of reusable, accessible, and consistent components for building interfaces in the Code Beast application. The components are designed to work with React 19 and include support for document metadata generation.

## Components

### Button

A versatile button component with various states and variants.

```jsx
import { Button } from '../components/ui';
import { FiSave } from 'react-icons/fi';

// Basic usage
<Button>Click Me</Button>

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="tertiary">Tertiary</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
<Button variant="info">Info</Button>
<Button variant="link">Link</Button>
<Button variant="ghost">Ghost</Button>

// Sizes
<Button size="small">Small</Button>
<Button size="medium">Medium</Button>
<Button size="large">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading</Button>
<Button fullWidth>Full Width</Button>

// With icons
<Button icon={<FiSave />}>Save</Button>
<Button icon={<FiSave />} iconPosition="right">Save</Button>
```

### ErrorState

A component for displaying error messages with various styling options.

```jsx
import { ErrorState } from '../components/ui';

// Basic usage
<ErrorState 
  error="Failed to load data" 
  title="Error" 
  onRetry={() => fetchData()}
/>

// Variants
<ErrorState 
  error="Network request failed" 
  variant="inline"
/>

<ErrorState 
  error="Failed to load data" 
  title="Data Error"
  variant="card"
/>

<ErrorState 
  error={new Error("Server error occurred")}
  title="Something went wrong"
  variant="page"
/>
```

### FileInput

A component for file selection with drag-and-drop support, file validation, and preview.

```jsx
import { FileInput } from '../components/ui';

// Single file upload
<FileInput
  id="avatar"
  label="Profile Picture"
  accept="image/*"
  onChange={handleFileChange}
/>

// Multiple file upload
<FileInput
  id="documents"
  label="Documents"
  multiple
  onChange={handleFilesChange}
  maxSize={10} // 10MB limit
  allowedExtensions={['pdf', 'docx', 'txt']}
  error={fileError}
/>

// Directory upload
<FileInput
  id="project"
  label="Project Directory"
  directory
  onChange={handleDirectoryChange}
/>
```

### LoadingState

A component for displaying various types of loading indicators.

```jsx
import { LoadingState } from '../components/ui';

// Spinner
<LoadingState 
  type="spinner" 
  message="Loading data..." 
/>

// Skeleton loader
<LoadingState 
  type="skeleton" 
  message="Loading content..." 
/>

// Progress bar
<LoadingState 
  type="progress" 
  progress={65} 
  message="Uploading files..." 
/>

// Overlay (container)
<div style={{ position: 'relative', height: '200px' }}>
  <LoadingState 
    type="spinner" 
    overlay="container" 
    message="Processing..." 
  />
</div>

// Full screen overlay
<LoadingState 
  type="spinner" 
  overlay="fullscreen" 
  message="Loading application..." 
/>
```

## Usage with Metadata

All components include metadata for React 19 document generation:

```jsx
import { ButtonMetadata } from '../components/ui';

// Access component metadata
console.log(ButtonMetadata);
// {
//   componentName: "Button",
//   description: "Reusable button component with consistent styling",
//   version: "1.0.0",
//   author: "Code Beast Team",
//   keywords: ["ui", "button", "interaction", "form"]
// }
```

## Best Practices

1. **Consistency**: Use these components consistently throughout the application to maintain a unified look and feel.

2. **Accessibility**: The components are designed to be accessible. Maintain this by providing appropriate labels, ARIA attributes, and ensuring keyboard navigation works.

3. **Error Handling**: Always use the `ErrorState` component for displaying errors rather than creating custom error messages.

4. **Loading States**: Use the `LoadingState` component for all loading scenarios to provide consistent feedback to users.

5. **Form Components**: Use the provided form components like `FileInput` instead of native HTML elements to ensure consistent styling and behavior.

## Demo Page

You can see all components in action on the UI Demo page at `/ui-demo`. This page is useful for reference and testing. 