import React, { useState, useEffect } from 'react';
import { Placement, Student } from '../types/placement';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiX, FiEye, FiCamera } from 'react-icons/fi';

const PlacementList: React.FC = () => {
  const { user } = useAuth();
  const modify_by = user?.name || 'admin';
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<
    { student: Student; academicId: number; courseYear: string }[]
  >([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);
  const [editStudentPic, setEditStudentPic] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [viewImageModal, setViewImageModal] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [errors, setErrors] = useState<Partial<Record<keyof Placement, string>>>({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
const [placementIdToDelete, setPlacementIdToDelete] = useState<number | null>(null);

  const MAX_LENGTHS = {
    CompanyName: 100,
    RoleOffered: 50,
    PackageOffered: 10,
    PlacementYear: 4,
    Remarks: 200,
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [placementsRes, studentsRes] = await Promise.all([
        axiosInstance.get('/placements'),
        axiosInstance.get('/students'),
      ]);
      setPlacements(placementsRes.data.recordset || placementsRes.data);
      const studentsData: Student[] = studentsRes.data;
      setStudents(studentsData);
      setCourses([...new Set(studentsData.map(s => s.course.courseName))]);
    } catch (err) {
      toast.error('Failed to fetch data');
    }
  };

  useEffect(() => {
    if (selectedCourse && students.length) {
      const courseDuration = students.find(s => s.course.courseName === selectedCourse)?.course.courseDuration || 0;
      const finalYear = `${courseDuration}${getOrdinalSuffix(courseDuration)}`;
      setFilteredStudents(
        students
          .filter(s => s.course.courseName === selectedCourse)
          .flatMap(s =>
            s.academicDetails.map(ad => ({
              student: s,
              academicId: ad.id,
              courseYear: ad.courseYear,
            }))
          )
          .filter(item => item.courseYear === finalYear)
      );
    } else {
      setFilteredStudents([]);
    }
  }, [selectedCourse, students]);

  const getOrdinalSuffix = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const validateInput = (name: keyof Placement, value: string | number | undefined): string => {
    if (value === undefined || value === '') return `${name} is required`;
    if (typeof value === 'string' && (name in MAX_LENGTHS)) {
      const maxLength = MAX_LENGTHS[name as keyof typeof MAX_LENGTHS];
      if (maxLength && value.length > maxLength) {
        return `${name} exceeds maximum length of ${maxLength} characters`;
      }
    }
    switch (name) {
      case 'StudentAcademicId':
        return typeof value === 'number' && value > 0 ? '' : 'Student selection is required';
      case 'CompanyName':
        return typeof value === 'string' && value.trim() ? '' : 'Company name is required';
      case 'RoleOffered':
        return typeof value === 'string' && value.trim() ? '' : 'Role is required';
      case 'PackageOffered':
        return typeof value === 'number' && value > 0 ? '' : 'Package must be positive';
      case 'PlacementYear':
        return typeof value === 'number' && value >= 2000 && value <= new Date().getFullYear() ? '' : 'Invalid year';
      default:
        return '';
    }
  };

 const confirmDeletePlacement = (id: number) => {
  setPlacementIdToDelete(id);
  setDeleteModalOpen(true);
};

const handleConfirmDelete = async () => {
  if (!placementIdToDelete) return;
  try {
    await axiosInstance.delete(`/placements/${placementIdToDelete}`);
    setPlacements(prev => prev.filter(p => p.PlacementId !== placementIdToDelete));
    toast.success('Placement deleted successfully');
  } catch (err) {
    toast.error('Failed to delete placement');
  } finally {
    setDeleteModalOpen(false);
    setPlacementIdToDelete(null);
  }
};

  const handleEdit = (placement: Placement) => {
    setEditingPlacement(placement);
    setEditPreviewUrl(placement.studentimage || null);
    setEditStudentPic(null);
    const student = students.find(s => s.academicDetails.some(ad => ad.id === placement.StudentAcademicId));
    if (student) setSelectedCourse(student.course.courseName);
    setErrors({});
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setEditStudentPic(file);
      setEditPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeEditImage = () => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      setEditStudentPic(null);
      setEditPreviewUrl(null);
      if (editingPlacement) {
        setEditingPlacement({ ...editingPlacement, studentimage: undefined });
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlacement) return;

    const mandatoryFields: (keyof Placement)[] = ['StudentAcademicId', 'CompanyName', 'RoleOffered', 'PackageOffered', 'PlacementYear'];
    const newErrors: Partial<Placement> = {};

    mandatoryFields.forEach(key => {
      const value = editingPlacement[key];
      const error = validateInput(key, value);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('StudentAcademicId', editingPlacement.StudentAcademicId.toString());
      formData.append('CompanyName', editingPlacement.CompanyName);
      formData.append('RoleOffered', editingPlacement.RoleOffered || '');
      formData.append('PackageOffered', String(editingPlacement.PackageOffered ?? ''));
      formData.append('PlacementYear', String(editingPlacement.PlacementYear ?? ''));
      formData.append('Status', editingPlacement.Status);
      formData.append('Remarks', editingPlacement.Remarks || '');
      formData.append('ModifiedBy', modify_by);

      if (editStudentPic) {
        formData.append('studentPic', editStudentPic);
      } else if (!editingPlacement.studentimage) {
        formData.append('deleteExistingImage', 'true');
      }

      await axiosInstance.put(`/placements/${editingPlacement.PlacementId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Placement updated successfully');
      setEditingPlacement(null);
      setSelectedCourse('');
      setEditStudentPic(null);
      setEditPreviewUrl(null);
      setErrors({});
      fetchData();
    } catch (err) {
      toast.error('Failed to update placement');
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editingPlacement) {
      const { name, value } = e.target;
      const updatedValue = name === 'StudentAcademicId' ? parseInt(value) : value;
      setEditingPlacement({ ...editingPlacement, [name]: updatedValue as any });
      setErrors(prev => ({
        ...prev,
        [name]: validateInput(name as keyof Placement, updatedValue)
      }));
    }
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const academicId = parseInt(e.target.value, 10);
    if (editingPlacement) {
      setEditingPlacement({ ...editingPlacement, StudentAcademicId: academicId });
      setErrors(prev => ({
        ...prev,
        StudentAcademicId: validateInput('StudentAcademicId', academicId)
      }));
    }
  };

  return (
    <div className="">
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Profile</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Student</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Company</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Role</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Package (LPA)</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Year</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Status</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Created By</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Created On</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Modified By</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Modified On</th>
              <th className="p-2 text-left text-blue-800 text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((placement) => (
              <tr key={placement.PlacementId} className="border-b hover:bg-blue-50">
                <td className="p-2">
                  {placement.studentimage ? (
                    <div className="relative group">
                      <img
                        src={placement.studentimage.startsWith('http') ? placement.studentimage : `${axiosInstance.defaults.baseURL}${placement.studentimage}`}
                        alt={`${placement.fName} ${placement.lName}`}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer"
                        onClick={() => setViewImageModal(placement.studentimage || null)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        <FiEye className="text-white text-sm" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">No Image</span>
                    </div>
                  )}
                </td>
                <td className="p-2 text-sm">{placement.fName} {placement.lName || ''}</td>
                <td className="p-2 text-sm">{placement.CompanyName}</td>
                <td className="p-2 text-sm">{placement.RoleOffered}</td>
                <td className="p-2 text-sm text-center">{placement.PackageOffered}</td>
                <td className="p-2 text-sm">{placement.PlacementYear}</td>
                <td className="p-2 text-sm">{placement.Status}</td>
                <td className="p-2 text-sm">{placement.CreatedBy}</td>
                <td className="p-2 text-sm">{new Date(placement.CreatedOn).toLocaleString()}</td>
                <td className="p-2 text-sm">{placement.ModifiedBy || 'N/A'}</td>
                <td className="p-2 text-sm">{placement.ModifiedOn ? new Date(placement.ModifiedOn).toLocaleString() : 'N/A'}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleEdit(placement)}
                    className="bg-blue-600 text-white px-2 py-1 rounded mr-1 hover:bg-blue-700 text-xs"
                  >
                    Edit
                  </button>
                 <button
  onClick={() => confirmDeletePlacement(placement.PlacementId)}
  className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 text-xs"
>
  Delete
</button>

                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-5 max-w-sm w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Confirm Deletion</h2>
      <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this placement?</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            setDeleteModalOpen(false);
            setPlacementIdToDelete(null);
          }}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 text-sm"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmDelete}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}


      {editingPlacement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-999 p-4">
          <form
            onSubmit={handleUpdate}
            className="bg-white p-5 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                setEditingPlacement(null);
                setSelectedCourse('');
                setEditStudentPic(null);
                setEditPreviewUrl(null);
                setErrors({});
              }}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <FiX size={20} />
            </button>
            <div className='flex justify-between'>
            <h2 className="text-lg font-semibold text-blue-800 mb-1">Edit Placement </h2>
             <button
                type="button"
                onClick={() => {
                  setEditingPlacement(null);
                  setSelectedCourse('');
                  setEditStudentPic(null);
                  setEditPreviewUrl(null);
                  setErrors({});
                }}
                className="bg-red-500 text-white  p-2 rounded-md hover:bg-red-700 transition text-sm"
              >
                <FiX size={16} />
              </button>

            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course <span className="text-red-500">*</span></label>
                <select
                  name="course"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student <span className="text-red-500">*</span></label>
                <select
                  name="StudentAcademicId"
                  onChange={handleStudentChange}
                  value={editingPlacement?.StudentAcademicId.toString() || ''}
                  className={`w-full p-2 border ${errors.StudentAcademicId ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  disabled={!selectedCourse}
                  required
                >
                  <option value="">Select Student</option>
                  {filteredStudents.map(({ student, academicId, courseYear }) => (
                    <option key={academicId} value={academicId}>
                      {student.fName} {student.lName || ''} ({courseYear})
                    </option>
                  ))}
                </select>
                {errors.StudentAcademicId && <p className="text-red-500 text-xs mt-1">{errors.StudentAcademicId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                <input
                  name="CompanyName"
                  value={editingPlacement.CompanyName}
                  onChange={handleEditChange}
                  className={`w-full p-2 border ${errors.CompanyName ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.CompanyName}
                />
                {errors.CompanyName && <p className="text-red-500 text-xs mt-1">{errors.CompanyName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Offered <span className="text-red-500">*</span></label>
                <input
                  name="RoleOffered"
                  value={editingPlacement.RoleOffered || ''}
                  onChange={handleEditChange}
                  className={`w-full p-2 border ${errors.RoleOffered ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.RoleOffered}
                />
                {errors.RoleOffered && <p className="text-red-500 text-xs mt-1">{errors.RoleOffered}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Offered (LPA) <span className="text-red-500">*</span></label>
                <input
                  name="PackageOffered"
                  type="number"
                  step="0.01"
                  value={editingPlacement.PackageOffered || ''}
                  onChange={handleEditChange}
                  className={`w-full p-2 border ${errors.PackageOffered ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.PackageOffered}
                />
                {errors.PackageOffered && <p className="text-red-500 text-xs mt-1">{errors.PackageOffered}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Placement Year <span className="text-red-500">*</span></label>
                <input
                  name="PlacementYear"
                  type="number"
                  value={editingPlacement.PlacementYear || ''}
                  onChange={handleEditChange}
                  className={`w-full p-2 border ${errors.PlacementYear ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-sm`}
                  required
                  maxLength={MAX_LENGTHS.PlacementYear}
                />
                {errors.PlacementYear && <p className="text-red-500 text-xs mt-1">{errors.PlacementYear}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="Status"
                  value={editingPlacement.Status}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="Selected">Selected</option>
                  <option value="Joined">Joined</option>
                  <option value="Offer Received">Offer Received</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input
                  name="Remarks"
                  value={editingPlacement.Remarks || ''}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                  maxLength={MAX_LENGTHS.Remarks}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo</label>
                <div className="flex items-center space-x-3">
                  {(editPreviewUrl || (editingPlacement.studentimage && !editStudentPic)) ? (
                    <div className="relative group">
                      <img
                        src={editPreviewUrl || (editingPlacement.studentimage?.startsWith('http') ? editingPlacement.studentimage : `${axiosInstance.defaults.baseURL}${editingPlacement.studentimage}`) || ''}
                        alt="Preview"
                        className="w-10 h-10 rounded-full object-cover cursor-pointer"
                        onClick={() => setViewImageModal(editPreviewUrl || editingPlacement.studentimage || null)}
                      />
                      <button
                        type="button"
                        onClick={removeEditImage}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                      >
                        <FiX size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center just
                    ify-center">
                      <span className="text-gray-500 text-xs">No Image</span>
                    </div>
                  )}
                  <label
                    htmlFor="changePhotoInput"
                    className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 cursor-pointer flex items-center text-xs"
                  >
                    <FiCamera className="mr-1" /> Change Photo
                  </label>
                  <input
                    id="changePhotoInput"
                    type="file"
                    accept="image/*"
                    onChange={handleEditFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPlacement(null);
                  setSelectedCourse('');
                  setEditStudentPic(null);
                  setEditPreviewUrl(null);
                  setErrors({});
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {viewImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-999 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto relative">
            <button
              onClick={() => setViewImageModal(null)}
              className="absolute top-3 right-3 bg-red-500 text-white rounded-full p-1.5"
            >
              <FiX size={16} />
            </button>
            <img
              src={viewImageModal.startsWith('http') ? viewImageModal : `${axiosInstance.defaults.baseURL}${viewImageModal}`}
              alt="Full size"
              className="max-w-full max-h-[85vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementList;