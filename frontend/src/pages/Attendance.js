import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Calendar, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Attendance({ user, onLogout }) {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: '',
    hours_worked: '',
    overtime_hours: '0',
    leaves: '0',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [attendanceRes, employeesRes] = await Promise.all([
        axios.get(`${API}/attendance`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setAttendance(attendanceRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      await axios.post(`${API}/attendance`, {
        ...formData,
        hours_worked: parseFloat(formData.hours_worked),
        overtime_hours: parseFloat(formData.overtime_hours),
        leaves: parseInt(formData.leaves),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Attendance record added successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date: '',
      hours_worked: '',
      overtime_hours: '0',
      leaves: '0',
    });
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.employee_id === employeeId);
    return employee ? employee.name : employeeId;
  };

  const canModify = user?.role === 'admin' || user?.role === 'hr';

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="attendance-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Attendance</h1>
            <p className="text-gray-600">Track employee attendance and working hours</p>
          </div>
          {canModify && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  data-testid="add-attendance-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Attendance
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Attendance Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee</Label>
                    <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                      <SelectTrigger data-testid="attendance-employee-select">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.employee_id}>
                            {employee.name} ({employee.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      data-testid="attendance-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hours_worked">Hours Worked</Label>
                    <Input
                      id="hours_worked"
                      type="number"
                      step="0.5"
                      min="0"
                      max="24"
                      value={formData.hours_worked}
                      onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                      required
                      data-testid="attendance-hours-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overtime_hours">Overtime Hours</Label>
                    <Input
                      id="overtime_hours"
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.overtime_hours}
                      onChange={(e) => setFormData({ ...formData, overtime_hours: e.target.value })}
                      data-testid="attendance-overtime-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leaves">Leaves</Label>
                    <Input
                      id="leaves"
                      type="number"
                      min="0"
                      value={formData.leaves}
                      onChange={(e) => setFormData({ ...formData, leaves: e.target.value })}
                      data-testid="attendance-leaves-input"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600" data-testid="attendance-submit-button">
                    Add Record
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading attendance records...</div>
          </div>
        ) : attendance.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Calendar className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">No attendance records found</p>
              <p className="text-gray-500 text-sm">Add attendance records to track employee hours</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Hours Worked</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Overtime</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Leaves</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 hover:bg-blue-50">
                        <td className="py-3 px-4">{getEmployeeName(record.employee_id)}</td>
                        <td className="py-3 px-4">{record.date}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center">
                            <Clock className="h-4 w-4 mr-1 text-blue-600" />
                            {record.hours_worked}h
                          </span>
                        </td>
                        <td className="py-3 px-4 text-orange-600 font-medium">{record.overtime_hours}h</td>
                        <td className="py-3 px-4 text-red-600 font-medium">{record.leaves}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}