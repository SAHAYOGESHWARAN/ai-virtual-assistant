// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // This should be correct if you are using React 18
import App from './App'; // Importing the App component
import './index.css'; // Optional: If you have global styles, import them here

// Create a root for React
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render the App component inside the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
