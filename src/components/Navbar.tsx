import React from 'react';
import { LogOut, User, Home, FileText, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { auth, logout } = useAuth();

  const menuItems = [
    { id: 'properties', label: 'Properties', icon: Home },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (auth.user?.role === 'ADMIN') {
    menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Settings });
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Home className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Land Registry
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-8">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {auth.user?.fullName}
              </p>
              <p className="text-xs text-gray-500">
                {auth.user?.role === 'ADMIN' ? 'Administrator' : 'User'}
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;