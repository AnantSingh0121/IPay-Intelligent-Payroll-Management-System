import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Mail, Briefcase,Users } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Employees({ user, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    department: '',
    designation: '',
    base_salary: '',
    joining_date: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      if (editingEmployee) {
        await axios.put(`${API}/employees/${formData.employee_id}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Employee updated successfully');
      } else {
        await axios.post(`${API}/employees`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success('Employee added successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Employee deleted successfully');
      fetchEmployees();
    } catch (error) {
      toast.error('Failed to delete employee');
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_id: employee.employee_id,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      designation: employee.designation,
      base_salary: employee.base_salary,
      joining_date: employee.joining_date,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      name: '',
      email: '',
      department: '',
      designation: '',
      base_salary: '',
      joining_date: '',
    });
    setEditingEmployee(null);
  };

  const canModify = user?.role === 'admin' || user?.role === 'hr';

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="employees-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Employees</h1>
            <p className="text-gray-600">Manage employee records</p>
          </div>
          {canModify && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  data-testid="add-employee-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee_id">Employee ID</Label>
                      <Input
                        id="employee_id"
                        value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        required
                        disabled={editingEmployee}
                        data-testid="employee-id-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        data-testid="employee-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        data-testid="employee-email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        required
                        data-testid="employee-department-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        required
                        data-testid="employee-designation-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="base_salary">Base Salary</Label>
                      <Input
                        id="base_salary"
                        type="number"
                        value={formData.base_salary}
                        onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                        required
                        data-testid="employee-salary-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="joining_date">Joining Date</Label>
                      <Input
                        id="joining_date"
                        type="date"
                        value={formData.joining_date}
                        onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                        required
                        data-testid="employee-joining-date-input"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600" data-testid="employee-submit-button">
                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading employees...</div>
          </div>
        ) : employees.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Users className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">No employees found</p>
              <p className="text-gray-500 text-sm">Add your first employee to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {employees.map((employee) => (
              <Card key={employee.id} className="card-hover border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-1">{employee.name}</CardTitle>
                      <p className="text-sm text-gray-500">ID: {employee.employee_id}</p>
                    </div>
                    {canModify && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(employee)}
                          className="h-8 w-8 p-0"
                          data-testid={`edit-employee-${employee.employee_id}`}
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(employee.employee_id)}
                          className="h-8 w-8 p-0"
                          data-testid={`delete-employee-${employee.employee_id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {employee.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Briefcase className="h-4 w-4 mr-2" />
                    {employee.designation}
                  </div>
                  <div className="pt-2 border-t mt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Department:</span>
                      <span className="font-medium text-gray-800">{employee.department}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Base Salary:</span>
                      <span className="font-medium text-green-600">₹{employee.base_salary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Joined:</span>
                      <span className="font-medium text-gray-800">{employee.joining_date}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}