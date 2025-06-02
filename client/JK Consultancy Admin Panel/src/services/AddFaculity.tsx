import React, { useState, useRef, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-toastify";
import { useFaculty } from "../context/FacultyContext";
import { Faculty } from "../context/FacultyContext";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";
import { useAuth } from "../context/AuthContext";
import { MdDelete } from "react-icons/md";
import { FaEdit, FaSpinner, FaSave, FaToggleOn, FaToggleOff } from "react-icons/fa"; // Added FaSave
import { FcViewDetails } from "react-icons/fc";
import { usePermissions } from "../context/PermissionsContext";
import { IoDocumentsOutline } from "react-icons/io5";
import { useLocation } from "react-router-dom";
import axiosInstance from "../config";

const AddFaculty: React.FC = () => {
  const [addFacultyModel, setAddFacultyModel] = useState<boolean>(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultyName, setFacultyName] = useState<string>("");
  const [qualification, setQualification] = useState<string>("Select");
  const [otherQualification, setOtherQualification] = useState<string>("");
  const [designation, setDesignation] = useState<string>("Select");
  const [otherDesignation, setOtherDesignation] = useState<string>("");
  const [profileFile, setProfileFile] = useState<File | undefined>(undefined);
  const [documents, setDocuments] = useState<{ title: string; file: File | null; url?: string }[]>([]);
  const [monthlySalary, setMonthlySalary] = useState<number | "">("");
  const [yearlyLeave, setYearlyLeave] = useState<number | "">("");
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
  const [facultyIdToDelete, setFacultyIdToDelete] = useState<number | null>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openDocsModal, setOpenDocsModal] = useState<boolean>(false);
  const [selectedFacultyDocs, setSelectedFacultyDocs] = useState<Faculty | null>(null);
  const [openPreviewModal, setOpenPreviewModal] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<{ title: string; url: string } | null>(null);
  const [existingProfilePic, setExistingProfilePic] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingDocIndex, setEditingDocIndex] = useState<number | null>(null); // Track which document is being edited
  const [editedDocTitle, setEditedDocTitle] = useState<string>(""); // Store the edited title temporarily

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const { faculties, addFaculty, updateFaculty, deleteFaculty, toggleVisibility } = useFaculty();
  const { user } = useAuth();
  const createdBy = user?.name || "admin";
  const modify_by = user?.name;
  const { fetchRoles, fetchPages, fetchPermissions, pages, permissions } = usePermissions();

  useEffect(() => {
    const fetchData = async () => {
      await fetchRoles();
      await fetchPages();
      await fetchPermissions();
    };
    fetchData();
  }, []);
 // Use useLocation to get the current path
  const location = useLocation();
  const currentPageName = location.pathname.split('/').pop();
  // console.log("currentPageName :", currentPageName);

  // Permissions and roles
  // Prefixing currentPageName with '/' to match the database format
  const prefixedPageUrl = `/${currentPageName}`;
  const pageId = pages.find(page => page.pageUrl === prefixedPageUrl)?.pageId;
    // const roleId = roles.find(role => role.role_id === user?.roleId)?.role_id;
  const userPermissions = permissions.find(perm => perm.pageId === pageId && perm.roleId === user?.roleId);
 const loggedroleId = user?.roleId;
// Set default permissions based on role ID
const defaultPermission = loggedroleId === 2;

