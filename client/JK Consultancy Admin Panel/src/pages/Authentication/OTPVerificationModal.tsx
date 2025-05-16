import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../config";

interface OTPVerificationModalProps {
  email: string;
  onVerify: () => void;
  onClose: () => void;
  onResend: () => Promise<void>;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  email,
  onVerify,
  onClose,
  onResend,
}) => {
  const [otp, setOtp] = useState<string>("");
  const [isResending, setIsResending] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(60);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await axiosInstance.post("/verify-otp", {
        email,
        otp,
      });

      if (response.status === 200) {
        toast.success("OTP verified successfully!");
        onVerify();
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);
      const errorMsg =
        error.response?.data?.error ||
        "Invalid OTP. Please try again.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend();
      setCountdown(60);
      setError(null);
      toast.success("New OTP sent to your email!");
    } catch (error) {
      toast.error("Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow numbers
    setOtp(value);
    setError(null); // Clear error when user types
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Verify OTP</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-gray-600">
          We've sent a 6-digit OTP to <strong className="text-blue-600">{email}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Enter OTP
            </label>
            <input
              type="text"
              className={`shadow appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 ${
                error ? "border-red-500 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"
              }`}
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit code"
              maxLength={6}
              required
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-xs italic mt-1">{error}</p>
            )}
          </div>

          <div className="flex justify-between items-center mb-4">
            <button
              type="submit"
              disabled={otp.length !== 6 || isSubmitting}
              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50 transition-colors ${
                (otp.length !== 6 || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : "Verify OTP"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 font-medium py-2 px-4 rounded focus:outline-none"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          {countdown > 0 ? (
            <p className="text-gray-500 text-sm">
              Resend OTP in <span className="font-medium">{countdown}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={isResending}
              className={`text-blue-600 hover:text-blue-800 font-medium text-sm focus:outline-none ${
                isResending ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isResending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : "Resend OTP"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
