import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import axiosInstance from "../../config";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import OTPVerificationModal from "./OTPVerificationModal";

const SignIn: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOTPModal, setShowOTPModal] = useState<boolean>(false);
  const [loginData, setLoginData] = useState<{ token: string; user: any } | null>(null);
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is remembered on this device
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser && isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      // Check if user is remembered
      const rememberedUser = localStorage.getItem('rememberedUser');
      if (rememberedUser === email) {
        const response = await axiosInstance.post("/login", { 
          email, 
          password,
          skipOTP: true 
        });
        
        if (response.status === 200) {
          login(response.data.token, response.data.user);
          navigate("/", { state: { loginSuccess: true } });
          toast.success("Login successful");
        }
        return;
      }

      const response = await axiosInstance.post("/login", { 
        email, 
        password,
        rememberMe 
      });
      const data = response.data;

      if (response.status === 200) {
        if (data.skipOTP) {
          // Direct login for remembered devices
          login(data.token, data.user);
          if (rememberMe) {
            localStorage.setItem('rememberedUser', email);
          }
          navigate("/", { state: { loginSuccess: true } });
          toast.success("Login successful");
        } else {
          // Store login data and show OTP modal
          setLoginData(data);
          setShowOTPModal(true);
          toast.info("OTP sent to your email");
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      if (error.response) {
        const status = error.response.status;
        let errorMsg = "An error occurred. Please try again later.";
        
        if (status === 400) {
          errorMsg = "Email and password are required";
        } else if (status === 404) {
          errorMsg = "User not found";
        } else if (status === 401) {
          errorMsg = "Invalid credentials";
        }
        
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      } else {
        setErrorMessage("Network error. Please try again later.");
        toast.error("Network error. Please try again later.");
      }
    }
  };

  const handleResendOTP = async () => {
    try {
      await axiosInstance.post("/resend-otp", { email });
      toast.info("OTP resent to your email");
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || "Failed to resend OTP";
      toast.error(errorMsg);
      throw error;
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
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-8 w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
        <form onSubmit={handleLogin}>
          {errorMessage && <p className="text-red-500 text-sm mb-4">{errorMessage}</p>}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-4 relative">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring focus:ring-blue-300 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 top-6.5 flex items-center text-gray-600"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring focus:ring-blue-300"
            >
              Login
            </button>
          </div>
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