// Use provided permissions if available, otherwise fall back to defaultPermission
const canCreate = userPermissions?.canCreate ?? defaultPermission;
const canUpdate = userPermissions?.canUpdate ?? defaultPermission;
const canDelete = userPermissions?.canDelete ?? defaultPermission;
const canRead   = userPermissions?.canRead   ?? defaultPermission;

  console.log('User Role ID:', user?.roleId);
  console.log('Page ID:', pageId);
  console.log('Permissions:', permissions);
  console.log('User Permissions:', userPermissions);
  console.log('Permission Values:', { canCreate, canUpdate, canDelete, canRead });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfileFile(e.target.files[0]);
    } else {
      setProfileFile(undefined);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10 - documents.length);
      const newDocs = files.map(file => ({
        title: "",
        file,
        url: undefined
      }));
      setDocuments([...documents, ...newDocs]);
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  };

  const updateDocument = (index: number, field: "title" | "file", value: string | File | null) => {
    const updatedDocs = [...documents];
    updatedDocs[index][field] = value as never;
    setDocuments(updatedDocs);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const addfaculty = () => {
    if (!canCreate) {
      toast.error("Access Denied: You do not have permission to create faculty.");
      return;
    }
    setAddFacultyModel(true);
    setExistingProfilePic(null);
  };

  const handleAddFaculty = async () => {
    if (!canCreate && !editingFaculty) {
      toast.error("Access Denied: You do not have permission to create faculty.");
      return;
    }

    if (!facultyName || qualification === "Select" || designation === "Select") {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    const facultyData: Omit<Faculty, "id" | "created_on" | "modify_on"> = {
      faculty_name: facultyName,
      qualification: qualification === "Other" ? otherQualification : qualification,
      designation: designation === "Other" ? otherDesignation : designation,
      created_by: editingFaculty ? editingFaculty.created_by : createdBy,
      modify_by: modify_by,
      monthlySalary: monthlySalary === "" ? undefined : Number(monthlySalary),
      yearlyLeave: yearlyLeave === "" ? undefined : Number(yearlyLeave),
      IsVisible: isVisible,
    };

    const newDocFiles = documents.map((doc) => doc.file).filter(Boolean) as File[];
    const docTitles = documents.map((doc) => doc.title || doc.file?.name || "");
    const existingDocs = documents.filter((doc) => doc.url).map((doc) => ({ title: doc.title, url: doc.url! }));

    try {
      if (editingFaculty && editingFaculty.id) {
        await updateFaculty(editingFaculty.id, facultyData, profileFile, newDocFiles, docTitles, existingDocs);
      } else {
        await addFaculty(facultyData, profileFile, newDocFiles, docTitles);
      }
      resetForm();
    } catch (error) {
      console.error("Faculty Error:", error);
      toast.error("Error saving faculty");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFacultyName("");
    setQualification("Select");
    setOtherQualification("");
    setDesignation("Select");
    setOtherDesignation("");
    setProfileFile(undefined);
    setDocuments([]);
    setMonthlySalary("");
    setYearlyLeave("");
    setIsVisible(true);
    setExistingProfilePic(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditingFaculty(null);
    setAddFacultyModel(false);
  };

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Access Denied: You do not have permission to delete faculty.");
      return;
    }

    if (facultyIdToDelete !== null) {
      await deleteFaculty(facultyIdToDelete);
      setOpenDeleteModal(false);
      setFacultyIdToDelete(null);
    }
  };

  const handleToggleVisibility = async (id: number) => {
    if (!canRead) {
      toast.error("Access Denied: You do not have permission to update visibility.");
      return;
    }
    await toggleVisibility(id, createdBy);
  };

  const handleEditFaculty = (faculty: Faculty) => {
    if (!canUpdate) {
      toast.error("Access Denied: You do not have permission to edit faculty.");
      return;
    }
    setEditingFaculty(faculty);
    setFacultyName(faculty.faculty_name);
    setQualification(faculty.qualification);
    setDesignation(faculty.designation);
    setMonthlySalary(faculty.monthlySalary ?? "");
    setYearlyLeave(faculty.yearlyLeave ?? "");
    setIsVisible(faculty.IsVisible ?? true);
    setExistingProfilePic(faculty.profilePicUrl ?? null);
    setDocuments(
      faculty.documents
        ? JSON.parse(faculty.documents).map((doc: any) => ({ title: doc.title, file: null, url: doc.url }))
        : []
    );
    setAddFacultyModel(true);
  };

  const handleOpenDeleteModal = (facultyId: number) => {
    if (!canDelete) {
      toast.error("Access Denied: You do not have permission to delete faculty.");
      return;
    }
    setFacultyIdToDelete(facultyId);
    setOpenDeleteModal(true);
  };

  const handleOpenDetailsModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setOpenDetailsModal(true);
  };

  const handleOpenDocsModal = (faculty: Faculty) => {
    setSelectedFacultyDocs(faculty);
    setOpenDocsModal(true);
  };

  const handleCloseDocsModal = () => {
    setOpenDocsModal(false);
    setSelectedFacultyDocs(null);
    setEditingDocIndex(null); // Reset editing state
    setEditedDocTitle("");
  };

  const handleOpenPreviewModal = (doc: { title: string; url: string }) => {
    setSelectedDocument(doc);
    setOpenPreviewModal(true);
  };

  const handleClosePreviewModal = () => {
    setOpenPreviewModal(false);
    setSelectedDocument(null);
  };

  const getFileType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
    return 'unknown';
  };

 const handleDownloadDocument = async (url: string, name: string) => {
  try {
    const fullUrl = `${axiosInstance.defaults.baseURL}${url}`; // 👈 Prefix added here
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error("Download failed");

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = name;
    document.body.appendChild(link);  // Needed for Firefox
    link.click();
    link.remove();

    window.URL.revokeObjectURL(downloadUrl);
    setOpenDocsModal(false);
  } catch (error) {
    toast.error("Failed to download document");
    console.error(error);
  }
};


  const handleEditDocumentTitle = (index: number, currentTitle: string) => {
    setEditingDocIndex(index);
    setEditedDocTitle(currentTitle);
  };

