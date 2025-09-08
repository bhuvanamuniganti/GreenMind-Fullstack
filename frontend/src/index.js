import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import "./App.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AiLearningStudio from "./sections/AiLearningStudio";
import TranslatorSection from "./sections/TranslatorSection";
import FlashCardSection from "./sections/FlashCardSection";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
  <ToastContainer position="top-right" autoClose={2000} />
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/ai-learning" element={<AiLearningStudio />} />
     <Route path="/translator" element={<TranslatorSection />} />
     <Route path="/flashcards" element={<FlashCardSection />} />
     
     

      {/* keep /tutor route for later if you add it */}
    </Routes>
     
  </BrowserRouter>
);
