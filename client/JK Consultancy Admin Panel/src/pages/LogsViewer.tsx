import React, { useEffect, useState } from 'react';
import axiosInstance from '../config';
import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';

const TABS = [
  { id: 'combined', label: 'Combined', color: 'bg-slate-600 hover:bg-slate-500' },
  { id: 'error', label: 'Error', color: 'bg-red-600 hover:bg-red-500' },
  { id: 'exceptions', label: 'Exceptions', color: 'bg-amber-600 hover:bg-amber-500' },
  { id: 'rejections', label: 'Rejections', color: 'bg-orange-600 hover:bg-orange-500' }
];

const getTabStyles = (tab: string, active: boolean) => {
  const tabConfig = TABS.find(t => t.id === tab);
  if (!active) return 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300';
  return `${tabConfig?.color} text-white shadow-md`;
};

const LogsViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState('combined');
  const [logContent, setLogContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchLog = async (type: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/logs/${type}`, { responseType: 'text' });
      setLogContent(res.data);
    } catch (err) {
      setError('Unable to fetch log content.');
      setLogContent('');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLog(activeTab);
  }, [activeTab]);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getLevelBadge = (level: string) => {
    const levelColors = {
      error: 'bg-red-100 text-red-800 border-red-200',
      warn: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      debug: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    return levelColors[level?.toLowerCase() as keyof typeof levelColors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const renderGridLogs = () => {
    if (!logContent.trim()) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p className="text-sm">No log entries found</p>
          </div>
        </div>
      );
    }

    const lines = logContent.split('\n').filter(line => line.trim());

    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-700 w-20">Level</th>
              <th className="text-left p-3 font-medium text-gray-700">Message</th>
              <th className="text-left p-3 font-medium text-gray-700 w-24">Method</th>
              <th className="text-left p-3 font-medium text-gray-700 w-40">Time</th>
              <th className="text-left p-3 font-medium text-gray-700 w-32">URL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((line, index) => {
              try {
                const parsed = JSON.parse(line);
                const isEven = index % 2 === 0;

                return (
                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${isEven ? 'bg-white' : 'bg-gray-25'}`}>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getLevelBadge(parsed.level)}`}>
                        {parsed.level?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    
                    <td className="p-3 max-w-md">
                      <div
                        onClick={() => handleCopy(parsed.message, index)}
                        title={parsed.message}
                        className="cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors relative group"
                      >
                        <div className="truncate text-gray-800">
                          {parsed.message || 'No message'}
                        </div>
                        {copiedIndex === index && (
                          <div className="absolute -top-8 left-0 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg">
                            Copied!
                          </div>
                        )}
                        <div className="opacity-0 group-hover:opacity-100 absolute right-1 top-1 text-xs text-gray-400">
                          📋
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <span className="inline-block px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded border border-purple-200">
                        {parsed.method || 'N/A'}
                      </span>
                    </td>

                    <td className="p-3 text-gray-600 text-xs font-mono">
                      {parsed.timestamp ? new Date(parsed.timestamp).toLocaleString() : 'N/A'}
                    </td>

                    <td className="p-3">
                      <span className="text-xs text-blue-600 font-mono truncate block max-w-32" title={parsed.url}>
                        {parsed.url || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              } catch {
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td colSpan={5} className="p-3">
                      <div className="bg-gray-100 rounded p-2 text-xs font-mono text-gray-700 whitespace-pre-wrap">
                        {line}
                      </div>
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-4 font-medium">Loading {activeTab} logs...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-center text-red-600">
            <div className="text-4xl mb-2">⚠️</div>
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => fetchLog(activeTab)}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return renderGridLogs();
  };

  return (
    <>
      <Breadcrumb pageName="View Logs" />
      <div className="p-2">
        {/* Header */}
        <div className="mb-2">
          
          <p className="text-gray-600 text-sm">Monitor and analyze system logs across different categories</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${getTabStyles(tab.id, activeTab === tab.id)} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.label}
              {loading && activeTab === tab.id && (
                <span className="ml-2 inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="min-h-[400px] max-h-[600px] overflow-auto">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Last updated: {new Date().toLocaleString()} • Auto-refresh disabled
        </div>
      </div>
    </>
  );
};

export default LogsViewer;