import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Full-screen centered loader (typically used during page load)
export const Loader = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-700 border-t-transparent"></div>
    </div>
  );
};

// Reusable inline loader with size options
export const Loader1: React.FC<LoaderProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-4',
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-t-blue-400 border-solid border-blue-200 ${sizeClasses[size]} ${className}`}
    />
  );
};
