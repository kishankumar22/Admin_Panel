import React, { useState, useRef } from "react";
import Breadcrumb from "../components/Breadcrumbs/Breadcrumb";
import { toast } from "react-toastify";
import { useFaculty } from "../context/FacultyContext";
import { Faculty } from "../context/FacultyContext";
import { HiOutlineExclamationCircle } from "react-icons/hi";
import { Button, Modal } from "flowbite-react";
import { useAuth } from "../context/AuthContext";

const AddFaculty: React.FC = () => {
  const [addFacultyModel, setAddFacultyModel] = useState<boolean>(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultyName, setFacultyName] = useState<string>("");
  const [qualification, setQualification] = useState<string>("Select");
  const [otherQualification, setOtherQualification] = useState<string>("");
  const [designation, setDesignation] = useState<string>("Select");
  const [otherDesignation, setOtherDesignation] = useState<string>("");
  const [profileFile, setProfileFile] = useState<File | undefined>(undefined);
  const [openDeleteModal, setOpenDeleteModal] = useState<boolean>(false);
  const [facultyIdToDelete, setFacultyIdToDelete] = useState<number | null>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { faculties, addFaculty, updateFaculty, deleteFaculty, toggleVisibility } = useFaculty();
  const { user } = useAuth();
  const createdBy = user?.name || "admin";
  const modify_by = user?.name; 

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfileFile(e.target.files[0]);
    } else {
      setProfileFile(undefined);
    }
  };

  // Add or Update Faculty
  const handleAddFaculty = async () => {
    if (!facultyName || qualification === "Select" || designation === "Select") {
      toast.error("Please fill in all fields");
      return;
    }
    if (!facultyName || qualification === "Select" || designation === "Select") {
      toast.error("Please fill in all fields");
      return;
    }
  
    if (facultyName.length > 150) {
      toast.error("Faculty name cannot exceed 150 characters");
      return;
    }
  
    if (otherQualification.length > 20) {
      toast.error("Other qualification cannot exceed 15 characters");
      return;
    }
  
    if (otherDesignation.length > 20) {
      toast.error("Other designation cannot exceed 15 characters");
      return;
    }
  

    const facultyData: Omit<Faculty, "id" | "created_on" | "modify_on"> = {
      faculty_name: facultyName,
      qualification: qualification === "Other" ? otherQualification : qualification,
      designation: designation === "Other" ? otherDesignation : designation,
      created_by: editingFaculty ? editingFaculty.created_by : createdBy,
      modify_by: modify_by,
      IsVisible: true, // Set default visibility to true
    };

    try {
      if (editingFaculty) {
        await updateFaculty(editingFaculty.id ?? 0, facultyData, profileFile);
        toast.success("Faculty updated successfully!");
      } else {
        await addFaculty(facultyData, profileFile || undefined);
        toast.success("Faculty added successfully!");
      }
      resetForm();
    } catch (error) {
      toast.error("Error saving faculty details!");
      console.error("Faculty Error:", error);
    }
  };

  // Reset Form
  const resetForm = () => {
    setFacultyName("");
    setQualification("Select");
    setOtherQualification("");
    setDesignation("Select");
    setOtherDesignation("");
    setProfileFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditingFaculty(null);
    setAddFacultyModel(false);
  };

  // Handle Delete Faculty
  const handleDelete = async () => {
    if (facultyIdToDelete !== null) {
      await deleteFaculty(facultyIdToDelete);
      setOpenDeleteModal(false);
      setFacultyIdToDelete(null);
    }
  };

  // Handle Toggle Visibility
  const handleToggleVisibility = async (id: number) => {
    await toggleVisibility(id, createdBy);
  };

  // Function to handle editing faculty
  const handleEditFaculty = (faculty: Faculty) => {
    setEditingFaculty(faculty);
    setFacultyName(faculty.faculty_name);
    setQualification(faculty.qualification);
    setDesignation(faculty.designation);
    setAddFacultyModel(true);
  };

  // Function to handle opening delete modal
  const handleOpenDeleteModal = (facultyId: number) => {
    setFacultyIdToDelete(facultyId);
    setOpenDeleteModal(true);
  };

  // Function to handle opening details modal
  const handleOpenDetailsModal = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setOpenDetailsModal(true);
  };
  const [searchQuery, setSearchQuery] = useState('');
   // Filter faculties based on the search query
   const filteredFaculties = faculties.filter(faculty =>
    faculty.faculty_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
     
      <Breadcrumb pageName="Add Faculty" />
      <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md">
        
      <input
        type="search"
        className='p-1 bg-gray-100 border-2 rounded-md text-sm'
        placeholder='Search Message here...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)} // Update search query state
      />
      <button
          className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
          onClick={() => setAddFacultyModel(true)}
        >
          Add Faculty
        </button>
      </div>

      {/* Faculty Modal */}
      {addFacultyModel && (
        <div className="fixed inset-0 z-50 ml-70 flex items-center justify-center bg-black bg-opacity-50 ">
          <div className="p-4 w-full max-w-md bg-white rounded-lg shadow-md dark:bg-gray-600">
            <h3 className="text-center bg-slate-300 p-1 rounded-md text-lg font-bold text-blue-800">
              {editingFaculty ? "Edit Faculty" : "Add Faculty"}
            </h3>

            {/* Faculty Name */}
            <label className="block font-semibold p-1 ">Name of Faculty</label>
            <input
              type="text"
              className="w-full p-2 border rounded-md dark:bg-gray-700"
              placeholder="Enter Faculty Name"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
            />

            {/* Qualification */}
            <label className="block font-semibold p-1">Qualification</label>
            <select
              className="w-full p-2 border rounded-md dark:bg-gray-700"
              value={qualification}
              onChange={(e) => {
                setQualification(e.target.value);
                if (e.target.value !== "Other") setOtherQualification("");
              }}
            >
              <option>---Select---</option>
              <option>M. Pharma</option>
              <option>B. Pharma</option>
              <option>Other</option>
            </select>
            {qualification === "Other" && (
              <input
                type="text"
                className="w-full p-2 border rounded-md mt-1 "
                placeholder="Specify Qualification"
                value={otherQualification}
                onChange={(e) => setOtherQualification(e.target.value)}
              />
            )}

            {/* Designation */}
            <label className="block font-semibold p-1 ">Designation</label>
            <select
              className="w-full p-2 border rounded-md dark:bg-gray-700"
              value={designation}
              onChange={(e) => {
                setDesignation(e.target.value);
                if (e.target.value !== "Other") setOtherDesignation("");
              }}
            >
              <option>---Select---</option>
              <option>Principal</option>
              <option>Lecturer</option>
              <option>Chairman</option>
              <option>Other</option>
            </select>
            {designation === "Other" && (
              <input
                type="text"
                className="w-full p-2 border rounded-md mt-1"
                placeholder="Specify Designation"
                value={otherDesignation}
                onChange={(e) => setOtherDesignation(e.target.value)}
              />
            )}

            {/* Profile Upload */}
            <label className="block font-semibold p-1">Profile</label>
            <input type="file" ref={fileInputRef} className="w-full p-2 border rounded-md dark:bg-gray-700" onChange={handleFileChange} />

            {/* Modal Actions */}
            <div className="flex justify-between mt-4">
              <button className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600" onClick={handleAddFaculty}>
                {editingFaculty ? "Update Faculty" : "Add Faculty"}
              </button>
              <button className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Faculty List */}
      <div className="grid grid-cols-3 gap-4">
        {filteredFaculties.length > 0 ? (
          filteredFaculties.map((faculty) => (
            <div key={faculty.id} className="p-2 border rounded-md">
              <p>
                <img
                  src={faculty.profilePicUrl || 'https://st4.depositphotos.com/7819052/21803/v/450/depositphotos_218033152-stock-illustration-grunge-red-available-word-rubber.jpg'} // Default image if profilePicUrl is null
                  alt={faculty.faculty_name || 'Faculty Image'} // Provide alt text
                  className="w-full h-48 object-fit"
                  style={{ opacity: faculty.IsVisible ? 1 : 0.6 }}
                />
              </p>
              <p><b>Name:</b> {faculty.faculty_name}</p>
              <p><b>Qualification:</b> {faculty.qualification}</p>
              <p><b>Designation:</b> {faculty.designation}</p>
              <div className="flex justify-center gap-2 mt-2">
                <button
                  className="px-2 py-1 text-sm text-white bg-green-500 rounded-md hover:bg-green-600"
                  onClick={() => handleEditFaculty(faculty)}
                >
                  Edit
                </button>
                <button
                  className="px-2 py-1 text-sm text-white bg-red-500 rounded-md hover:bg-red-600"
                  onClick={() => handleOpenDeleteModal(faculty.id ?? 0)}
                >
                  Delete
                </button>
                <button
                  className="bg-gray-500 text-white p-1 rounded"
                  onClick={() => handleOpenDetailsModal(faculty)}
                >
                  Details
                </button>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={faculty.IsVisible}
                    onChange={() => handleToggleVisibility(faculty.id ?? 0)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
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

      {/* Delete Confirmation Modal */}
      <Modal show={openDeleteModal} size="md" className=" ml-67 my-40 bg-gray-3   " onClose={() => setOpenDeleteModal(false)} popup>
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

      {/* Details Modal */}
      {openDetailsModal && selectedFaculty && (
        <Modal show={openDetailsModal} size="md" className=" ml-60 my-20 bg-gray-3" onClose={() => setOpenDetailsModal(false)} popup>
          <Modal.Header />
          <Modal.Body>
            <div className="">
              <img
                src={selectedFaculty.profilePicUrl}
                alt=""
                className="w-full h-44 object-fit"
              />
            
              <p><b>Faculty Name:</b> {selectedFaculty.faculty_name}</p>
              <p><b>Qualification:</b> {selectedFaculty.qualification}</p>
              <p><b>Designation:</b> {selectedFaculty.designation}</p>
              <p><b>Created By:</b> {selectedFaculty.created_by}</p>
              <p><b>Created on:</b> {selectedFaculty.created_on}</p>
              <p><b>Modified By:</b> {selectedFaculty.modify_by}</p>
              <p><b>Modified on:</b> {selectedFaculty.modify_on}</p>
              <div className="flex justify-center mt-4">
                <Button color="gray" className="bg-gray-300" onClick={() => setOpenDetailsModal(false)}>
                  Cancel
                </Button>
              </div>
            </ div>
          </Modal.Body>
        </Modal>
      )}
    </>
  );
};

export default AddFaculty;