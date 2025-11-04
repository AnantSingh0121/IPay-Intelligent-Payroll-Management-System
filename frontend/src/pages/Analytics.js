import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;


export default function Analytics({ user, onLogout }) {
  const [forecast, setForecast] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'hr') {
      fetchForecast();
      fetchAnomalies();
    }
  }, [user]);

  const fetchForecast = async () => {
    setLoadingForecast(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/forecast`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.forecast) {
        setForecast(response.data.forecast);
      } else {
        toast.info(response.data.message || 'Not enough data for forecasting');
      }
    } catch (error) {
      toast.error('Failed to fetch forecast');
    } finally {
      setLoadingForecast(false);
    }
  };

  const fetchAnomalies = async () => {
    setLoadingAnomalies(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/analytics/anomalies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.anomalies) {
        setAnomalies(response.data.anomalies);
      } else {
        toast.info(response.data.message || 'Not enough data for anomaly detection');
      }
    } catch (error) {
      toast.error('Failed to fetch anomalies');
    } finally {
      setLoadingAnomalies(false);
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center h-64">
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center p-8">
              <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
              <p className="text-gray-600 text-lg">Access Restricted</p>
              <p className="text-gray-500 text-sm">Only admin and HR can view analytics</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="space-y-8" data-testid="analytics-page">
        <div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Advanced Analytics</h1>
          <p className="text-gray-600">AI-powered payroll forecasting and anomaly detection</p>
        </div>

        {/* Payroll Forecast */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl flex items-center">
                  <TrendingUp className="h-6 w-6 mr-2 text-blue-600" />
                  Payroll Forecast (Prophet ML)
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">6-month forecast using Facebook Prophet</p>
              </div>
              <Button
                onClick={fetchForecast}
                variant="outline"
                disabled={loadingForecast}
                data-testid="refresh-forecast-button"
              >
                {loadingForecast ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingForecast ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Generating forecast...</div>
              </div>
            ) : forecast.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-600">No forecast data available</p>
                  <p className="text-sm text-gray-500 mt-1">Process at least 5 payroll records to generate forecast</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
<YAxis
  domain={[0, (dataMax) => dataMax * 1.2]}
  tickFormatter={(value) => value.toLocaleString()}
  allowDecimals={false}
  width={90}
/>






                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="predicted_cost" stroke="#3b82f6" strokeWidth={3} name="Predicted Cost" />
                  <Line type="monotone" dataKey="upper_bound" stroke="#f59e0b" strokeDasharray="5 5" name="Upper Bound" />
                  <Line type="monotone" dataKey="lower_bound" stroke="#10b981" strokeDasharray="5 5" name="Lower Bound" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl flex items-center">
                  <AlertTriangle className="h-6 w-6 mr-2 text-orange-600" />
                  Anomaly Detection (PyOD)
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Unusual salary patterns detected by KNN algorithm</p>
              </div>
              <Button
                onClick={fetchAnomalies}
                variant="outline"
                disabled={loadingAnomalies}
                data-testid="refresh-anomalies-button"
              >
                {loadingAnomalies ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAnomalies ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Detecting anomalies...</div>
              </div>
            ) : anomalies.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-gray-600">No anomalies detected</p>
                  <p className="text-sm text-gray-500 mt-1">Process at least 10 payroll records for anomaly detection</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                                {anomalies.map((anomaly, index) => {
                  let severity = "Low";
                  let severityColor = "text-green-600";

                  if (anomaly.anomaly_score > 50) {
                    severity = "Medium";
                    severityColor = "text-yellow-600";
                  }
                  if (anomaly.anomaly_score > 100) {
                    severity = "High";
                    severityColor = "text-red-600";
                  }
//  const salaries = anomalies.map(a => a.net_salary);
//   const meanSalary =
//     salaries.length > 0
//       ? salaries.reduce((sum, val) => sum + val, 0) / salaries.length
//       : 0;

//   // Compute deviation (avoid division by zero)
//   const deviation =
//     meanSalary > 0
//       ? ((anomaly.net_salary - meanSalary) / meanSalary) * 100
//       : 0;
                  return (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-800 text-lg">
                            {anomaly.employee_name}
                          </h3>
                          <p className="text-sm text-gray-600">ID: {anomaly.employee_id}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Period: {anomaly.month}/{anomaly.year}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-600">Net Salary</p>
                          <p className="text-xl font-bold text-orange-600">
                           ₹{anomaly.net_salary.toLocaleString()}
                          </p>
<div className="text-right mt-2">
  {/* Anomaly Score  */}
  <p className="text-sm text-gray-600">Anomaly Score</p>
  <p className="text-xl font-semibold text-orange-600">{anomaly.anomaly_score.toFixed(2)}</p>
</div>
                          <p className={`text-sm font-semibold mt-1 ${severityColor}`}>
                            Severity: {severity}
                          </p>
                          
                        </div>
                      </div>

                      <div className="mt-2 flex items-start">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mr-2 mt-0.5" />
                        <p className="text-sm text-gray-700">{anomaly.reason}</p>
                      </div>
<div className="mt-3 text-sm text-gray-600">
  <p className="text-sm mt-1">
    Deviation from average:{" "}
    <span
      className={`font-medium ${
        anomaly.deviation_percent > 0
          ? "text-green-600"
          : anomaly.deviation_percent < 0
          ? "text-red-600"
          : "text-gray-600"
      }`}
    >
      {anomaly.deviation_percent > 0
        ? `+${anomaly.deviation_percent.toFixed(2)}% above average`
        : `${anomaly.deviation_percent.toFixed(2)}% below average`}
    </span>
  </p>

  <p className="text-xs text-gray-500">
    Note: All numeric values are rounded off to 2 decimal places.
  </p>
</div>


                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
