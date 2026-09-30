import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// No StrictMode: the WebGL scene owns a single canvas context and must not be built twice.
createRoot(document.getElementById("root")!).render(<App />);
