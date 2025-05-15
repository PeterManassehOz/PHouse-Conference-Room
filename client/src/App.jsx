import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ToastContainer } from "react-toastify";
import Home from './pages/Home/Home';
import Room from './pages/Room/Room';
import Signup from './pages/Signup/Signup';
import Login from './pages/Login/Login';
import { useSelector } from 'react-redux';
import ForgotPassword from './components/ForgotPassword/ForgotPassword';
import TokenResetPassword from './components/TokenResetPassword/TokenResetPassword';
import VerifyOtpWithEmail from './components/VerifyOtpWithEmail/VerifyOtpWithEmail';





function App() {
  const darkMode = useSelector((state) => state.theme.darkMode);
  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'
    }`}>
    <Router>
     <ToastContainer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:id" element={<Room />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path='/reset-password/:token' element={<TokenResetPassword />} />
        <Route path='/verify-email' element={<VerifyOtpWithEmail />} />
      </Routes>
    </Router>
    </div>
  );
}

export default App;
