import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { AiOutlineClose } from "react-icons/ai";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useUpdateProfileMutation, useGetUserProfileQuery } from "../../redux/profileAuthApi/profileAuthApi";
import { useGetUpcomingQuery } from "../../redux/meetingApi/meetingApi";
import Spinner from "../Spinner/Spinner";
import { Link } from 'react-router-dom';




const Profile = () => {

  // Validation Schema
  const schema = yup.object().shape({
    username: yup.string().required("Username is required"),
    phone: yup.string().required("Phone is required"),
    bio: yup.string().max(250, "Bio cannot exceed 250 characters"),
    image: yup
      .mixed()
      .test("fileSize", "File size is too large", (value) => {
        if (!value.length) return true; // No file selected
        return value[0].size <= 2000000; // 2MB limit
      })
      .test("fileType", "Unsupported file type", (value) => {
        if (!value.length) return true; // No file selected
        return ["image/jpeg", "image/png", "image/jpg"].includes(value[0].type);
      }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm({
    resolver: yupResolver(schema),
  });


  // Dark Mode from Redux
  const darkMode = useSelector((state) => state.theme.darkMode);

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
   const { data: userProfile, isLoading: profileLoading, error, isError } = useGetUserProfileQuery();

     // 2) Upcoming meetings
  const { data: upcoming = [], isLoading: upcomingLoading } =
    useGetUpcomingQuery();

  // 3) Compute next meeting and greeting
  const nextMeeting = upcoming.length > 0 ? upcoming[0] : null;

  const formatTimestamp = (date) => {
  const today = new Date();
  const msgDate = new Date(date);
  const isToday = msgDate.toDateString() === today.toDateString();
  return isToday
    ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : msgDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const now = new Date();
  const greeting =
  now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";



     useEffect(() => {
    if (userProfile) {
      console.log('User Profile Data:', userProfile); // Log the full response here
      console.log('Image URL:', userProfile?.image);   // Log just the image URL if available
    }
  }, [userProfile]);


  const [imagePreview, setImagePreview] = useState(null);
  const imageRef = useRef();

  // Image Preview Handler
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setValue("image", event.target.files);
    }
  };

  // Remove Image Handler
  const handleRemoveImage = () => {
    setImagePreview(null);
    setValue("image", null);
    if (imageRef.current) {
      imageRef.current.value = null;
    }
  };

  // Form Submission
  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("phone", data.phone);
    formData.append("bio", data.bio);
    if (data.image && data.image.length > 0) {
      formData.append('image', data.image[0]) 
    }
  
    console.log("Form Data:", formData);
      
    try {
      const response = await updateProfile(formData).unwrap()
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      console.log('Token:', response.token);
      console.log("Profile Data:", data)      
      console.log("Profile Updated:", response)

      reset()  
      setImagePreview(null)
      toast.success('Profile updated successfully')

    } catch (error) {
      console.error("Update Error:", error)
      toast.error(error?.data?.message || 'Profile update failed')
    }

  }

  
  if (profileLoading) return <Spinner />;

if (isError) {
  console.error(error);
  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-start rounded-md "
      style={{ backgroundImage: "url('/Authenticate.jpg')" }}
    >
      <div className="m-6 sm:m-20">
        <p className="text-white font-bold text-2xl sm:text-4xl md:text-6xl bg-black/50 p-4 sm:p-6 rounded-md max-w-sm sm:max-w-md">
          Get authenticated to use Quorum.
        </p>

        <Link to="/login">
          <button className="mt-10 bg-[#00013d] text-white text-xl px-3 py-5 rounded-md hover:bg-[#03055B] transition cursor-pointer">
            Go to Login
          </button>
        </Link>
      </div>
    </div>
  );
}




  return (
  <div
  className={`min-h-screen p-6 flex flex-col gap-6 ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-gray-900"}`}
  >
   {/* ==== Greeting & Next Meeting ==== */}
    <div className={`p-5 rounded-md ${darkMode ? "text-white bg-gray-800" : "text-black bg-white"}`}>
  <div className="flex justify-between items-center flex-wrap w-full">
    <h1 className="text-3xl font-bold">
      {greeting}, {userProfile?.username}
    </h1>
    <span className="text-3xl font-semibold whitespace-nowrap">
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  </div>

  {nextMeeting ? (
    <p className="text-lg mt-2">
      Your next meeting:{" "}
      <span className="font-semibold">{nextMeeting.title}</span> on{" "}
      {formatTimestamp(nextMeeting.date)}
    </p>
  ) : (
    <p className="text-sm italic text-gray-500 mt-2">
      You have no upcoming meetings.
    </p>
  )}
</div>


  <div className="flex flex-col md:flex-row gap-6">
    {/* Profile Form */}
    <div className={`w-full md:w-1/4 p-8 shadow-md rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
      <h2 className={`text-2xl font-semibold text-center mb-6 ${darkMode ? "text-white" : "text-black"}`}>
        Edit Profile
      </h2>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <input
            type="text"
            placeholder="Username"
            {...register("username")}
            className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />
          {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
        </div>
        <div>
          <input
            type="text"
            placeholder="Phone"
            {...register("phone")}
            className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
        </div>
        <div>
          <textarea
            placeholder="Write your bio"
            {...register("bio")}
            className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />
          {errors.bio && <p className="text-red-500 text-sm">{errors.bio.message}</p>}
        </div>
        <label className="block w-full cursor-pointer">
          <span className="w-30 text-white bg-orange-700 hover:bg-orange-400 px-4 py-2 rounded-md text-center block transition">
            Choose File
          </span>
          <input type="file" className="hidden" accept=".jpg, .jpeg, .png" ref={imageRef} onChange={handleImageChange} />
        </label>
        {errors.image && <p className="text-red-500 text-sm">{errors.image.message}</p>}
        <button className="w-full bg-[#00013d] text-white py-2 rounded-md hover:bg-[#03055B] transition duration-200 cursor-pointer" type="submit" disabled={isLoading}>
          {isLoading ? <Spinner /> : "Save"}
        </button>
      </form>
    </div>

    {/* Profile Image Section */}
    <div className="flex-1 w-full md:w-2/4 flex items-center justify-center">
      {imagePreview ? (
        <div className="relative w-full h-[600px]">
          <img src={imagePreview} alt="Profile Preview" className="w-full h-full object-cover rounded-md shadow-md border-4 border-gray-300" />
          <button className="absolute top-4 right-4 bg-red-600 text-white p-1 rounded-full" onClick={handleRemoveImage}>
            <AiOutlineClose size={18} />
          </button>
        </div>
      ) : (
        <img src={userProfile?.image || "./profileIconBrown.jpeg"} alt="Profile" className="w-full h-[600px] object-cover rounded-md shadow-md border-4 border-gray-300" />
      )}
    </div>

    {/* Profile Details Section */}
    <div className={`p-4 shadow-md rounded-md w-full md:w-1/4 space-y-4 ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
        <div className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"} p-3 rounded-md`}>
          <h3 className="font-semibold">Name:</h3>
          <p>{userProfile?.username || "John Doe"}</p>
        </div>

        <div className={`${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"} p-3 rounded-md`}>
          <h3 className="font-semibold">Phone:</h3>
          <p>{ userProfile?.phone || "0123456789"}</p>
        </div>

        <div className={` ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"} p-3 rounded-md`}>
          <h3 className="font-semibold">Bio:</h3>
          <p>{userProfile?.bio || "Write something about yourself"}</p>
        </div>
    </div>
  </div>


      
      {/* ==== Upcoming Meetings ==== */}
      <div
        className={`w-full mt-6 p-6 mb-6 shadow-md rounded-md ${
          darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
        }`}
      >
        <h2 className="text-xl font-semibold text-center mb-4">Upcoming Meetings</h2>
          {upcomingLoading ? (
            <p className="text-center">Loading upcoming meetings…</p>
              ) : upcoming && upcoming.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {upcoming.map((m) => (
                    <div
                      key={m._id}
                      className={`flex-1 min-w-[150px] p-4 rounded-md ${
                        darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"
                      }`}
                    >
                      <h3 className="font-semibold">{m.title}</h3>
                      <p className="text-sm">{formatTimestamp(m.date)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center italic text-gray-500">You have no upcoming meetings.</p>
          )}
      </div>
  </div>

  );
};

export default Profile;
