import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
//import { useForgotPasswordMutation } from '../../redux/userAuthApi/userAuthApi';
//import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

const ForgotPassword = () => {
  const schema = yup.object().shape({
    email: yup.string().email("Invalid email").required("Email is required"),
  });


  
  const darkMode = useSelector((state) => state.theme.darkMode);

  const { register, handleSubmit, formState: { errors }, isLoading } = useForm({ resolver: yupResolver(schema) });

  //const [forgotPassword] = useForgotPasswordMutation(); // ✅ Call the hook correctly

  const onSubmit = async (/*data*/) => {
   // try {
     // const response = await forgotPassword({ email: data.email });

     // if ("error" in response) {
     //   toast.error(response.error?.data?.message || response.error?.error || "Something went wrong!");
     // } else {
     //   toast.success(response.data.message || "Check your email for a reset link!");
   //   }
   // } catch (error) {
    //  console.error("Forgot password error:", error);
 //   }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-black"}`}>
      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className={`w-full max-w-md p-8 shadow-md rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}
      >
        <h2 className={`text-2xl font-semibold text-center mb-6 ${darkMode ? "text-white" : "text-black" }`}>Forgot Password</h2>
        
        <input 
          className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`} 
          type="text" 
          placeholder="Email" 
          {...register("email")} 
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}

        <button 
          className="w-full bg-[#00013d] text-white py-2 rounded-md hover:bg-[#03055B] transition duration-200 cursor-pointer"  
          type="submit" 
          disabled={isLoading}
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;
