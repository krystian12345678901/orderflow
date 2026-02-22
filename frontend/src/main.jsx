// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

// Global styles
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #030712;
    color: #e2e8f0;
    -webkit-font-smoothing: antialiased;
  }

  input, textarea, select, button {
    font-family: inherit;
  }

  input::placeholder, textarea::placeholder {
    color: #475569;
  }

  select option {
    background: #0d1117;
    color: #e2e8f0;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
    background: #080d14;
  }
  ::-webkit-scrollbar-thumb {
    background: #334155;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #475569;
  }

  @keyframes fadeUp {
    from { transform: translateY(14px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  @keyframes slideIn {
    from { transform: translateX(20px); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
