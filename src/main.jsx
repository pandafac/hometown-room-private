import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/global.css";
import "./styles/home.css";
import "./styles/flows.css";
import "./styles/features.css";
import "./styles/room.css";
import "./styles/card.css";
import "./styles/merchant.css";
import "./styles/merchant-workbench.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
