import React, { useState, useEffect } from 'react';
import { Placement, Student } from '../types/placement';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiX, FiEye } from 'react-icons/fi';

const PlacementList: React.FC = () => {
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
  
  const { user } = useAuth();
  const modify_by = user?.name || 'admin';

  useEffect(() => {
    fetchPlacements();
    fetchStudents();
  }, []);

  const fetchPlacements = async () => {
    try {
      const res = await axiosInstance.get('/placements');
      const data = res.data.recordset || res.data;
      setPlacements(data);
    } catch (err) {
      console.error('Error fetching placements:', err);
      toast.error('Failed to fetch placements');
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await axiosInstance.get('/students');
      const studentsData: Student[] = res.data;
      setStudents(studentsData);

      const uniqueCourses = Array.from(
        new Set(studentsData.map((student) => student.course.courseName))
      );
      setCourses(uniqueCourses);
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Failed to fetch students');
    }
  };

  useEffect(() => {
    if (selectedCourse) {
      const courseDuration = students.find(s => s.course.courseName === selectedCourse)?.course.courseDuration || 0;
      const years = Array.from({ length: courseDuration }, (_, i) => `${i + 1}${getOrdinalSuffix(i + 1)}`);
      
      const filtered = students
        .filter((student) => student.course.courseName === selectedCourse)
        .flatMap((student) => 
          student.academicDetails.map(detail => ({
            student,
            academicId: detail.id,
            courseYear: detail.courseYear
          }))
        )
        .filter(item => years.includes(item.courseYear));

      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [selectedCourse, students]);

  const getOrdinalSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this placement?')) {
      try {
        await axiosInstance.delete(`/placements/${id}`);
        setPlacements(placements.filter((p) => p.PlacementId !== id));
        toast.success('Placement deleted successfully');
      } catch (err) {
        console.error('Error deleting placement:', err);
        toast.error('Failed to delete placement');
      }
    }
  };

  const handleEdit = (placement: Placement) => {
    setEditingPlacement(placement);
    setEditPreviewUrl(placement.studentimage || null);
    // setEditStudentPic(null);
    // Set initial course based on the student's course
    const student = students.find(s => s.academicDetails.some(ad => ad.id === placement.StudentAcademicId));
    if (student) {
      setSelectedCourse(student.course.courseName);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditStudentPic(file);
      setEditPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeEditImage = () => {
    setEditStudentPic(null);
    setEditPreviewUrl(null);
    if (editingPlacement) {
      setEditingPlacement({
        ...editingPlacement,
        StudentPic: null
      });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlacement) return;
    
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
      formData.append('deleteExistingImage', editingPlacement.StudentPic ? 'false' : 'true');
      
      if (editStudentPic) {
        formData.append('studentPic', editStudentPic);
      }

      await axiosInstance.put(
        `/placements/${editingPlacement.PlacementId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      toast.success('Placement updated successfully');
      setEditingPlacement(null);
      setSelectedCourse('');
      // setEditStudentPic(null);
      setEditPreviewUrl(null);
      fetchPlacements();
    } catch (err) {
      console.error('Error updating placement:', err);
      toast.error('Failed to update placement');
    }
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (editingPlacement) {
      setEditingPlacement({ ...editingPlacement, [e.target.name]: e.target.value });
    }
  };

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const academicId = e.target.value;
    if (editingPlacement) {
      setEditingPlacement({
        ...editingPlacement,
        StudentAcademicId: parseInt(academicId)
      });
    }
  };

  const confirmDeleteImage = () => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      removeEditImage();
    }
  };

  return (
    <div className="">
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-3 text-left text-blue-800">Profile</th>
              <th className="p-3 text-left text-blue-800">Student</th>
              <th className="p-3 text-left text-blue-800">Company</th>
              <th className="p-3 text-left text-blue-800">Role</th>
              <th className="p-3 text-left text-blue-800">Package <span className='text-[13px] text-red-500'>(in Lakhs)</span></th>
              <th className="p-3 text-left text-blue-800">Year</th>
              <th className="p-3 text-left text-blue-800">Status</th>
              <th className="p-3 text-left text-blue-800">Created By</th>
              <th className="p-3 text-left text-blue-800">Created On</th>
              <th className="p-3 text-left text-blue-800">Modified By</th>
              <th className="p-3 text-left text-blue-800">Modified On</th>
              <th className="p-3 text-left text-blue-800">Actions</th>
            </tr>
          </thead>
          <tbody>
            {placements.map((placement) => (
              <tr key={placement.PlacementId} className="border-b hover:bg-blue-50">
                <td className="p-3">
                  {placement.studentimage ? (
                    <div className="relative group">
                      <img 
                        src={placement.studentimage.startsWith('http') ? 
                          placement.studentimage : 
                          `${axiosInstance.defaults.baseURL}${placement.studentimage}`} 
                        alt={`${placement.fName} ${placement.lName}`} 
                        className="w-12 h-12 rounded-full object-cover cursor-pointer"
                        onClick={() => setViewImageModal(placement.studentimage ?? null)}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <FiEye className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">No Image</span>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {placement.fName} {placement.lName || ''}
                </td>
                <td className="p-3">{placement.CompanyName}</td>
                <td className="p-3">{placement.RoleOffered}</td>
                <td className="p-3  text-center">{placement.PackageOffered}</td>
                <td className="p-3">{placement.PlacementYear}</td>
                <td className="p-3">{placement.Status}</td>
                <td className="p-3">{placement.CreatedBy}</td>
                <td className="p-3">{new Date(placement.CreatedOn).toLocaleString()}</td>
                <td className="p-3">{placement.ModifiedBy || 'N/A'}</td>
                <td className="p-3">{placement.ModifiedOn ? new Date(placement.ModifiedOn).toLocaleString() : 'N/A'}</td>
                <td className="p-3">
                  <button
                    onClick={() => handleEdit(placement)}
                    className="bg-blue-600 text-white px-2 py-1 rounded mr-2 hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(placement.PlacementId)}
                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingPlacement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            onSubmit={handleUpdate}
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative   overflow-auto h-[700px]"
          >
            <button
              type="button"
              onClick={() => {
                setEditingPlacement(null);
                setSelectedCourse('');
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <FiX size={24} />
            </button>

            <h2 className="text-xl font-semibold text-blue-800 mb-4">Edit Placement</h2>
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Course</label>
                <select
                  name="course"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Student</label>
                <select
                  name="studentAcademicId"
                  onChange={handleStudentChange}
                  value={editingPlacement.StudentAcademicId}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Student Photo</label>
                <div className="flex items-center space-x-4">
                  {editPreviewUrl ? (
                    <>
                      <div className="relative group">
                        <img 
                          src={editPreviewUrl.startsWith('http') ?
                            editPreviewUrl :
                            `${axiosInstance.defaults.baseURL}${editPreviewUrl}`} 
                          alt="Preview" 
                          className="w-16 h-16 rounded-full object-cover cursor-pointer"
                          onClick={() => setViewImageModal(editPreviewUrl)}
                        />
                        <button
                          type="button"
                          onClick={confirmDeleteImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                      <label className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-800">Change Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditFileChange}
                          className="hidden"
                        />
                      </label>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">+</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Company Name</label>
                <input
                  name="CompanyName"
                  value={editingPlacement.CompanyName}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Role Offered</label>
                <input
                  name="RoleOffered"
                  value={editingPlacement.RoleOffered}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Package Offered (in LPA)</label>
                <input
                  name="PackageOffered"
                  type="number"
                  step="0.01"
                  value={editingPlacement.PackageOffered}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Placement Year</label>
                <input
                  name="PlacementYear"
                  type="number"
                  value={editingPlacement.PlacementYear}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Status</label>
                <select
                  name="Status"
                  value={editingPlacement.Status}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Selected">Selected</option>
                  <option value="Joined">Joined</option>
                  <option value="Offer Received">Offer Received</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="mb-2 text-sm font-medium">Remarks</label>
                <input
                  name="Remarks"
                  value={editingPlacement.Remarks || ''}
                  onChange={handleEditChange}
                  className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingPlacement(null);
                  setSelectedCourse('');
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {viewImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-screen overflow-auto relative">
            <button
              onClick={() => setViewImageModal(null)}
              className="absolute top-4 right-4 bg-red-500 text-white rounded-full p-2"
            >
              <FiX size={20} />
            </button>
            <img 
              src={viewImageModal.startsWith('http') ? 
                viewImageModal : 
                `${axiosInstance.defaults.baseURL}${viewImageModal}`} 
              alt="Full size" 
              className="max-w-full max-h-[90vh]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementList;