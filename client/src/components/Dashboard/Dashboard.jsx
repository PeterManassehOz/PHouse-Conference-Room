import { useState } from "react";
import { IoArrowBack } from "react-icons/io5";
import { IoIosPerson } from "react-icons/io";
import { TbPasswordUser } from "react-icons/tb";
import { AiOutlineMenu } from "react-icons/ai";
import { MdDeleteForever } from "react-icons/md";

// Components
import Profile from "../../components/Profile/Profile";
import ResetPassword from "../../components/ResetPassword/ResetPassword";
import DeleteAccount from "../../components/DeleteAccount/DeleteAccount";




const dashboardItems = [
  { key: "profile", label: "Profile", icon: <IoIosPerson /> },
  { key: "reset-password", label: "Reset Password", icon: <TbPasswordUser /> },
  { key: "delete-account",  label: "Delete Account", icon: <MdDeleteForever /> },
];

const Dashboard = ({ onBack }) => {
  const [selected, setSelected] = useState("profile");
  const [showSidebar, setShowSidebar] = useState(true);

  // Toggle sidebar visibility
  const toggleSidebar = () => setShowSidebar((v) => !v);

  // Handle selecting a component and auto-closing sidebar
  const handleSelect = (key) => {
    setSelected(key);
    setShowSidebar(false); // Auto-close sidebar on component click
  };

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* SIDEBAR */}
      <aside
        className={`
          bg-[#02045c] text-white
          w-28 p-6 flex flex-col justify-between relative
          transition-all duration-300
          ${showSidebar ? "block" : "hidden"} md:block
        `}
      >

        <ul className="space-y-2">
          {dashboardItems.map(({ key, icon }) => (
            <li
              key={key}
              onClick={() => handleSelect(key)}
              className={`
                flex items-center justify-center gap-2 p-3 rounded-md
                cursor-pointer hover:bg-[#00013d] transition-colors
                ${selected === key ? "bg-[#00013d]" : ""}
              `}
            >
              <span className="text-2xl">{icon}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-6 overflow-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="
              md:hidden flex items-center justify-center m-4
              w-10 h-10 bg-[#00013d] rounded-full cursor-pointer
              text-white hover:bg-[#11144f] transition-colors duration-300
            "
          >
            <IoArrowBack className="text-2xl" />
          </button>
        )}

        {/* Render chosen pane */}
        {selected === "profile" && <Profile />}
        {selected === "reset-password" && <ResetPassword />}
        {selected === "delete-account" && <DeleteAccount />}

        {/* Floating menu icon on mobile */}
        <button
          onClick={toggleSidebar}
          className="fixed top-10 right-10 bg-[#00013d] text-white p-2 rounded-full md:hidden"
        >
          <AiOutlineMenu className="text-2xl" />
        </button>
      </main>
    </div>
  );
};

export default Dashboard;