const handleSaveDocumentTitle = async (facultyId: number, docIndex: number) => {
  try {
    if (!editedDocTitle.trim()) {
      toast.error("Please enter some title");
      return;
    }
    if (!selectedFacultyDocs) return;

    const response = await axiosInstance.put(`/faculty/${facultyId}/update-document-title`, {
      docIndex,
      newTitle: editedDocTitle,
    });

    setSelectedFacultyDocs(response.data); // Update the local faculty data
    toast.success("Document title updated successfully");
    setEditingDocIndex(null);
    setEditedDocTitle("");
  } catch (error) {
    toast.error("Failed to update document title");
    console.error(error);
  }
};


  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDesignation('');
    setSelectedQualification('');
  };

  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedQualification, setSelectedQualification] = useState('');

  const filteredFaculties = faculties.filter((faculty) => {
    const matchesSearch =
      faculty.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.qualification.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDesignation = selectedDesignation ? faculty.designation === selectedDesignation : true;
    const matchesQualification = selectedQualification ? faculty.qualification === selectedQualification : true;
    return matchesSearch && matchesDesignation && matchesQualification;
  });

  return (
    <>
      <Breadcrumb pageName="Manage Faculty" />
      <div className="flex flex-wrap items-center justify-between p-2 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md">
        <input
          type="search"
          className="py-1 px-3 bg-white border placeholder:text-[.75rem] border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-4 focus:ring-blue-500 transition duration-200"
          placeholder="Search faculty here..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="py-1 px-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedDesignation}
          onChange={(e) => setSelectedDesignation(e.target.value)}
        >
          <option value="">All Designations</option>
          {Array.from(new Set(faculties.map(f => f.designation))).map(designation => (
            <option key={designation} value={designation}>{designation}</option>
          ))}
        </select>
        <select
          className="py-1 px-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedQualification}
          onChange={(e) => setSelectedQualification(e.target.value)}
        >
          <option value="">All Qualifications</option>
          {Array.from(new Set(faculties.map(f => f.qualification))).map(qualification => (
            <option key={qualification} value={qualification}>{qualification}</option>
          ))}
        </select>
        <button
          className="ml-2 px-4 py-1 text-sm text-white bg-red-500 hover:scale-105 rounded-lg transition duration-200 focus:outline-none focus:ring-4 focus:ring-red-400"
          onClick={clearFilters}
        >
          Clear Filters
        </button>
        <button
          className={`ml-2 px-4 py-1 text-sm text-white rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${canCreate ? "bg-blue-800 hover:bg-blue-600" : "bg-gray-500 hover:cursor-not-allowed"}`}
          onClick={addfaculty}
        >
          Add Faculty
        </button>
      </div>

   <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-2">         
  {filteredFaculties.length > 0 ? (           
    filteredFaculties.map((faculty: Faculty) => (             
      <div key={faculty.id} className="p-2 border rounded-lg shadow-sm bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">               
        <div className="relative">                 
          <img                   
            src={faculty.profilePicUrl || "https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png"}                   
            alt={faculty.faculty_name || "Faculty Image"}                   
            className=" h-32 object-cover rounded-md"                   
            style={{ opacity: faculty.IsVisible ? 1 : 0.5 }}                 
          />                 
          <button                   
            className={`flex items-center justify-center p-1.5 text-xs  transition duration-200 ease-in-out  absolute top-1 right-1 ${!canRead ? "opacity-50 cursor-not-allowed" : ""}`}                   
            onClick={() => handleToggleVisibility(faculty.id ?? 0)}  
               title="Active/Inactive Faculty"                
          >                   
            {faculty.IsVisible ? (                     
              <FaToggleOn className="w-4 h-4 text-green-500" />                   
            ) : (                     
              <FaToggleOff className="w-4 h-4 text-red-600" />   
                          
            )}                 
          </button>               
        </div>               
        
        <div className="mt-2 text-xs text-gray-700 dark:text-gray-300 space-y-1">                 
          <p><span className="font-semibold">Name:</span> {faculty.faculty_name}</p>                 
          <p><span className="font-semibold">Qualification:</span> {faculty.qualification}</p>                 
          <p><span className="font-semibold">Designation:</span> {faculty.designation}</p>                 
          <p><span className="font-semibold">Salary:</span> {faculty.monthlySalary ?? "N/A"}</p>                 
          <p><span className="font-semibold">Yearly Leave:</span> {faculty.yearlyLeave ?? "N/A"}</p>               
        </div>               
        
        <div className="mt-2">                 
          <div className="flex justify-between gap-1">                   
            <button                     
              className={`flex items-center justify-center px-2 py-1 text-xs text-white rounded-md transition-colors ${
                !canUpdate || !faculty.IsVisible 
                  ? "bg-gray-300 cursor-not-allowed" 
                  : "bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-400"
              }`}                     
              onClick={() => {
                if (!faculty.IsVisible) {
                toast.warning("Faculty is inactive. Please activate first to edit.");
                  return;
                }
                handleEditFaculty(faculty);
              }}  
              title="Edit Faculty"                 
            >                     
              <FaEdit className="text-sm" />                   
            </button>                   
            
            <button                     
              className={`flex items-center justify-center px-2 py-1 text-xs text-white rounded-md transition-colors ${
              !canDelete || !faculty.IsVisible 
                ? "bg-gray-300 cursor-not-allowed" 
                : "bg-red-500 hover:bg-red-600 focus:ring-4 focus:ring-red-400"
              }`}                     
              onClick={() => {
              if (!faculty.IsVisible) {
                toast.warning("Faculty is inactive. Please activate first to delete.");
                return;
              }
              handleOpenDeleteModal(faculty.id ?? 0);
              }}                   
              title="Delete Faculty"
            >                     
              <MdDelete className="text-sm" />                   
            </button>                   
            
            <button                     
              className="flex items-center justify-center px-2 py-1 text-xs text-white bg-gray-500 rounded-md hover:bg-gray-600 focus:ring-4 focus:ring-gray-400 transition-colors"                     
              onClick={() => handleOpenDetailsModal(faculty)}                   
            >                     
          Details  <FcViewDetails className="text-sm ml-1" />                   
            </button>                   
            
            <button                     
              className="flex items-center justify-center px-2 py-1 text-xs text-white bg-blue-500 hover:bg-blue-600 focus:ring-4 focus:ring-blue-400 rounded-md transition-colors"                     
              onClick={() => handleOpenDocsModal(faculty)}                   
            >                     
               Docs  <IoDocumentsOutline className="text-sm ml-1" />                   
            </button>                 
          </div>               
        </div>             
      </div>           
    ))         
  ) : (           
    <div className="col-span-full text-center py-8">
      <p className="text-gray-500 dark:text-gray-400">No faculties found</p>
    </div>         
  )}       
