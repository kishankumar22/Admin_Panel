import React, { useState, useRef, useEffect } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-toastify";
import { useFaculty } from "../context/FacultyContext";
import { Faculty } from "../context/FacultyContext";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";
import { useAuth } from "../context/AuthContext";
import { MdDelete } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
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
  const [documents, setDocuments] = useState<{ title: string; file: File | null }[]>([]);
  const [monthlySalary, setMonthlySalary] = useState<number | "">("");
  const [yearlyLeave, setYearlyLeave] = useState<number | "">("");
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
  const [facultyIdToDelete, setFacultyIdToDelete] = useState<number | null>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);

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
  }, [fetchRoles, fetchPages, fetchPermissions]);

  const location = useLocation();
  const currentPageName = location.pathname.split('/').pop();
  const prefixedPageUrl = `/${currentPageName}`;
  const pageId = pages.find(page => page.pageUrl === prefixedPageUrl)?.pageId;
  const roleId = roles.find(role => role.role_id === user?.roleId)?.role_id;
  const userPermissions = permissions.find(perm => perm.pageId === pageId && roleId === user?.roleId);

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
      toast.error('Access Denied: You do not have permission to create faculty.');
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

    try {
      const docFiles = documents.map(doc => doc.file).filter(Boolean) as File[];
      if (editingFaculty && editingFaculty.id) {
        await updateFaculty(editingFaculty.id, facultyData, profileFile, docFiles);
        toast.success("Faculty updated successfully!");
      } else {
        await addFaculty(facultyData, profileFile, docFiles);
        toast.success("Faculty added successfully!");
      }
      resetForm();
    } catch (error) {
      toast.error("Error saving faculty details!");
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
    setDocuments(faculty.documents ? JSON.parse(faculty.documents).map((doc: any) => ({ title: doc.title, file: null })) : []);
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

  const [searchQuery, setSearchQuery] = useState('');
  const filteredFaculties = faculties.filter(faculty =>
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
          className='py-1 px-3 bg-white border placeholder:text-[.75rem] border-gray-300 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200'
          placeholder='Search faculty here by designation and qualification...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className={`ml-2 px-4 py-1 text-sm text-white rounded-lg transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${canCreate ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
          onClick={addfaculty}
          disabled={!canCreate}
        >
          Add Faculty
        </button>
      </div>

      {addFacultyModel && (
        <div className="fixed inset-0 z-50 ml-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-4 w-full max-w-md bg-white rounded-lg shadow-md dark:bg-gray-600">
            <h3 className="text-center bg-slate-300 p-1 rounded-md text-lg font-bold text-blue-800">
              {editingFaculty ? "Edit Faculty" : "Add Faculty"}
            </h3>

            <label className="block font-semibold p-1">Name of Faculty</label>
            <input type="text" className="w-full p-2 border rounded-md dark:bg-gray-700" placeholder="Enter Faculty Name" value={facultyName} onChange={(e) => setFacultyName(e.target.value)} />

            <label className="block font-semibold p-1">Qualification</label>
            <select className="w-full p-2 border rounded-md dark:bg-gray-700" value={qualification} onChange={(e) => { setQualification(e.target.value); if (e.target.value !== "Other") setOtherQualification(""); }}>
              <option>---Select---</option>
              <option>M. Pharma</option>
              <option>B. Pharma</option>
              <option>Other</option>
            </select>
            {qualification === "Other" && <input type="text" className="w-full p-2 border rounded-md mt-1" placeholder="Specify Qualification" value={otherQualification} onChange={(e) => setOtherQualification(e.target.value)} />}

            <label className="block font-semibold p-1">Designation</label>
            <select className="w-full p-2 border rounded-md dark:bg-gray-700" value={designation} onChange={(e) => { setDesignation(e.target.value); if (e.target.value !== "Other") setOtherDesignation(""); }}>
              <option>---Select---</option>
              <option>Principal</option>
              <option>Lecturer</option>
              <option>Chairman</option>
              <option>Other</option>
            </select>
            {designation === "Other" && <input type="text" className="w-full p-2 border rounded-md mt-1" placeholder="Specify Designation" value={otherDesignation} onChange={(e) => setOtherDesignation(e.target.value)} />}

            <label className="block font-semibold p-1">Profile Picture</label>
            <input type="file" ref={fileInputRef} className="w-full p-2 border rounded-md dark:bg-gray-700" onChange={handleFileChange} />

            <label className="block font-semibold text-sm">Monthly Salary</label>
            <input type="number" className="w-full p-1 border rounded-md" placeholder="Enter Salary" value={monthlySalary} onChange={(e) => setMonthlySalary(e.target.value === "" ? "" : Number(e.target.value))} />

            <label className="block font-semibold text-sm">Yearly Leave</label>
            <input type="number" className="w-full p-1 border rounded-md" placeholder="Enter Leave Days" value={yearlyLeave} onChange={(e) => setYearlyLeave(e.target.value === "" ? "" : Number(e.target.value))} />

            <label className="block font-semibold text-sm">Documents</label>
            {documents.map((doc, index) => (
              <div key={index} className="flex flex-col gap-1 p-2 border rounded-md mt-1">
                <input type="text" className="w-full p-1 border rounded-md" placeholder="Document Title" value={doc.title} onChange={(e) => updateDocument(index, "title", e.target.value)} />
                <div className="flex items-center justify-between">
                  <input type="file" className="w-full p-1 border rounded-md" accept=".pdf,.jpg" onChange={(e) => updateDocument(index, "file", e.target.files?.[0] || null)} />
                  <button className="text-xs text-red-600 ml-2" onClick={() => removeDocument(index)}>Cancel</button>
                </div>
              </div>
            ))}
            <button className="mt-2 text-sm text-blue-500" onClick={addDocument}>+ Add Document</button>

            <label className="block font-semibold text-sm">Is Visible</label>
            <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} className="mt-1" />

            <div className="flex justify-between mt-4">
              <button className="px-3 py-1 text-white bg-blue-500 rounded-md" onClick={handleAddFaculty}>{editingFaculty ? "Update Faculty" : "Add Faculty"}</button>
              <button className="px-3 py-1 text-gray-700 bg-gray-200 rounded-md" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {filteredFaculties.length > 0 ? (
          filteredFaculties.map((faculty) => (
            <div key={faculty.id} className="p-1 border rounded-md shadow-md">
              <img
                src={faculty.profilePicUrl || 'https://st4.depositphotos.com/7819052/21803/v/450/depositphotos_218033152-stock-illustration-grunge-red-available-word-rubber.jpg'}
                alt={faculty.faculty_name || 'Faculty Image'}
                className="w-full h-44 object-fit rounded-md"
                style={{ opacity: faculty.IsVisible ? 1 : 0.6 }}
              />
              <p className="text-sm font-semibold mt-1"><b>Name:</b> {faculty.faculty_name}</p>
              <p className="text-xs"><b>Qualification:</b> {faculty.qualification}</p>
              <p className="text-xs"><b>Designation:</b> {faculty.designation}</p>
              <p className="text-xs"><b>Monthly Salary:</b> {faculty.monthlySalary ?? 'N/A'}</p>
              <p className="text-xs"><b>Yearly Leave:</b> {faculty.yearlyLeave ?? 'N/A'}</p>
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-1">
                  <button
                    className={`flex items-center gap-1 px-2 py-1 text-xs text-white bg-green-500 rounded-md hover:bg-green-600 ${!canUpdate ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => canUpdate ? handleEditFaculty(faculty) : toast.error('Access Denied: You do not have permission to edit faculty.')}
                    disabled={!canUpdate}
                  >
                    <FaEdit className="text-sm" />
                    Edit
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600 ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => canDelete ? handleOpenDeleteModal(faculty.id ?? 0) : toast.error('Access Denied: You do not have permission to delete faculty.')}
                    disabled={!canDelete}
                  >
                    <MdDelete className="text-sm" />
                    Delete
                  </button>
                  <button
                    className="flex items-center gap-1 px-2 py-1 text-xs text-white bg-gray-500 rounded-md"
                    onClick={() => handleOpenDetailsModal(faculty)}
                  >
                    <FcViewDetails className="text-sm" />
                    Details
                  </button>
                </div>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={faculty.IsVisible}
                    onChange={() => canRead ? handleToggleVisibility(faculty.id ?? 0) : toast.error('Access Denied: You do not have permission to update visibility.')}
                    className="sr-only peer"
                    disabled={!canRead}
                  />
                  <div className={`relative w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 ${!canRead ? 'opacity-50 cursor-not-allowed' : 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600'}`}>
                    <div className={`absolute top-0 left-0 w-5 h-5 bg-white border border-gray-300 rounded-full transition-transform duration-200 ease-in-out ${faculty.IsVisible ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <span className={`ms-2 text-xs font-medium ${!canRead ? 'text-gray-400' : 'text-gray-900 dark:text-gray-300'}`}>
                    IsVisible
                  </span>
                </label>
              </div>
            </div>
          ))
        ) : (
          <p>No faculties found</p>
        )}
      </div>

      <Modal show={openDeleteModal} size="md" className="ml-50 bg-black pt-44" onClose={() => setOpenDeleteModal(false)} popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-900 dark:text-gray-400">
              Are you sure you want to delete this faculty?
            </h3>
            <div className="flex justify-center gap-4">
              <Button color="failure" onClick={handleDelete}>
                Yes, I'm sure
              </Button>
              <Button color="gray" onClick={() => setOpenDeleteModal(false)}>
                No, cancel
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {openDetailsModal && selectedFaculty && (
        <Modal show={openDetailsModal} size="md" className="ml-50 py-20 bg-black" onClose={() => setOpenDetailsModal(false)} popup>
          <Modal.Header />
          <Modal.Body>
            <div>
              <img src={selectedFaculty.profilePicUrl} alt="" className="w-full h-44 object-fit" />
              <p><b>Faculty Name:</b> {selectedFaculty.faculty_name}</p>
              <p><b>Qualification:</b> {selectedFaculty.qualification}</p>
              <p><b>Designation:</b> {selectedFaculty.designation}</p>
              <p><b>Monthly Salary:</b> {selectedFaculty.monthlySalary ?? 'N/A'}</p>
              <p><b>Yearly Leave:</b> {selectedFaculty.yearlyLeave ?? 'N/A'}</p>
              <p><b>Created By:</b> {selectedFaculty.created_by}</p>
              <p><b>Created on:</b> {selectedFaculty.created_on}</p>
              <p><b>Modified By:</b> {selectedFaculty.modify_by}</p>
              <p><b>Modified on:</b> {selectedFaculty.modify_on}</p>
              <p><b>Is Visible:</b> {selectedFaculty.IsVisible ? 'Yes' : 'No'}</p>
              {selectedFaculty.documents && (
                <div>
                  <b>Documents:</b>
                  {JSON.parse(selectedFaculty.documents).map((doc: any, index: number) => (
                    <p key={index}><a href={doc.url} target="_blank">{doc.title}</a></p>
                  ))}
                </div>
              )}
              <div className="flex justify-center mt-4">
                <Button color="gray" className="bg-gray-300" onClick={() => setOpenDetailsModal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default AddFaculty;