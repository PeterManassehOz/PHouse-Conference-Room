import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleDarkMode } from "../../redux/themeSlice/themeSlice";
import { MdOutlineWbSunny } from "react-icons/md";
import { FaMoon } from "react-icons/fa";

const DarkMode = () => {
  const dispatch = useDispatch();
  const darkMode = useSelector((state) => state.theme.darkMode);

  return (
    <div
      onClick={() => dispatch(toggleDarkMode())}
      className="cursor-pointer text-white transition duration-300"
      title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {darkMode ? (
        <MdOutlineWbSunny size={28} className="hover:scale-110 transition-transform duration-200" />
      ) : (
        <FaMoon size={26} className="hover:scale-110 transition-transform duration-200" />
      )}
    </div>
  );
};

export default DarkMode;
