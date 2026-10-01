import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ensureGameFonts, preloadIntroResources } from "./routes/pageResources.js";
import "./index.css";

ensureGameFonts(document, window.location.pathname);
preloadIntroResources(document, window.location.pathname);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
