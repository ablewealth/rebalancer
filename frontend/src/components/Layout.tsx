import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChartBarIcon,
  FolderIcon,
  PlusIcon,
  CurrencyDollarIcon,
  DocumentChartBarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    {
      name: 'Tax Harvesting',
      href: '/tax-harvesting',
      icon: ChartBarIcon,
      current: location.pathname === '/' || location.pathname === '/tax-harvesting'
    },
    {
      name: 'Model Portfolios',
      href: '/model-portfolios',
      icon: FolderIcon,
      current: location.pathname === '/model-portfolios'
    },
    {
      name: 'Buy Orders',
      href: '/buy-orders',
      icon: PlusIcon,
      current: location.pathname === '/buy-orders'
    },
    {
      name: 'Price Manager',
      href: '/price-manager',
      icon: CurrencyDollarIcon,
      current: location.pathname === '/price-manager'
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: DocumentChartBarIcon,
      current: location.pathname === '/reports'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Brand */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600 mr-3" />
                <span className="text-xl font-bold text-gray-900">Tax Harvesting</span>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`
                      flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200
                      ${item.current
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50 rounded-lg mt-2 shadow-lg border border-gray-200">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-200
                        ${item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;