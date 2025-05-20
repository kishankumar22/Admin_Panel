import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface Document {
  DocumentId: number;
  SupplierId: number;
  DocumentUrl: string;
  PublicId: string;
  CreatedOn: string;
}

interface DocumentViewerModalProps {
  document: Document;
  onClose: () => void;
}

const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ document, onClose }) => {
  const getFileType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '')) return 'image';
    if (extension === 'pdf') return 'pdf';
    if (['txt', 'csv'].includes(extension || '')) return 'text';
    return 'unknown';
  };

  const fileType = getFileType(document.DocumentUrl);

  const renderDocument = () => {
    switch (fileType) {
      case 'image':
        return (
          <img
            src={document.DocumentUrl}
            alt="Document"
            className="max-w-full max-h-[70vh] object-contain"
          />
        );
      case 'pdf':
        return (
          <iframe
            src={document.DocumentUrl}
            title="Document"
            className="w-full h-[70vh] border-0"
          />
        );
      case 'text':
        return (
          <div className="w-full h-[70vh] overflow-auto bg-white dark:bg-gray-800 p-4 rounded-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Text file preview is not fully supported. Please download the file to view its contents.
            </p>
            <a
              href={document.DocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Download {document.DocumentUrl.split('/').pop() || 'Document'}
            </a>
          </div>
        );
      default:
        return (
          <div className="w-full h-[70vh] flex items-center justify-center bg-white dark:bg-gray-800 p-4 rounded-md">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Preview not available for this file type. Please download the file.
            </p>
            <a
              href={document.DocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline ml-2"
            >
              Download {document.DocumentUrl.split('/').pop() || 'Document'}
            </a>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-3 w-full max-w-4xl mx-2 transform transition-all duration-300 scale-95 sm:scale-100 shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-red-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-150 z-10"
        >
          <FaTimes className="w-6 h-6 mr-3 mt-2" />
        </button>
        <h2 className="text-lg font-semibold mb-3 bg-gradient-to-r from-indigo-200 to-blue-200 p-1 rounded text-black dark:text-gray-100 flex items-center gap-1">
          View Document: {document.DocumentUrl.split('/').pop() || 'Document'}
        </h2>
        <div className="max-h-[70vh] overflow-auto">
          {renderDocument()}
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1 text-sm font-medium text-black dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-150"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;