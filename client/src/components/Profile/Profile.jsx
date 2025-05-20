import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { AiOutlineClose } from "react-icons/ai";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useUpdateProfileMutation, useGetUserProfileQuery } from "../../redux/profileAuthApi/profileAuthApi";
import Spinner from "../Spinner/Spinner";



const Profile = () => {
  // Dark Mode from Redux
  const darkMode = useSelector((state) => state.theme.darkMode);

  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
   const { data: userProfile, isLoading: profileLoading, error } = useGetUserProfileQuery();

     useEffect(() => {
    if (userProfile) {
      console.log('User Profile Data:', userProfile); // Log the full response here
      console.log('Image URL:', userProfile?.image);   // Log just the image URL if available
    }
  }, [userProfile]);

  // Sample Data (Replace with your data fetching logic)
  const previousMeetings = ["Meeting 1", "Meeting 2", "Meeting 3"];
  const scheduledMeetings = ["Meeting 1", "Meeting 2", "Meeting 3"];
  const recordedMeetings = ["Meeting 1", "Meeting 2", "Meeting 3"];

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
  if (error) return <div className="text-red-500 text-center">Error loading profile.</div>;


  return (
<div
className={`min-h-screen p-6 flex flex-col gap-6 ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-gray-900"}`}
>
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

  {/* Full-Width Scheduled Calls, Meetings, and Videos */}
  <div className={`w-full mt-6 p-6 mb-6 shadow-md rounded-md ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
    <h2 className="text-xl font-semibold mb-4">Scheduled Meetings</h2>
    <div className="flex flex-wrap gap-4">
      {scheduledMeetings.map((schedule, index) => (
        <div key={index} className={`flex-1 min-w-[150px] p-4 rounded-md ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"}`}>
          {schedule}
        </div>
      ))}
    </div>

    <h2 className="text-xl font-semibold mt-6 mb-4">Previous Meetings</h2>
    <div className="flex flex-wrap gap-4">
      {previousMeetings.map((meeting, index) => (
        <div key={index} className={`flex-1 min-w-[150px] p-4 rounded-md ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"}`}>
          {meeting}
        </div>
      ))}
    </div>

    <h2 className="text-xl font-semibold mt-6 mb-4">Recorded Meetings</h2>
    <div className="flex flex-wrap gap-4">
      {recordedMeetings.map((recorded, index) => (
        <div key={index} className={`flex-1 min-w-[150px] p-4 rounded-md ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-black"}`}>
          {recorded}
        </div>
      ))}
    </div>
  </div>
</div>

  );
};

export default Profile;
