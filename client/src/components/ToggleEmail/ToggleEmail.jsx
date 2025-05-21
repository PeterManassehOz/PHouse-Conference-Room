// src/components/ToggleEmail/ToggleEmail.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { useGetUserSettingsQuery, useUpdateUserSettingsMutation } from '../../redux/profileAuthApi/profileAuthApi';
import { MdMarkEmailRead } from 'react-icons/md'; import { TbMailCancel } from 'react-icons/tb';
import { CgUnavailable } from "react-icons/cg";
import Spinner from '../Spinner/Spinner';
import { toast } from 'react-toastify';

export default function ToggleEmail() {
  const darkMode = useSelector(s => s.theme.darkMode);

  // 1️⃣ Fetch the current setting
  const { data, isLoading, isError, refetch } = useGetUserSettingsQuery();
  const [updateEmailSetting, { isLoading: isSaving }] = useUpdateUserSettingsMutation();

  if (isLoading) return <Spinner />;
  if (isError) return <CgUnavailable className='text-red-600 text-2xl'/>;


  const enabled = data?.emailNotifications || false;
  const title = enabled
    ? 'Turn off email notifications'
    : 'Turn on email notifications';

  const handleClick = async () => {
  if (isSaving) return;
  try {
    await updateEmailSetting({ emailNotifications: !enabled }).unwrap();
    toast.success('Setting updated successfully');
    refetch();
  } catch (err) {
    console.error('Failed to update setting:', err);
    toast.error('Failed to update setting');
  }
};


  return (
    <div
      onClick={handleClick}
      className={`
        cursor-pointer transition duration-300
        ${darkMode ? 'text-white' : 'text-white'}
        ${isSaving ? 'opacity-50 pointer-events-none' : 'hover:scale-110'}
      `}
      title={title}
    >
      {enabled ? (
        <MdMarkEmailRead size={28} />
      ) : (
        <TbMailCancel size={28} />
      )}
    </div>
  );
}
