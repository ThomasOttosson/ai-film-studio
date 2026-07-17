import React from "react";
import ReactDOM from "react-dom/client";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { AIActionQueueProvider } from "./providers/AIActionQueueProvider";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Kunde inte starta applikationen eftersom elementet "#root" saknas.',
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <AIActionQueueProvider>
        <App />
      </AIActionQueueProvider>
    </AuthProvider>
  </React.StrictMode>,
);