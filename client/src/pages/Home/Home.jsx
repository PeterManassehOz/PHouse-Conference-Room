// Home.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

// Icons
import { IoArrowBack, IoLogOut } from "react-icons/io5";
import { LuLayoutDashboard } from "react-icons/lu";
import {
  MdVideoCall,
  MdHistory,
  MdEventAvailable,
} from "react-icons/md";
import { AiOutlineCalendar } from "react-icons/ai";
import { FiPhoneIncoming, FiSettings } from "react-icons/fi";import { PiRecordFill } from 'react-icons/pi';
import { FcInvite } from "react-icons/fc";
import { IoIosNotifications } from "react-icons/io";
import LivingSeed from "/LSeed-Logo-1.png";

// Components
import DarkMode from "../../components/DarkMode/DarkMode";
import Dashboard from "../../components/Dashboard/Dashboard";
import StartMeeting from "../../components/StartMeeting/StartMeeting";
import JoinMeeting from "../../components/JoinMeeting/JoinMeeting";
import ScheduleMeeting from "../../components/ScheduleMeeting/ScheduleMeeting";
import PreviousMeetings from "../../components/PreviousMeetings/PreviousMeetings";
import UpcomingMeetings from "../../components/UpcomingMeetings/UpcomingMeetings";
import RecordedMeetings from "../../components/RecordedMeetings/RecordedMeetings";
import Invite from "../../components/Invite/Invite"
import { useGetInvitesQuery } from "../../redux/meetingApi/meetingApi";
import Notifications from "../../components/Notifications/Notifications";
import { useGetNotificationsQuery } from '../../redux/notificationApi/notificationApi';






const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: <LuLayoutDashboard /> },
  { key: "host-meeting", label: "Host Meeting", icon: <MdVideoCall /> },
  { key: "join-meeting", label: "Join Meeting", icon: <FiPhoneIncoming /> },
  { key: "schedule-meeting", label: "Schedule Meeting", icon: <AiOutlineCalendar /> },
  { key: "previous-meetings", label: "Previous Meetings", icon: <MdHistory /> },
  { key: "upcoming-meetings", label: "Upcoming Meetings", icon: <MdEventAvailable /> },
  { key: "recorded-meetings", label: "Recorded Meetings", icon: <PiRecordFill /> },
  { key: "invites", label: "Invitations", icon: <FcInvite /> },
  { key: "notifications", label: "Notifications", icon: <IoIosNotifications /> },
];

