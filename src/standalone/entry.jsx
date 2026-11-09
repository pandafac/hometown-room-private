import React from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "../App.jsx";
import "./shim";
import "../styles/global.css";
import "../styles/home.css";
import "../styles/flows.css";
import "../styles/features.css";
import "../styles/room.css";
import "../styles/card.css";
import "../styles/merchant.css";
import "../styles/merchant-workbench.css";

window.__STANDALONE_MODE__ = true;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