</div>

      {/* Add Faculty Modal */}
      {addFacultyModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-1">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[95vh] overflow-hidden">
            {/* Header - Sticky */}
            <div className="top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2 rounded-t-xl relative">
              <button
                onClick={resetForm}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-600 text-xl font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                disabled={loading}
              >
                ×
              </button>
              <h3 className="text-lg font-semibold text-center">
                {editingFaculty ? "Edit Faculty" : "Add Faculty"}
              </h3>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-140px)] p-2">
              {/* Grid Layout for Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                
                {/* Name Field - Full Width */}
                <div className="md:col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">
                    Name of Faculty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Faculty Name"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                  />
                </div>

                {/* Qualification */}
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Qualification <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={qualification}
                    onChange={(e) => {
                      setQualification(e.target.value);
                      if (e.target.value !== "Other") setOtherQualification("");
                    }}
                  >
                    <option>Select</option>
                    <option>M. Pharma</option>
                    <option>B. Pharma</option>
                    <option>Other</option>
                  </select>
                  {qualification === "Other" && (
                    <input
                      type="text"
                      className="w-full p-1.5 border border-gray-300 rounded-lg mt-1.5 focus:ring-2 focus:ring-blue-500"
                      placeholder="Specify Qualification"
                      value={otherQualification}
                      onChange={(e) => setOtherQualification(e.target.value)}
                    />
                  )}
                </div>

                {/* Designation */}
                <div>
                  <label className="block font-medium text-gray-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={designation}
                    onChange={(e) => {
                      setDesignation(e.target.value);
                      if (e.target.value !== "Other") setOtherDesignation("");
                    }}
                  >
                    <option>Select</option>
                    <option>Principal</option>
                    <option>Lecturer</option>
                    <option>Chairman</option>
                    <option>Other</option>
                  </select>
                  {designation === "Other" && (
                    <input
                      type="text"
                      className="w-full p-1.5 border border-gray-300 rounded-lg mt-1.5 focus:ring-2 focus:ring-blue-500"
                      placeholder="Specify Designation"
                      value={otherDesignation}
                      onChange={(e) => setOtherDesignation(e.target.value)}
                    />
                  )}
                </div>

                {/* Salary */}
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Monthly Salary</label>
                  <input
                    type="number"
                    className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Salary"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>

                {/* Yearly Leave */}
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Yearly Leave</label>
                  <input
                    type="number"
                    className="w-full p-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter Leave Days"
                    value={yearlyLeave}
                    onChange={(e) => setYearlyLeave(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>

                {/* Profile Picture - Full Width */}
                <div className="md:col-span-2">
                  <label className="block font-medium text-gray-700 mb-1">Profile Picture</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
                    {existingProfilePic && (
                      <div className="sm:col-span-1">
                        <img
                          src={existingProfilePic}
                          alt="Current Profile"
                          className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <p className="text-xs text-gray-500 mt-0.5">Current photo</p>
                      </div>
                    )}
                    <div className={existingProfilePic ? "sm:col-span-2" : "sm:col-span-3"}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="w-full p-1.5 border border-gray-300 rounded-lg text-sm file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                    </div>
                  </div>
                </div>

                {/* Documents - Full Width */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-center mb-1.5">
                    <label className=" font-medium hidden bg-blue-600 text-gray-700"> Upload Documents</label>
                    <button
                      className="text-md w-full py-2 bg-blue-400 text-black  px-2 p rounded-md hover:bg-blue-500 transition-colors"
                      onClick={() => {
                        if (documents.length >= 10) {
                          toast.error("Maximum 10 documents allowed");
                          return;
                        }
                        documentInputRef.current?.click();
                      }}
                    >
                      Upload Documents({documents.length}/10)
                    </button>
                  </div>
                  
                  <input
                    type="file"
                    ref={documentInputRef}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleDocumentChange}
                  />
                  
                  {documents.length > 0 && (
                    <div className="grid gap-1.5 max-h-32 overflow-y-auto border rounded-lg p-1.5 bg-gray-50">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex items-center gap-1.5 p-1.5 bg-white rounded border">
                          <span>{index+1}.</span>
                          <input
                            type="text"
                            className="flex-1 p-1 border border-gray-300 rounded text-xs"
                            placeholder="Document title"
                            value={doc.title}
                            onChange={(e) => updateDocument(index, "title", e.target.value)}
                          />
                          <button 
                            className="text-xs text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50" 
                            onClick={() => removeDocument(index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Visibility Toggle */}
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => setIsVisible(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-700">Make faculty profile visible</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Actions - Sticky */}
            <div className="sticky bottom-0 bg-gray-50 p-2 rounded-b-xl border-t">
              <div className="flex flex-col sm:flex-row gap-1.5 sm:justify-end">
                <button
                  className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className={`flex items-center justify-center px-4 py-1.5 text-white rounded-lg transition-colors order-1 sm:order-2 ${
                    loading 
                      ? "bg-blue-400 cursor-not-allowed" 
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                  onClick={handleAddFaculty}
                  disabled={loading}
                >
                  {loading && <FaSpinner className="animate-spin mr-2" />}
                  {editingFaculty ? "Update Faculty" : "Add Faculty"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Delete Modal */}
      <Modal
        show={openDeleteModal}
        size="md"
        className="fixed inset-0 flex items-center pt-70 justify-center bg-black bg-opacity-50 backdrop-blur-sm"
        onClose={() => setOpenDeleteModal(false)}
        popup
      >
        <Modal.Header className="p-3" />
        <Modal.Body className="p-4 max-h-[60vh] overflow-y-auto bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-3 h-12 w-12 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-400">
              Are you sure you want to delete this faculty?
            </h3>
            <div className="flex justify-center gap-3">
              <Button
                color="failure"
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md"
                onClick={handleDelete}
              >
                Yes, I'm sure
              </Button>
              <Button
                color="gray"
                className="px-3 py-1.5 text-sm bg-gray-300 hover:bg-gray-400 text-black rounded-md"
                onClick={() => setOpenDeleteModal(false)}
              >
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Faculty Details Modal */}
      {openDetailsModal && selectedFaculty && (
        <div className="fixed inset-0 z-999 flex items-end sm:items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm transition-all duration-300">
          <div className="w-full h-full sm:h-auto sm:w-11/12 sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl sm:rounded-t-2xl md:rounded-2xl bg-white shadow-2xl transform transition-all duration-300 overflow-hidden">
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 sm:p-4">
              <button
                onClick={() => setOpenDetailsModal(false)}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all duration-200 backdrop-blur-sm"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="pr-10 sm:pr-12">
                <p className="text-white text-sm sm:text-base opacity-90">{selectedFaculty?.faculty_name || "N/A"}</p>
              </div>
              <div className="sm:hidden absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white bg-opacity-30 rounded-full"></div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(95vh - 100px)' }}>
              <div className="p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex-shrink-0 self-center sm:self-start">
                      <div className="relative">
                        <img
                          src={selectedFaculty.profilePicUrl||"https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png"}
                          alt="Faculty Profile"
                          className="w-20 h-24 sm:w-24 sm:h-30 md:w-28 md:h-36 object-cover rounded-lg shadow-md border-2 border-gray-100"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 sm:p-3 border border-blue-200 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center mb-1">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                            </svg>
                            <span className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Qualification</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800">{selectedFaculty.qualification}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 sm:p-3 border border-green-200 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center mb-1">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h2a2 2 0 002-2V4" />
                            </svg>
                            <span className="text-xs text-green-700 font-semibold uppercase tracking-wide">Designation</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800">{selectedFaculty.designation}</p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-2 sm:p-3 border border-yellow-200 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center mb-1">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            <span className="text-xs text-yellow-700 font-semibold uppercase tracking-wide">Monthly Salary</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800">₹{selectedFaculty.monthlySalary || "N/A"}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 sm:p-3 border border-purple-200 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-center mb-1">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2" />
                            </svg>
                            <span className="text-xs text-purple-700 font-semibold uppercase tracking-wide">Yearly Leave</span>
                          </div>
                          <p className="text-sm font-bold text-gray-800">{selectedFaculty.yearlyLeave || "N/A"} days</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {selectedFaculty.documents && (
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2 sm:mb-3 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Documents
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {(() => {
                          try {
                            const docs = JSON.parse(selectedFaculty.documents);
                            return docs.map((doc: { url: string; title: string }, index: React.Key) => (
                              <a
                                key={index}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center p-2 bg-white rounded-md border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 text-sm group shadow-sm hover:shadow-md"
                              >
                                <svg className="w-3 h-3 mr-2 text-gray-500 group-hover:text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span className="text-gray-700 group-hover:text-indigo-700 truncate font-medium">{doc.title}</span>
                              </a>
                            ));
                          } catch (error) {
                            return <p className="text-sm text-red-500 p-3 bg-red-50 rounded-lg border border-red-200">Invalid document data</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-2 sm:mb-3 flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      System Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                      <div className="space-y-1">
                        <p className="flex justify-between sm:block">
                          <span className="font-semibold text-gray-700">Created by: </span>
                          <span className="sm:ml-0 ml-2">{selectedFaculty.created_by}</span>
                        </p>
                        <p className="flex justify-between sm:block">
                          <span className="font-semibold text-gray-700">Created on: </span>
                          <span>
                            {selectedFaculty.created_on
                              ? new Date(selectedFaculty.created_on).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </span>
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="flex justify-between sm:block">
                          <span className="font-semibold text-gray-700">Modified by: </span>
                          <span className="sm:ml-0 ml-2">{selectedFaculty.modify_by}</span>
                        </p>
                        <p className="flex justify-between sm:block">
                          <span className="font-semibold text-gray-700">Modified on: </span>
                          <span>
                            {selectedFaculty.modify_on
                              ? new Date(selectedFaculty.modify_on).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "N/A"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 sm:p-4">
                <div className="flex justify-center">
                  <button
                    onClick={() => setOpenDetailsModal(false)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideUpMobile {
                from { transform: translateY(100%); opacity: 0.8; }
                to { transform: translateY(0); opacity: 1; }
              }
              @keyframes scaleUp {
                from { transform: scale(0.9) translateY(20px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Documents Preview Modal */}
{openPreviewModal && (
  <div className="fixed inset-0 z-999 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50">
    <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
            Preview docs: <span className="text-blue-600">{selectedDocument?.title || "Document"}</span>
          </h3>
          <button
            onClick={handleClosePreviewModal}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4">
        <div className="w-full h-[65vh] sm:h-[70vh] overflow-auto flex justify-center items-center bg-gray-50 dark:bg-gray-700 rounded-md">
          {selectedDocument?.url ? (
            getFileType(selectedDocument.url) === "pdf" ? (
              <object
                data={selectedDocument.url}
                type="application/pdf"
                className="w-full h-full border-none rounded-md"
              >
                <embed
                  src={selectedDocument.url}
                  type="application/pdf"
                  className="w-full h-full border-none rounded-md"
                />
                <div className="text-center text-gray-500 dark:text-gray-300 p-4">
                  <p className="text-sm sm:text-base mb-2">PDF preview is not available.</p>
                  <a
                    href={selectedDocument.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm sm:text-base hover:text-blue-800"
                  >
                    Click here to download
                  </a>
                </div>
              </object>
            ) : (
              <img
                src={`${axiosInstance.defaults.baseURL}${selectedDocument.url}`}

                alt={selectedDocument.title}
                className="max-w-full max-h-full object-contain rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder-image.jpg";
                }}
              />
            )
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Unable to preview document.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <button
          className="bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-md px-3 py-1.5 sm:px-4 sm:py-2 text-sm transition-colors duration-200"
          onClick={handleClosePreviewModal}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {/* Documents Modal */}
      {openDocsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 sticky top-0">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center">
                Documents for <span className="text-blue-600">{selectedFacultyDocs?.faculty_name || "Faculty"}</span>
              </h3>
            </div>

            {/* Body */}
            <div className="p-3 overflow-auto flex-1">
              {selectedFacultyDocs?.documents ? (
                (() => {
                  let documents;
                  try {
                    documents = JSON.parse(selectedFacultyDocs.documents);
                  } catch (error) {
                    console.error("Invalid JSON format", error);
                    return (
                      <div className="text-center p-4 text-sm text-gray-500 dark:text-gray-400">
                        Unable to load documents.
                      </div>
                    );
                  }

                  return documents.length > 0 ? (
                    <div className="space-y-2">
                      {documents.map((doc: any, index: number) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center min-w-0 flex-1 ">
                            <span className="w-6 text-sm text-gray-500 dark:text-gray-400">{index + 1}.</span>
                            {editingDocIndex === index ? (
                              <input
                                type="text"
                                value={editedDocTitle}
                                onChange={(e) => setEditedDocTitle(e.target.value)}
                                className="flex-1 p-1 border mr-6 border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter document title"
                              />
                            ) : (
                              <span className="truncate text-sm font-medium ml-2 max-w-[150px]">
                                {doc.title || `Document ${index + 1}`}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            {editingDocIndex === index ? (
                              <button
                                onClick={() => selectedFacultyDocs.id !== undefined && handleSaveDocumentTitle(selectedFacultyDocs.id, index)}
                                className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                              >
                                <FaSave className="inline mr-1" /> Save
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEditDocumentTitle(index, doc.title || `Document ${index + 1}`)}
                                className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                              >
                                <FaEdit className="inline mr-1" /> Edit Title
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenPreviewModal(doc)}
                              className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-100 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownloadDocument(doc.url, doc.title)}
                              className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-100 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              Download
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-4 text-sm text-gray-500 dark:text-gray-400">
                      No documents available for this faculty.
                    </div>
                  );
                })()
              ) : (
                <div className="text-center p-4 text-sm text-gray-500 dark:text-gray-400">
                  No documents available.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex justify-end">
              <button
                onClick={handleCloseDocsModal}
                className="px-4 py-1.5 text-sm font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddFaculty;