import { Link, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { LayoutDashboard, Users, Calendar, DollarSign, BarChart3, MessageSquare, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', href: '/employees', icon: Users },
    { name: 'Attendance', href: '/attendance', icon: Calendar },
    { name: 'Payroll', href: '/payroll', icon: DollarSign },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'HR Chatbot', href: '/chatbot', icon: MessageSquare },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Payroll System
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-sm">
                <p className="font-medium text-gray-800">{user?.full_name}</p>
                <p className="text-gray-500 capitalize">{user?.role}</p>
              </div>
              <Button
                onClick={onLogout}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                data-testid="logout-button"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${
                  isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'text-gray-700 hover:bg-blue-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-white shadow-lg min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-blue-50'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}