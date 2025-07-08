const DashboardLoader = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        {/* Main spinner */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin absolute" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
        </div>
        
        {/* Loading text with animation */}
        <div className="mt-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Loading Dashboard</h2>
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-8 w-64 mx-auto">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Please wait while we load your data...</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardLoader;