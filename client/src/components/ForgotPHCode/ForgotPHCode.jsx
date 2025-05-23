import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useForgotPHCodeMutation } from '../../redux/userAuthApi/userAuthApi'
import { toast } from 'react-toastify'
import { useSelector } from 'react-redux'
import Spinner from '../Spinner/Spinner'
import { useNavigate } from 'react-router-dom'

const ForgotPHCode = () => {
  const schema = yup.object().shape({
    email: yup.string().email("Invalid email").required("Email is required"),
  })

  const darkMode = useSelector((state) => state.theme.darkMode)

  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  })

  const [forgotPHCode, { isLoading }] = useForgotPHCodeMutation()

  const onSubmit = async (data) => {
    try {
      const response = await forgotPHCode({ email: data.email })

      if ('error' in response) {
        toast.error(response.error?.data?.message || response.error?.error || "Something went wrong!")
      } else {
        toast.success(response.data.message || "PHCode sent to your email.")
      }

      navigate('/login')
    } catch (error) {
      console.error("Forgot PHCode error:", error)
      toast.error("Unexpected error occurred.")
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-black"}`}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={`w-full max-w-md p-8 shadow-md rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}
      >
        <h2 className={`text-2xl font-semibold text-center mb-6 ${darkMode ? "text-white" : "text-black"}`}>Forgot PHCode</h2>

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
          {isLoading ? <Spinner /> : "Send PHCode"}
        </button>
      </form>
    </div>
  )
}

export default ForgotPHCode