const Home = () => {
  const darkMode = useSelector((s) => s.theme.darkMode);
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const location = useLocation();

  const { data: invites = [], isLoading: invitesLoading } = useGetInvitesQuery();
  const inviteCount = invites.length;
  const { data: notifications = [], isLoading: notificationsLoading } = useGetNotificationsQuery();
  const unreadCount = notifications.length;

  
  // Auto-select Dashboard > Profile if redirected from email verification
  useEffect(() => {
    if (location.state?.showDashboard && location.state?.showProfile) {
      setSelected("dashboard"); // Show Dashboard
    }
  }, [location.state]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get("view");
    if (view) {
      setSelected(view);
    }
  }, [location.search]);


  const goBack = () => setSelected(null);
  const logOut = () => {
    ["token", "phcode", "userId", "userProfile"].forEach((k) =>
      localStorage.removeItem(k)
    );
    navigate("/login");
  };

  const sidebarBg = "bg-[#00013d]";
  const sidebarText = "text-white";
  const activeBg = "bg-[#060888]";
  const hoverBg = "hover:bg-[#060888]";

  return (
    <div className={`h-screen flex overflow-hidden ${
      darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-black"
    }`}>
      {/* SIDEBAR */}
      <aside
        className={`
          ${sidebarBg} ${sidebarText}
          fixed inset-0 p-6 flex flex-col z-10
          w-full            /* mobile: full width */
          md:w-28           /* desktop: 7rem */
          ${selected ? "hidden" : "flex"} md:flex
          transition-width duration-300
        `}
      >
        {/* Logo */}
        <div className="flex justify-center mb-10"> {/* Reduced bottom margin */}
          <img
            src={LivingSeed}
            alt="Logo"
            className="w-28 md:w-full h-6 rounded-md shadow-md"
          />
        </div>

        {/* Sidebar Menu */}
        <div className="flex flex-col gap-2 w-full"> {/* Removed flex-1 */}
          <ul className="flex flex-col gap-2">
            {menuItems.map(({ key, label, icon }) => (
              <li
                key={key}
                onClick={() => setSelected(key)}
                title={label}
                className={`relative 
                  flex items-center gap-3 p-3 rounded-md cursor-pointer
                  transition-colors ${hoverBg}
                  ${selected === key ? activeBg : ""}
                  justify-start
                  md:justify-center
                `}
              >
                <span className="text-2xl md:text-3xl">{icon}</span>
                <span className="ml-1 text-lg md:hidden">{label}</span>

                 {key === 'invites' && !invitesLoading && inviteCount > 0 && (
                    <span
                      className="
                        absolute top-2 right-2
                        inline-flex items-center justify-center
                        w-5 h-5 text-xs font-bold
                        rounded-full
                        bg-red-500 text-white
                      "
                    >
                      {inviteCount}
                    </span>
                  )}

                   {key === 'notifications' && !notificationsLoading && unreadCount > 0 && (
                    <span
                      className="
                        absolute top-2 right-2
                        inline-flex items-center justify-center
                        w-5 h-5 text-xs font-bold
                        rounded-full
                        bg-red-500 text-white
                      "
                    >
                      {unreadCount}
                    </span>
                  )}
              </li>
            ))}
            <li className="flex items-center justify-start md:justify-center p-3 rounded-md transition-colors ${hoverBg}">
              <DarkMode />
            </li>
          </ul>
        </div>

      {/* Logout Button Positioned at the Bottom with Gap */}
      <div className="mt-auto pt-4">
        <button
          onClick={logOut}
          title="Log out"
          className={`
            flex items-center gap-2 py-3 px-4 rounded-md cursor-pointer
            transition-colors bg-red-600 hover:bg-red-800
            justify-start    
            md:justify-center 
            w-full
          `}
        >
          <IoLogOut className="text-2xl md:text-3xl" />
          <span className="ml-2 md:hidden">Log out</span>
        </button>
      </div>
    </aside>

      {/* CONTENT */}
      <main
        className={`
          flex-1 transition-all duration-300 overflow-auto
          ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-black"}
          ${selected ? "block" : "hidden md:block"}
          md:ml-28           /* push content right by sidebar width */
        `}
        style={{ height: "100vh" }}
      >
        {/* Mobile Back Button for Home sections (except Dashboard) */}
        {selected && selected !== "dashboard" && (
          <button
            onClick={goBack}
            className="
              md:hidden flex items-center justify-center m-4
              w-10 h-10 bg-[#00013d] rounded-full cursor-pointer
              text-white hover:bg-[#11144f] transition-colors duration-300
            "
          >
            <IoArrowBack className="text-2xl" />
          </button>
        )}

        {/* Render selected */}
        {!selected && <Dashboard />}
        {selected === "dashboard" && <Dashboard onBack={goBack} />}
        {selected === "host-meeting" && <StartMeeting />}
        {selected === "join-meeting" && <JoinMeeting />}
        {selected === "schedule-meeting" && <ScheduleMeeting />}
        {selected === "previous-meetings" && <PreviousMeetings />}
        {selected === "upcoming-meetings" && <UpcomingMeetings />}
        {selected === "recorded-meetings" && <RecordedMeetings />}
        {selected === "invites" && <Invite />}
        {selected === "notifications" && <Notifications />}
      </main>
    </div>
  );
};

export default Home;


/*
, the auto-mute mic/video on join, auto-record, background blur settings, language, time zone, log out elsewhere, calendar integrations to my app
*/