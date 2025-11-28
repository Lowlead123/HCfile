
import React, { useState, ReactNode, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
// FIX: Import Permission enum
import { ViewType, ThemeSettings, TargetType, Permission } from '../types';
import { Icon, LogOutIcon, MenuIcon, XIcon } from './Icons';
import PatientList from './PatientList';
import UserManagement from './UserManagement';
import Dashboard from './Dashboard';
import AppBuilder from './AppBuilder';
import CustomPageView from './CustomPageView';

const componentMap: { [key in ViewType]: React.FC } = {
    'dashboard': Dashboard,
    'patients': PatientList,
    'user-management': UserManagement,
    'app-builder': AppBuilder,
};

const NavLink: React.FC<{ icon: ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }> = ({ icon, label, active, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-colors duration-150 ${
            active ? 'text-white bg-black bg-opacity-25' : 'text-gray-300 hover:text-white hover:bg-black hover:bg-opacity-25'
        }`}
    >
        <div className="flex items-center">
            {icon}
            <span className="ml-4">{label}</span>
        </div>
        {badge && badge > 0 ? (
             <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
        ) : null}
    </button>
);

const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '0, 0, 0';
};


const MainLayout: React.FC = () => {
    const { state, dispatch, hasPermission, refreshUserList } = useAppContext();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const accessibleNavItems = useMemo(() => {
        const customPages = state.customPages.map(page => ({
            id: page.id,
            label: page.title,
            icon: 'FileTextIcon',
            target: `custom-page-${page.id}` as TargetType,
            permission: Permission.VIEW_PATIENTS, // Default permission for custom pages
        }));
        return [...state.navigation, ...customPages].filter(item => hasPermission(item.permission));
    }, [state.navigation, state.customPages, state.currentUser, state.rolePermissions]);


    const [currentView, setCurrentView] = useState<TargetType>(accessibleNavItems[0]?.target || 'dashboard');

    // Poll for pending users if admin
    const pendingCount = useMemo(() => {
        return state.users.filter(u => u.roleId === 'pending').length;
    }, [state.users]);

    useEffect(() => {
        if(state.currentUser?.roleId === 'admin') {
            refreshUserList(); // Initial fetch
        }
    }, []);

    // Close sidebar on view change on mobile
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [currentView]);

    const pageSpecificStyle = useMemo(() => {
        return {};
    }, [currentView, state.pageThemeOverrides]);

    const handleLogout = () => {
        if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            dispatch({ type: 'LOGOUT' });
        }
    };

    const renderContent = () => {
        if (currentView.startsWith('custom-page-')) {
            const pageId = currentView.replace('custom-page-', '');
            const page = state.customPages.find(p => p.id === pageId);
            return page ? <CustomPageView page={page} /> : <NotFound />;
        }
        
        const Component = componentMap[currentView as ViewType];
        return Component ? <Component /> : <AccessDenied />;
    };
    
    const userRoleName = useMemo(() => {
        if (!state.currentUser) return '';
        const role = state.roles.find(r => r.id === state.currentUser?.roleId);
        return role ? role.name : state.currentUser.roleId;
    }, [state.currentUser, state.roles]);

    return (
        <div className="relative min-h-screen md:flex">
             {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-sidebar text-sidebar flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center justify-between px-4 font-bold text-xl border-b border-white border-opacity-20">
                    <span>HC Manager</span>
                     <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 -mr-2 text-sidebar">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <nav className="flex-grow py-5">
                    {accessibleNavItems.map(item => (
                        <NavLink 
                            key={item.id}
                            icon={<Icon name={item.icon} className="w-5 h-5" />} 
                            label={item.label} 
                            active={currentView === item.target} 
                            onClick={() => setCurrentView(item.target)}
                            badge={item.target === 'user-management' && state.currentUser?.roleId === 'admin' ? pendingCount : undefined}
                        />
                    ))}
                </nav>
                <div className="p-4 border-t border-white border-opacity-20">
                     <div className="text-sm mb-4">
                        <p className="font-semibold">{state.currentUser?.displayName || state.currentUser?.username}</p>
                        <p className="text-xs opacity-75">Role: {userRoleName}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-red-600 rounded-md transition-colors duration-150"
                    >
                        <LogOutIcon className="w-5 h-5" />
                        <span className="ml-4">ออกจากระบบ</span>
                    </button>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-x-hidden">
                 {/* Mobile Header */}
                <header className="sticky top-0 md:hidden bg-app-background border-b border-app z-10 flex items-center justify-between h-16 px-4">
                     <button onClick={() => setIsSidebarOpen(true)} className="text-app-text p-2 -ml-2">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                    <span className="text-lg font-bold text-primary">HC Manager</span>
                    <div className="w-6"></div> {/* Spacer */}
                </header>

                <main className="flex-1 overflow-y-auto" style={pageSpecificStyle}>
                    <div className="p-4 sm:p-6 md:p-8">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const AccessDenied: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
            <p className="text-app-text">You do not have permission to view this page.</p>
        </div>
    </div>
);

const NotFound: React.FC = () => (
    <div className="flex items-center justify-center h-full">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-app-text">404 - Not Found</h2>
            <p className="text-app-text-muted">The page you are looking for does not exist.</p>
        </div>
    </div>
);

export default MainLayout;
