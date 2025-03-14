module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  rules: {
    // Downgrade unused variables from error to warning
    'no-unused-vars': 'warn',
    
    // Downgrade missing dependencies in useEffect from error to warning
    'react-hooks/exhaustive-deps': 'warn',
    
    // Downgrade ARIA role issues from error to warning
    'jsx-a11y/role-supports-aria-props': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'warn',
    
    // Downgrade template string expression warning
    'no-template-curly-in-string': 'warn',
    
    // React settings
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
}; 