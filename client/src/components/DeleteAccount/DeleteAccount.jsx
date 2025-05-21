import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeleteUserMutation } from '../../redux/profileAuthApi/profileAuthApi';
import { useSelector } from 'react-redux';
import Spinner from '../Spinner/Spinner';

const DeleteAccount = () => {
  const navigate = useNavigate();
  const [deleteUser, { isLoading }] = useDeleteUserMutation();
  const darkMode = useSelector((state) => state.theme.darkMode);

  const handleDelete = async () => {
    const confirmDelete = window.confirm(
      '⚠️ This will permanently delete your account and all data. Continue?'
    );
    if (!confirmDelete) return;

    try {
      await deleteUser().unwrap();
      localStorage.removeItem('token');
      navigate('/signup');
    } catch (err) {
      console.error('Delete account failed:', err);
      alert(err.data?.message || 'Could not delete your account.');
    }
  };

  return (
    <div
      className={`
        max-w-xl mx-auto mt-10 p-6 rounded-xl shadow-md
        transition duration-300 ease-in-out
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}
      `}
    >
      <h2 className="text-2xl font-bold text-red-600 mb-4">
        Delete Your Account
      </h2>
      <p className="mb-6 leading-relaxed">
        This action is <span className="font-semibold text-red-600">permanent</span> and will remove all your data including meetings, recordings, and account settings.
        Please be absolutely sure before proceeding.
      </p>

      <button
        onClick={handleDelete}
        disabled={isLoading}
        className={`
          w-full py-3 text-center rounded-lg font-semibold
          ${isLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
          text-white transition-all duration-200
        `}
      >
        {isLoading ? <Spinner /> : 'Yes, Delete My Account'}
      </button>
    </div>
  );
};

export default DeleteAccount;
