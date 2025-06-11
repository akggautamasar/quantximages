// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client'; // Import from 'react-dom/client' for React 18
import './index.css'; // Optional: if you have a global CSS file, otherwise remove or adapt
import App from './App'; // Import your App component
import reportWebVitals from './reportWebVitals'; // Optional: for performance metrics

// Create a root to render your React app
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render your App component into the root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
