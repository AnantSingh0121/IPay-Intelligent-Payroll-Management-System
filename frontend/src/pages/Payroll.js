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
import { Plus, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Payroll({ user, onLogout }) {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    month: '',
    year: new Date().getFullYear().toString(),
    bonuses: '0',
    deductions: '0',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [payrollRes, employeesRes] = await Promise.all([
        axios.get(`${API}/payroll`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setPayrollRecords(payrollRes.data);
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
      await axios.post(`${API}/payroll/process`, {
        ...formData,
        year: parseInt(formData.year),
        bonuses: parseFloat(formData.bonuses),
        deductions: parseFloat(formData.deductions),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Payroll processed successfully');
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
      month: '',
      year: new Date().getFullYear().toString(),
      bonuses: '0',
      deductions: '0',
    });
  };

  const canModify = user?.role === 'admin' || user?.role === 'hr';

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-6" data-testid="payroll-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Payroll</h1>
            <p className="text-gray-600">Process and manage employee payroll</p>
          </div>
          {canModify && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  data-testid="process-payroll-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Process Payroll
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Process Payroll</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee</Label>
                    <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                      <SelectTrigger data-testid="payroll-employee-select">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Month</Label>
                      <Select value={formData.month} onValueChange={(value) => setFormData({ ...formData, month: value })}>
                        <SelectTrigger data-testid="payroll-month-select">
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month.value} value={month.value}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        required
                        data-testid="payroll-year-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bonuses">Bonuses ($)</Label>
                    <Input
                      id="bonuses"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.bonuses}
                      onChange={(e) => setFormData({ ...formData, bonuses: e.target.value })}
                      data-testid="payroll-bonuses-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deductions">Deductions ($)</Label>
                    <Input
                      id="deductions"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                      data-testid="payroll-deductions-input"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600" data-testid="payroll-submit-button">
                    Process Payroll
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading payroll records...</div>
          </div>
        ) : payrollRecords.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center h-64">
              <DollarSign className="h-16 w-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">No payroll records found</p>
              <p className="text-gray-500 text-sm">Process payroll to see records here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payrollRecords.map((record) => (
              <Card key={record.id} className="card-hover border-0 shadow-lg">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{record.employee_name}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {months.find(m => m.value === record.month)?.label} {record.year}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Net Salary</p>
                      <p className="text-2xl font-bold text-green-600">₹{record.net_salary.toLocaleString()}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Base Salary</p>
                      <p className="font-semibold text-gray-800">₹{record.base_salary.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Overtime Pay</p>
                      <p className="font-semibold text-orange-600">₹{record.overtime_pay.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Bonuses</p>
                      <p className="font-semibold text-blue-600">₹{record.bonuses.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Deductions</p>
                      <p className="font-semibold text-red-600">-₹{record.deductions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tax (15%)</p>
                      <p className="font-semibold text-red-600">-₹{record.tax.toLocaleString()}</p>
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