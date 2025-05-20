// Spinner.jsx
import React from "react";
import { useSelector } from "react-redux";

const Spinner = () => {
  const darkMode = useSelector((state) => state.theme.darkMode);
  return (
    <div className="flex justify-center items-center">
      <div className={`animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 ${darkMode ? "border-white" : "border-blue-900"}`}></div>
    </div>
  );
};

export default Spinner;
