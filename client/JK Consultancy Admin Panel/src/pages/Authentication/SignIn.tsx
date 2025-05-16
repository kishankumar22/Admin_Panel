// components/SignIn.tsx
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
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showOTPModal, setShowOTPModal] = useState<boolean>(false);
  const [loginData, setLoginData] = useState<{ token: string; user: any } | null>(null);
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await axiosInstance.post("/login", { email, password });
      const data = response.data;

      if (response.status === 200) {
        // Store login data but don't login yet
        setLoginData(data);
        // Show OTP modal
        setShowOTPModal(true);
        toast.info("OTP sent to your email");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      if (error.response) {
        const errorMsg =
          error.response.data.error || "An error occurred. Please try again later.";
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      } else {
        setErrorMessage("An error occurred. Please try again later.");
        toast.error("An error occurred. Please try again later.");
      }
    }
  };

  const handleResendOTP = async () => {
    try {
      await axiosInstance.post("/resend-otp", { email });
    } catch (error) {
      throw error;
    }
  };

  const handleOTPVerificationSuccess = () => {
    if (loginData) {
      login(loginData.token, loginData.user);
      navigate("/", { state: { loginSuccess: true } });
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

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