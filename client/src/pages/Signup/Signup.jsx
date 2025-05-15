import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRegisterUserMutation } from '../../redux/userAuthApi/userAuthApi';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import Spinner from '../../components/Spinner/Spinner';

const Signup = () => {
  const schema = yup.object().shape({
    firstname: yup.string().required('First name is required'),
    lastname: yup.string().required('Last name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    phcode: yup.string().required('PH code is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    confirmPassword: yup.string().oneOf([yup.ref('password'), null], 'Passwords must match').required('Confirm password is required'),
    terms: yup.boolean().oneOf([true], 'You must agree to the terms and conditions'),
  });

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });

  
  const darkMode = useSelector((state) => state.theme.darkMode);
  
  const [registerUser, { isLoading }] = useRegisterUserMutation();
  const navigate = useNavigate();


  const onSubmit = async (data) => {
  

    try {
      const response = await registerUser(data).unwrap();
      localStorage.setItem('token', response.token);
      localStorage.setItem('phcode', data.phcode);
      localStorage.setItem('email', data.email);
      console.log(data);
      if (response.user && response.user._id) {
        localStorage.setItem('userId', response.user._id);  // Assuming `id` is the field you need
      }
      
      toast.success('Signup successful! Please verify your email.');
      navigate('/verify-email');
    } catch (error) {
      console.error(error);
      toast.error(error?.data?.message || "Registration failed");
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-black"}`}>
      <form 
         className={`w-full max-w-md p-8 shadow-md rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}
        onSubmit={handleSubmit(onSubmit)}
      >
        <h2  className={`text-2xl font-semibold text-center mb-6 ${darkMode ? "text-white" : "text-black" }`}>Sign Up</h2>

        <input 
          className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          type="text" 
          placeholder="First Name" 
          {...register("firstname")} 
        />
        {errors.firstname && <p className="text-red-500 text-sm">{errors.firstname.message}</p>}

        <input 
          className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          type="text" 
          placeholder="Last Name" 
          {...register("lastname")} 
        />
        {errors.lastname && <p className="text-red-500 text-sm">{errors.lastname.message}</p>}

        <input 
          className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          type="email" 
          placeholder="Email" 
          {...register("email")} 
        />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}

        <input 
          className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          type="text" 
          placeholder="PH Code" 
          {...register("phcode")} 
        />
        {errors.phcode && <p className="text-red-500 text-sm">{errors.phcode.message}</p>}


        <input 
          className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          type="password" 
          placeholder="Password" 
          {...register("password")} 
        />
        {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}

        <input 
          className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          type="password" 
          placeholder="Confirm Password" 
          {...register("confirmPassword")} 
        />
        {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>}



        <div className="flex items-center mb-4">
          <input className="mr-2 active:accent-blue-800 accent-blue-200 cursor-pointer" type="checkbox" {...register("terms")} />
          <span className={`text-sm ${darkMode ? "text-white" : "text-gray-600" }`}>Agree to terms and conditions</span>
        </div>
        {errors.terms && <p className="text-red-500 text-sm">{errors.terms.message}</p>}

        <button 
          className="w-full bg-[#00013d] text-white py-2 rounded-md hover:bg-[#03055B] transition duration-200 cursor-pointer" 
          type="submit"
        >
         {isLoading ? <Spinner /> : 'Sign Up'}
        </button>

        <div className={`text-center mt-4 ${darkMode ? "text-white" : "text-gray-600" }`}>
          Have an account? <Link to="/login" className={`${darkMode ? "text-blue-900" : "text-blue-900" }`}>Log in</Link>
        </div>
      </form>
    </div>
  );
};

export default Signup;
