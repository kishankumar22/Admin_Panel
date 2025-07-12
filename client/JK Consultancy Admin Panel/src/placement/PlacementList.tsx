import React, { useState, useEffect } from 'react';
import { Placement } from '../types/placement';
import axiosInstance from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const PlacementList: React.FC = () => {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);
  
  const { user } = useAuth();
  const modify_by = user?.name || 'admin'; // Fallback to 'admin
  // console.log(modify_by); // Log user name for debugging

  useEffect(() => {
    axiosInstance
      .get('/placements') // Match the backend endpoint
      .then((res) => {
        // Extract recordset from mssql response
        const data = res.data.recordset || [];
        setPlacements(data);
      })
      .catch((err) => {
        console.error('Error fetching placements:', err);
        toast.error('Failed to fetch placements');
      });
  }, []);

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
  };

  const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingPlacement) return;
  try {
    const updatedPlacement = {
      ...editingPlacement,
      ModifiedBy: modify_by, // ✅ Correct value from useAuth
    };
    await axiosInstance.put(`/placements/${editingPlacement.PlacementId}`, updatedPlacement);
    setPlacements(
      placements.map((p) =>
        p.PlacementId === editingPlacement.PlacementId ? updatedPlacement : p
      )
    );
    setEditingPlacement(null);
    toast.success('Placement updated successfully');
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
                  <img src={placement.studentimage} alt={`${placement.fName} ${placement.lName}`} className="w-12 h-12 rounded-full" />
                </td>
                <td className="p-3">
                  {placement.fName} {placement.lName || ''}
                </td>
                <td className="p-3">{placement.CompanyName}</td>
                <td className="p-3">{placement.RoleOffered}</td>
                <td className="p-3">{placement.PackageOffered}</td>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <form
            onSubmit={handleUpdate}
            className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md"
          >
            <h2 className="text-xl font-semibold text-blue-800 mb-4">Edit Placement</h2>
            <div className="space-y-4">
              <input
                name="CompanyName"
                value={editingPlacement.CompanyName}
                onChange={handleEditChange}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                name="RoleOffered"
                value={editingPlacement.RoleOffered}
                onChange={handleEditChange}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                name="PackageOffered"
                type="number"
                step="0.01"
                value={editingPlacement.PackageOffered}
                onChange={handleEditChange}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                name="PlacementYear"
                type="number"
                value={editingPlacement.PlacementYear}
                onChange={handleEditChange}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
              <input
                name="Remarks"
                value={editingPlacement.Remarks || ''}
                onChange={handleEditChange}
                className="w-full p-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                onClick={() => setEditingPlacement(null)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default PlacementList;