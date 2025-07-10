import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import axiosInstance from "../../config";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import OTPVerificationModal from "./OTPVerificationModal";
import pic from './../../images/logo/logo.jpg';

const SignIn: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [loginData, setLoginData] = useState<{ token: string; user: any } | null>(null);
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser && isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const rememberedUser = localStorage.getItem('rememberedUser');
      if (rememberedUser === email) {
        const response = await axiosInstance.post("/login", { email, password, skipOTP: true });
        if (response.status === 200) {
          login(response.data.token, response.data.user);
          navigate("/", { state: { loginSuccess: true } });
          toast.success("Login successful");
        }
        return;
      }

      const response = await axiosInstance.post("/login", { email, password, rememberMe });
      const data = response.data;

      if (response.status === 200) {
        if (data.skipOTP) {
          login(data.token, data.user);
          if (rememberMe) {
            localStorage.setItem('rememberedUser', email);
          }
          navigate("/", { state: { loginSuccess: true } });
          toast.success("Login successful");
        } else {
          setLoginData(data);
          setShowOTPModal(true);
          toast.info("OTP sent to your email");
        }
      }
    } catch (error: any) {
      const status = error.response?.status;
      let errorMsg = "An error occurred. Please try again later.";
      if (status === 400) errorMsg = "Email and password are required";
      else if (status === 404) errorMsg = "User not found";
      else if (status === 401) errorMsg = "Invalid credentials";

      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleResendOTP = async () => {
    try {
      await axiosInstance.post("/resend-otp", { email });
      toast.info("OTP resent to your email");
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Failed to resend OTP";
      toast.error(errorMsg);
    }
  };

  const handleOTPVerificationSuccess = () => {
    if (loginData) {
      login(loginData.token, loginData.user);
      if (rememberMe) {
        localStorage.setItem('rememberedUser', email);
      }
      navigate("/", { state: { loginSuccess: true } });
      toast.success("Login successful");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="bg-white shadow-lg rounded-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={pic} alt="JKIOP Logo" className="h-20 w-20 object-contain mb-2" />
          <h1 className="text-2xl font-bold text-gray-800">JK Institute of Pharmacy</h1>
          <p className="text-sm text-gray-500 font-medium">Admin Panel Login</p>
        </div>

        <form onSubmit={handleLogin}>
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter Your Email"
            />
          </div>

          <div className="mb-4 relative">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2"
            />
            <label className="text-sm text-gray-700">Remember me on this device</label>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Login to Dashboard
          </button>
        </form>
      </div>

      {showOTPModal && (
        <OTPVerificationModal
          email={email}
          onVerify={handleOTPVerificationSuccess}
          onClose={() => setShowOTPModal(false)}
          onResend={handleResendOTP}
        />
      )}
    </div>
  );
};

export default SignIn;
