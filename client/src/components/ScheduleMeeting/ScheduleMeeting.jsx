// src/components/ScheduleMeeting.jsx
import React, { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useScheduleMeetingMutation } from "../../redux/meetingApi/meetingApi";
import { useGetUserProfileQuery, useGetUsersQuery } from "../../redux/profileAuthApi/profileAuthApi";
import { useSelector } from "react-redux";
import Spinner from "../Spinner/Spinner";
import { toast } from "react-toastify";

const schema = yup.object({
  title: yup.string().required("Title is required"),
  description: yup.string(),
  date: yup
    .string()
    .required("Date & time is required")
    .test("future", "Date must be in the future", v => new Date(v) > new Date()),
  participants: yup
    .array()
    .of(yup.string().email("Invalid email"))
    .min(1, "Invite at least one person"),
});

export default function ScheduleMeeting() {
  const darkMode = useSelector(s => s.theme.darkMode);
  const { data: users = [] } = useGetUsersQuery();
  const { data: me } = useGetUserProfileQuery();
  const [createMeeting, { isLoading: saving }] = useScheduleMeetingMutation();
  const [search, setSearch] = useState("");
  const [tagInput, setTagInput] = useState("");

  // filter dropdown suggestions
  const suggestions = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter(u => u.email.toLowerCase().includes(term) && (!me || u.email !== me.email));
  }, [users, search, me]);

  const { register, handleSubmit, control, getValues, setValue, reset, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { title: "", description: "", date: "", participants: [] },
  });

  const onSubmit = async data => {
    try {
      await createMeeting(data).unwrap();
      toast.success("Meeting scheduled!");
      reset();
      setSearch("");
      setTagInput("");
    } catch {
      toast.error("Failed to schedule");
    }
  };

  return (
     <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-black"}`}>
      <form onSubmit={handleSubmit(onSubmit)} className={`w-full max-w-lg space-y-6 p-8 rounded-lg shadow-md ${darkMode ? "bg-gray-800" : "bg-white"}`}>

        <h2 className="text-2xl font-bold text-center">Schedule a Meeting</h2>

        {/* Title */}
        <div>
          <input
            {...register("title")}
            placeholder="Title"
            className={`w-full p-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />
          {errors.title && <p className="mt-1 text-red-400">{errors.title.message}</p>}
        </div>

        {/* Description */}
        <div>
          <textarea
            {...register("description")}
            placeholder="Description (optional)"
            rows={3}
            className={`w-full p-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />
          {errors.description && <p className="mt-1 text-red-400">{errors.description.message}</p>}
        </div>

        {/* Date */}
        <div>
          <input
            {...register("date")}
            type="datetime-local"
            className={`w-full p-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />
          {errors.date && <p className="mt-1 text-red-400">{errors.date.message}</p>}
        </div>

        {/* Participants tags */}
        <div>
          <label className="block mb-1 font-medium">Invite Participants</label>
          {/* Tag input */}
          <div className="flex space-x-2 mb-3">
            <input
              type="text"
              placeholder="Type or paste emails, click Add"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              className={`w-full p-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
            />
            <button
              type="button"
              onClick={() => {
                const parts = tagInput
                  .split(",")
                  .map(s => s.trim())
                  .filter(Boolean);
                const current = getValues("participants");
                setValue("participants", Array.from(new Set([...current, ...parts])));
                setTagInput("");
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Suggestion dropdown */}
          {search && (
            <ul className={`max-h-40 overflow-auto mb-2 border p-2 rounded ${darkMode ? "bg-gray-700 text-white border-gray-600" : "bg-gray-100 text-gray-800 border-gray-300"}`}>
              {suggestions.map(u => (
                <li
                  key={u._id}
                  onClick={() => {
                    const email = u.email;
                    const current = getValues("participants");
                    setValue("participants", Array.from(new Set([...current, email])));
                    setSearch("");
                  }}
                  className={`p-1 cursor-pointer ${darkMode ? "hover:bg-gray-600" : "hover:bg-gray-200"}`}
                >
                  {u.email}
                </li>
              ))}
            </ul>
          )}

          {/* Search input */}
          <input
            type="text"
            placeholder="Or search & click to add…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />

          {/* Display tags */}
          <Controller
            name="participants"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2 mt-3">
                {field.value.map(email => (
                  <span key={email} className="flex items-center space-x-1 bg-blue-500 text-white px-2 py-1 rounded">
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => field.onChange(field.value.filter(e => e !== email))}
                      className="font-bold hover:text-red-700 text-red-500 cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          />
          {errors.participants && <p className="mt-1 text-red-400">{errors.participants.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-md bg-[#00013d] text-white hover:bg-[#03055B] transition cursor-pointer"
        >
          {saving ? <Spinner /> : "Schedule Meeting"}
        </button>
      </form>
    </div>  
  );
}
