import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, DollarSign, TrendingUp, Clock, IndianRupee} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard({ user, onLogout }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'Total Employees',
      value: analytics?.total_employees || 0,
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Monthly Payroll Cost',
      value: `₹${analytics?.monthly_payroll_cost?.toLocaleString() || 0}`,
      icon: IndianRupee,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Payroll Records',
      value: analytics?.total_payroll_records || 0,
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Overtime Pay',
      value: `₹${analytics?.total_overtime_pay?.toLocaleString() || 0}`,
      icon: Clock,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-8" data-testid="dashboard">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.full_name}!</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-gray-600">Loading analytics...</div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <Card key={index} className="card-hover border-0 shadow-lg overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                          <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                        </div>
                        <div className={`h-14 w-14 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                          <div className={`h-12 w-12 rounded-full bg-gradient-to-r ${stat.color} flex items-center justify-center shadow-lg`}>
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {analytics?.department_distribution && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Department Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(analytics.department_distribution).map(([dept, count], index) => (
                      <div key={index} className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                        <p className="text-sm font-medium text-gray-600 mb-1">{dept}</p>
                        <p className="text-2xl font-bold text-blue-600">{count}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      
    </Layout>
  );
}