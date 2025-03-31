import React, { useState, useRef, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-toastify";
import { useFaculty } from "../context/FacultyContext";
import { Faculty } from "../context/FacultyContext";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";
import { useAuth } from "../context/AuthContext";
import { MdDelete } from "react-icons/md";
import { FaEdit, FaEye, FaEyeSlash } from "react-icons/fa";
import { FcViewDetails } from "react-icons/fc";
import { usePermissions } from "../context/PermissionsContext";
import { useLocation } from "react-router-dom";

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
  // Add to state declarations
  const [openPreviewModal, setOpenPreviewModal] = useState<boolean>(false);
  const [selectedDocument, setSelectedDocument] = useState<{ title: string; url: string } | null>(null);
  // Add to handlers
  const handleOpenPreviewModal = (doc: { title: string; url: string }) => {
    setSelectedDocument(doc);
    setOpenPreviewModal(true);
  };
  const getFileType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
    return 'unknown'; // Default case for unsupported files
  };
  const handleClosePreviewModal = () => {
    setOpenPreviewModal(false);
    setSelectedDocument(null);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { faculties, addFaculty, updateFaculty, deleteFaculty, toggleVisibility } = useFaculty();
  const { user } = useAuth();
  const createdBy = user?.name || "admin";
  const modify_by = user?.name;
  const { fetchRoles, fetchPages, fetchPermissions, roles, pages, permissions } = usePermissions();

  useEffect(() => {
    const fetchData = async () => {
      await fetchRoles();
      await fetchPages();
      await fetchPermissions();
    };
    fetchData();
  }, []);

  const location = useLocation();
  const currentPageName = location.pathname.split("/").pop();
  const prefixedPageUrl = `/${currentPageName}`;
  const pageId = pages.find((page) => page.pageUrl === prefixedPageUrl)?.pageId;
  const roleId = roles.find((role) => role.role_id === user?.roleId)?.role_id;
  const userPermissions = permissions.find((perm) => perm.pageId === pageId && roleId === user?.roleId);

  const canCreate = userPermissions?.canCreate ?? false;
  const canUpdate = userPermissions?.canUpdate ?? false;
  const canDelete = userPermissions?.canDelete ?? false;
  const canRead = userPermissions?.canRead ?? false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfileFile(e.target.files[0]);
    } else {
      setProfileFile(undefined);
    }
  };

  const addDocument = () => {
    setDocuments([...documents, { title: "", file: null }]);
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
    const docTitles = documents.map((doc) => doc.title || "");
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
  };

  const handleDownloadDocument = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = name;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      toast.error("Failed to download document");
      console.error(error);
    }
  };
  const filteredFaculties = faculties.filter((faculty) =>
    faculty.faculty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faculty.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faculty.qualification.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Breadcrumb pageName="Add Faculty" />
      <div className="flex items-center justify-between p-2 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md">
        <input
          type="search"
          className="py-1 px-3 bg-white border placeholder:text-[.75rem] border-gray-300 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
          placeholder="Search faculty here by designation and qualification..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className={`ml-2 px-4 py-1 text-sm text-white rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${canCreate ? "bg-blue-800 hover:bg-blue-600" : "bg-gray-500 hover:cursor-not-allowed"
            }`}
          onClick={addfaculty}
        >
          Add Faculty
        </button>
      </div>

      {/* Add Faculty Modal */}
      {addFacultyModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-2 w-full max-w-md bg-white rounded-lg shadow-md dark:bg-gray-600 max-h-[80vh] overflow-y-auto">
            <h3 className="text-center bg-slate-300 p-1 rounded-md text-base font-bold text-blue-800 sticky top-0 z-10">
              {editingFaculty ? "Edit Faculty" : "Add Faculty"}
            </h3>

            <label className="block font-semibold text-sm mt-1">Name of Faculty</label>
            <input
              type="text"
              className="w-full p-1 border rounded-md dark:bg-gray-700 text-sm"
              placeholder="Enter Faculty Name"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
            />

            <label className="block font-semibold text-sm mt-1">Qualification</label>
            <select
              className="w-full p-1 border rounded-md dark:bg-gray-700 text-sm"
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
                className="w-full p-1 border rounded-md mt-1 text-sm"
                placeholder="Specify Qualification"
                value={otherQualification}
                onChange={(e) => setOtherQualification(e.target.value)}
              />
            )}

            <label className="block font-semibold text-sm mt-1">Designation</label>
            <select
              className="w-full p-1 border rounded-md dark:bg-gray-700 text-sm"
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
                className="w-full p-1 border rounded-md mt-1 text-sm"
                placeholder="Specify Designation"
                value={otherDesignation}
                onChange={(e) => setOtherDesignation(e.target.value)}
              />
            )}

            <label className="block font-semibold text-sm mt-1">Profile Picture</label>
            <input
              type="file"
              ref={fileInputRef}
              className="w-full p-1 border rounded-md dark:bg-gray-700 text-sm"
              onChange={handleFileChange}
            />

            <label className="block font-semibold text-sm mt-1">Monthly Salary</label>
            <input
              type="number"
              className="w-full p-1 border rounded-md text-sm"
              placeholder="Enter Salary"
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value === "" ? "" : Number(e.target.value))}
            />

            <label className="block font-semibold text-sm mt-1">Yearly Leave</label>
            <input
              type="number"
              className="w-full p-1 border rounded-md text-sm"
              placeholder="Enter Leave Days"
              value={yearlyLeave}
              onChange={(e) => setYearlyLeave(e.target.value === "" ? "" : Number(e.target.value))}
            />

            <label className="block font-semibold text-sm mt-1">Documents</label>
            {documents.map((doc, index) => (
              <div key={index} className="flex flex-col gap-1 p-1 border rounded-md mt-1">
                <input
                  type="text"
                  className="w-full p-1 border rounded-md text-sm"
                  placeholder="Enter Document Title"
                  value={doc.title}
                  onChange={(e) => updateDocument(index, "title", e.target.value)}
                />
                <div className="flex items-center justify-between">
                  {doc.url ? (
                    <a href={doc.url} target="_blank" className="text-blue-500 text-xs">
                      {doc.title}
                    </a>
                  ) : (
                    <input
                      type="file"
                      className="w-full p-1 border rounded-md text-sm"
                      accept=".pdf,.jpg"
                      onChange={(e) => updateDocument(index, "file", e.target.files?.[0] || null)}
                    />
                  )}
                  <button className="text-xs text-red-600 ml-1" onClick={() => removeDocument(index)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button className="mt-1 text-xs text-blue-500" onClick={addDocument}>
              + Add Document
            </button>

            <label className="block font-semibold text-sm mt-1">Is Visible</label>
            <input
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="mt-1"
            />

            <div className="flex justify-between mt-2">
              <button className="px-2 py-1 text-sm text-white bg-blue-500 rounded-md" onClick={handleAddFaculty}>
                {editingFaculty ? "Update Faculty" : "Add Faculty"}
              </button>
              <button className="px-2 py-1 text-sm text-gray-700 bg-gray-200 rounded-md" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {filteredFaculties.length > 0 ? (
          filteredFaculties.map((faculty: Faculty) => (
            <div key={faculty.id} className="p-3 border rounded-lg shadow-lg bg-white dark:bg-gray-800">
              <div className="relative">
                <img
                  src={faculty.profilePicUrl || "https://static.vecteezy.com/system/resources/previews/024/983/914/non_2x/simple-user-default-icon-free-png.png"}
                  alt={faculty.faculty_name || "Faculty Image"}
                  className="w-full h-40 object- rounded-md"
                  style={{ opacity: faculty.IsVisible ? 1 : 0.5 }}
                />
                <button
                  className={`flex items-center justify-center p-2 text-xs text-white bg-slate-200 rounded-md transition duration-200 ease-in-out hover:bg-gray-400 absolute top-2 right-2 ${!canRead ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => handleToggleVisibility(faculty.id ?? 0)}
                  disabled={!canRead}
                >
                  {faculty.IsVisible ? (
                    <FaEye className="w-5  h-5 text-blue-700" />
                  ) : (
                    <FaEyeSlash className="w-5  h-5 text-red-500" />
                  )}
                </button>
              </div>

              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                <p><b>Name:</b> {faculty.faculty_name}</p>
                <p><b>Qualification:</b> {faculty.qualification}</p>
                <p><b>Designation:</b> {faculty.designation}</p>
                <p><b>Salary:</b> {faculty.monthlySalary ?? "N/A"}</p>
                <p><b>Yearly Leave:</b> {faculty.yearlyLeave ?? "N/A"}</p>
              </div>

              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2">
                  <button
                    className={`flex items-center gap-1 px-2 py-1 text-xs text-white bg-green-500 rounded-md hover:bg-green-600 ${!canUpdate ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handleEditFaculty(faculty)}
                    disabled={!canUpdate}
                  >
                    <FaEdit className="text-sm" />
                    Edit
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600 ${!canDelete ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => handleOpenDeleteModal(faculty.id ?? 0)}
                    disabled={!canDelete}
                  >
                    <MdDelete className="text-sm" />
                    Delete
                  </button>
                  <button
                    className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-gray-500 rounded-md hover:bg-gray-600"
                    onClick={() => handleOpenDetailsModal(faculty)}
                  >
                    <FcViewDetails className="text-sm" />
                    Details
                  </button>
                  <Button
                    color="red"
                    size="xs"
                    onClick={() => handleOpenDocsModal(faculty)}
                  >
                    Docs
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center w-full text-gray-500 dark:text-gray-400">No faculties found</p>
        )}
      </div>

      {/* Faculty Delete Modal */}
      <Modal
        show={openDeleteModal}
        size="md"
        className="fixed inset-0 flex items-center pt-50 justify-center bg-black bg-opacity-50"
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
        <Modal
          show={openDetailsModal}
          size="md"
          className="fixed inset-0 pt-49 flex items-center justify-center bg-black bg-opacity-50"
          onClose={() => setOpenDetailsModal(false)}
          popup
        >
          <Modal.Header className="p-2" />
          <Modal.Body className="p-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              {/* Faculty Image */}
              <img
                src={selectedFaculty.profilePicUrl}
                alt="Faculty Profile"
                className="w-full h-44 object-cover rounded-md mb-2"
              />

              {/* Faculty Details */}
              <p className="text-sm"><b>Faculty Name:</b> {selectedFaculty.faculty_name}</p>
              <p className="text-sm"><b>Qualification:</b> {selectedFaculty.qualification}</p>
              <p className="text-sm"><b>Designation:</b> {selectedFaculty.designation}</p>
              <p className="text-sm"><b>Monthly Salary:</b> {selectedFaculty.monthlySalary ?? "N/A"}</p>
              <p className="text-sm"><b>Yearly Leave:</b> {selectedFaculty.yearlyLeave ?? "N/A"}</p>
              <p className="text-sm"><b>Created By:</b> {selectedFaculty.created_by}</p>
              <p className="text-sm"><b>Created on:</b> {selectedFaculty.created_on}</p>
              <p className="text-sm"><b>Modified By:</b> {selectedFaculty.modify_by}</p>
              <p className="text-sm"><b>Modified on:</b> {selectedFaculty.modify_on}</p>
              <p className="text-sm"><b>Is Visible:</b> {selectedFaculty.IsVisible ? "Yes" : "No"}</p>

              {/* Documents Section */}
              {selectedFaculty.documents && (
                <div>
                  <b className="text-sm">Documents:</b>
                  {(() => {
                    try {
                      const docs = JSON.parse(selectedFaculty.documents);
                      return docs.map((doc: any, index: number) => (
                        <p key={index} className="text-sm">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {doc.title}
                          </a>
                        </p>
                      ));
                    } catch (error) {
                      return <p className="text-sm text-red-500">Invalid document data</p>;
                    }
                  })()}
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-center mt-4">
                <Button
                  color="gray"
                  className="bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 text-sm rounded-md transition"
                  onClick={() => setOpenDetailsModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}


      {/* Documents Preview  Modal */}
      <Modal
        show={openPreviewModal}
        onClose={handleClosePreviewModal}
        size="xl"
        popup
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        {/* Header */}
        <Modal.Header className="p-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center w-full">
            Preview: <span className="text-blue-600">{selectedDocument?.title || "Document"}</span>
          </h3>
        </Modal.Header>

        {/* Body */}
        <Modal.Body className="p-6">
          <div className="w-full h-[60vh] overflow-auto flex justify-center items-center bg-gray-50 dark:bg-gray-700 rounded-md">
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
                  <p className="text-center text-gray-500 dark:text-gray-300">
                    PDF preview is not available.{" "}
                    <a
                      href={selectedDocument.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Click here to download
                    </a>
                  </p>
                </object>
              ) : (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.title}
                  className="max-w-full max-h-full object-contain rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-image.jpg"; // Fallback image
                  }}
                />
              )
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Unable to preview document.
              </p>
            )}
          </div>
        </Modal.Body>

        {/* Footer */}
        <Modal.Footer className="flex justify-end p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Button
            color="gray"
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-md px-4 py-1 transition-colors duration-200"
            onClick={handleClosePreviewModal}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Documents Modal */}
      <Modal
        show={openDocsModal}
        onClose={handleCloseDocsModal}
        size="sm"
        popup
        className="fixed inset-0 flex items-center  pt-50 justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      >
        {/* Header */}
        <Modal.Header className="p-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 text-center w-full">
            Documents for <span className="text-blue-600">{selectedFacultyDocs?.faculty_name || "Faculty"}</span>
          </h3>
        </Modal.Header>

        {/* Body */}
        <Modal.Body className="p-4">
          <div className="overflow-auto max-h-[60vh]">
            {selectedFacultyDocs?.documents ? (
              (() => {
                let documents;
                try {
                  documents = JSON.parse(selectedFacultyDocs.documents);
                } catch (error) {
                  console.error("Invalid JSON format", error);
                  return (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                      Unable to load documents.
                    </p>
                  );
                }

                return documents.length > 0 ? (
                  <div className="overflow-x-auto rounded-md shadow-sm">
                    <table className="w-full text-xs text-left text-gray-800 dark:text-gray-200 border-collapse">
                      <thead className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                        <tr>
                          <th className="p-2 font-semibold border-b border-gray-300 dark:border-gray-600">#</th>
                          <th className="p-2 font-semibold border-b border-gray-300 dark:border-gray-600">Title</th>
                          <th className="p-2 font-semibold border-b border-gray-300 dark:border-gray-600">Preview</th>
                          <th className="p-2 font-semibold border-b border-gray-300 dark:border-gray-600">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc: any, index: number) => (
                          <tr
                            key={index}
                            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                          >
                            <td className="p-2 border-b border-gray-200 dark:border-gray-600">{index + 1}</td>
                            <td className="p-2 border-b border-gray-200 dark:border-gray-600 truncate max-w-[150px]">
                              {doc.title}
                            </td>
                            <td className="p-2 border-b border-gray-200 dark:border-gray-600">
                              <Button
                                color="green"
                                size="xs"
                                className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-md px-4 py-1 transition-colors duration-150"
                                onClick={() => handleOpenPreviewModal(doc)}
                              >
                                Preview
                              </Button>
                            </td>
                            <td className="p-2 border-b border-gray-200 dark:border-gray-600">
                              <Button
                                color="blue"
                                size="xs"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md px-4 py-1 transition-colors duration-150"
                                onClick={() => handleDownloadDocument(doc.url, doc.title)}
                              >
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                    No documents available for this faculty.
                  </p>
                );
              })()
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-3">
                No documents available.
              </p>
            )}
          </div>
        </Modal.Body>

        {/* Footer */}
        <Modal.Footer className="flex justify-end gap-2 p-3 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Button
            color="gray"
            size="sm"
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-md px-4 py-1 transition-colors duration-150"
            onClick={handleCloseDocsModal}
          >
            Close
          </Button>
          <Button
            color="red"
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white font-medium rounded-md px-4 py-1 transition-colors duration-150"
            onClick={handleCloseDocsModal}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>


    </>
  );
};

export default AddFaculty;