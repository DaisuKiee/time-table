import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, BookOpen, DoorOpen, Calendar, 
  Brain, GraduationCap, LogOut, Menu, X,
  ChevronDown, User, Settings, LayoutGrid,
  FileText, ClipboardList, ChevronRight, HelpCircle,
  Building2, Layers
} from 'lucide-react';
import ctuLogo from '../assets/images/logos/ctulogo.png';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  // Page entrance zoom animation
  React.useEffect(() => {
    setPageReady(false);
    const timer = setTimeout(() => {
      setPageReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [location.pathname]); // Re-trigger on route change

  // Get avatar URL
  const getAvatarUrl = () => {
    if (user?.profilePicture) {
      return `${process.env.REACT_APP_API_URL?.replace('/api', '')}${user.profilePicture}`;
    }
    return null;
  };

  // Get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return '??';
  };

  const avatarUrl = getAvatarUrl();

  // Get user role display name with program badge
  const getUserRoleDisplay = () => {
    if (user?.role === 'admin') return 'System Administrator';
    if (user?.role === 'scheduling_officer') return 'Scheduling Officer';
    if (user?.role === 'program_manager') {
      return `${user?.program || ''} Manager`;
    }
    if (user?.role === 'faculty') return 'Faculty';
    if (user?.role === 'student') return 'Student';
    return 'User';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Handle mouse enter on sidebar
  const handleSidebarMouseEnter = () => {
    setSidebarHovered(true);
  };

  // Handle mouse leave from sidebar
  const handleSidebarMouseLeave = () => {
    setSidebarHovered(false);
  };

  // Determine if sidebar should show expanded content
  const isExpanded = !sidebarCollapsed || sidebarHovered;

  // Navigation items based on role with groupings
  const getNavItems = () => {
    const baseItems = {
      overview: {
        title: 'OVERVIEW',
        items: [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid }
        ]
      }
    };

    if (user?.role === 'admin' || user?.role === 'scheduling_officer' || user?.role === 'program_manager') {
      return {
        ...baseItems,
        operations: {
          title: 'OPERATIONS',
          items: [
            { name: 'Faculty', path: '/faculty', icon: Users },
            { name: 'Students', path: '/students', icon: GraduationCap },
            { name: 'Subjects', path: '/subjects', icon: BookOpen },
            { name: 'Rooms', path: '/rooms', icon: DoorOpen },
            { name: 'Sections', path: '/sections', icon: Layers },
            { name: 'Schedules', path: '/schedules', icon: Calendar },
            { name: 'Class Spaces', path: '/classes', icon: FileText },
            { name: 'AI Insights', path: '/ai', icon: Brain }
          ]
        },
        management: {
          title: 'MANAGEMENT',
          items: user?.role === 'admin' ? [
            { name: 'Users', path: '/users', icon: Settings },
            { name: 'Reports', path: '/reports', icon: ClipboardList }
          ] : [
            { name: 'Reports', path: '/reports', icon: ClipboardList }
          ]
        }
      };
    }

    if (user?.role === 'faculty') {
      return {
        ...baseItems,
        academic: {
          title: 'ACADEMIC',
          items: [
            { name: 'My Classes', path: '/classes', icon: GraduationCap },
            { name: 'My Schedule', path: '/schedules', icon: Calendar }
          ]
        }
      };
    }

    if (user?.role === 'student') {
      return {
        ...baseItems,
        academic: {
          title: 'ACADEMIC',
          items: [
            { name: 'My Classes', path: '/classes', icon: GraduationCap },
            { name: 'My Schedule', path: '/schedules', icon: Calendar }
          ]
        }
      };
    }

    return baseItems;
  };

  const navGroups = getNavItems();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation - Minimal for mobile */}
      <nav className="bg-[#1e3a8a] border-b border-blue-900 fixed w-full z-30 top-0 lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-white rounded-lg hover:bg-blue-800"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            {/* Mobile Logo */}
            <div className="flex items-center gap-2">
              <img src={ctuLogo} alt="CTU Logo" className="w-8 h-8 object-contain" />
              <div className="flex flex-col">
                <span className="text-white font-semibold text-sm">CTU Daanbantayan</span>
                {user?.role === 'program_manager' && user?.program && (
                  <span className="text-yellow-400 text-xs font-medium">{user.program} Manager</span>
                )}
              </div>
            </div>

            {/* Mobile User */}
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="p-1 text-white rounded-full hover:bg-blue-800 overflow-hidden"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="User"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <User size={16} className="text-blue-900" />
                </div>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <aside
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ${
          isExpanded ? 'w-72' : 'w-20'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } bg-[#1e3a8a] lg:translate-x-0`}
      >
        {/* Logo Section */}
        <div className={`flex items-center gap-3 px-6 py-6 ${isExpanded ? '' : 'justify-center px-4'}`}>
          <img 
            src={ctuLogo} 
            alt="CTU Logo" 
            className={`${isExpanded ? 'w-12 h-12' : 'w-10 h-10'} object-contain flex-shrink-0`}
          />
          {isExpanded && (
            <div>
              <h1 className="text-white font-semibold text-lg leading-tight">CTU Daanbantayan</h1>
              <p className="text-blue-300 text-xs">
                {user?.role === 'program_manager' && user?.program 
                  ? `${user.program} Management` 
                  : 'Management System'}
              </p>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button - Desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border-2 border-blue-600 rounded-full items-center justify-center hover:bg-blue-50 transition-colors shadow-lg z-50"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight size={14} className={`text-blue-600 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>

        {/* Navigation */}
        <div className="h-[calc(100vh-120px)] px-4 pb-4 overflow-y-auto custom-scrollbar">
          <nav className="space-y-6">
            {Object.entries(navGroups).map(([groupKey, group]) => (
              <div key={groupKey}>
                {/* Section Title */}
                {isExpanded && (
                  <div className="px-3 mb-3">
                    <h3 className="text-xs font-semibold text-blue-300 tracking-wider">
                      {group.title}
                    </h3>
                  </div>
                )}

                {/* Navigation Items */}
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 ${isExpanded ? 'px-4' : 'justify-center px-3'} py-3 rounded-lg transition-all group relative ${
                            active
                              ? 'bg-yellow-400 text-gray-900 font-medium shadow-lg'
                              : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                          }`}
                          title={isExpanded ? '' : item.name}
                        >
                          <Icon size={20} className={active ? 'text-gray-900' : 'text-blue-300'} />
                          {isExpanded && (
                            <>
                              <span className="text-sm">{item.name}</span>
                              {item.badge && (
                                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-gray-700 text-white rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                          
                          {/* Tooltip for collapsed state */}
                          {!isExpanded && (
                            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                              {item.name}
                              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Help Section at Bottom */}
          {isExpanded && (
            <div className="mt-8 px-3 py-4 bg-blue-900 rounded-lg">
              <div className="flex items-start gap-3 mb-2">
                <HelpCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-white mb-1">Need help?</h4>
                  <p className="text-xs text-blue-300 leading-relaxed">
                    Contact IT support for assistance.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Section at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-blue-900 border-t border-blue-800">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} w-full p-3 rounded-lg hover:bg-blue-800 transition-colors group relative`}
            title={isExpanded ? '' : `${user?.firstName} ${user?.lastName}`}
          >
            <div className={`flex items-center gap-3 ${isExpanded ? '' : 'justify-center'}`}>
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${user?.firstName} ${user?.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-blue-900" />
                )}
              </div>
              {isExpanded && (
                <div className="text-left">
                  <p className="text-sm font-medium text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-blue-300 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
              )}
            </div>
            {isExpanded && (
              <ChevronDown className={`w-4 h-4 text-blue-300 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            )}
            
            {/* Tooltip for collapsed state */}
            {!isExpanded && (
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 bottom-0">
                <div className="font-medium">{user?.firstName} {user?.lastName}</div>
                <div className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</div>
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </button>

          {/* Profile Dropdown */}
          {profileOpen && (
            <div className={`mt-2 bg-blue-800 rounded-lg overflow-hidden shadow-lg ${
              isExpanded ? '' : 'absolute bottom-full left-full ml-2 mb-0 w-48'
            }`}>
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-3 text-sm text-blue-100 hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setProfileOpen(false);
                  setSidebarOpen(false);
                }}
              >
                <User size={16} />
                <span>My Profile</span>
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 px-4 py-3 text-sm text-blue-100 hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setProfileOpen(false);
                  setSidebarOpen(false);
                }}
              >
                <Settings size={16} />
                <span>Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-300 hover:bg-blue-700 transition-colors border-t border-blue-700"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main content */}
      <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-72' : 'lg:ml-20'} min-h-screen`}>
        {/* Top bar for desktop - minimal */}
        <div className="hidden lg:block bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="rotate-180" />
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h2 className="text-lg font-semibold text-gray-900">
                {navGroups[Object.keys(navGroups).find(key => 
                  navGroups[key].items?.some(item => isActive(item.path))
                )]?.items?.find(item => isActive(item.path))?.name || 'Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${user?.firstName} ${user?.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {getUserRoleDisplay()}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">
                    {user?.firstName} {user?.lastName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className={`p-6 lg:p-8 mt-16 lg:mt-0 transition-all duration-500 ease-out ${
          pageReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {children}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(30, 58, 138, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(96, 165, 250, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(96, 165, 250, 0.7);
        }
      `}</style>
    </div>
  );
};

export default Layout;
