import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLoading } from './context/LoadingContext';
import { Menu, X } from 'lucide-react';
import { Logo } from './components/ui/Logo';

export const Layout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const { logout, user, token } = useAuth();
    const { loading } = useLoading();
    // Modal logic removed as it's moved to AdminUsers page

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const getLinkClass = (path: string, mobile = false) => {
        const active = isActive(path);
        if (mobile) {
            return active
                ? "bg-indigo-50 border-indigo-500 text-indigo-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium";
        }
        return active
            ? "border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
            : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium";
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {loading && (
                <div className="fixed top-0 left-0 w-full z-50 h-1 bg-gray-100 overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-loading-bar shadow-[0_0_10px_#4f46e5]"></div>
                </div>
            )}
            <nav className="bg-white shadow sticky top-0 z-40">
                <div className="max-w-[1600px] 3xl:max-w-[2400px] mx-auto px-[10px] sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/">
                                    <Logo />
                                </Link>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                                {user?.role !== 'SUPER_ADMIN' && (
                                    <>
                                        <Link to="/" className={getLinkClass('/')}>
                                            Chat
                                        </Link>
                                        <Link to="/history" className={getLinkClass('/history')}>
                                            History
                                        </Link>
                                    </>
                                )}
                                <Link to="/resume" className={getLinkClass('/resume')}>
                                    Resume
                                </Link>
                                {user?.role === 'SUPER_ADMIN' && (
                                    <Link to="/users" className={getLinkClass('/users')}>
                                        Users
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center sm:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                            >
                                <span className="sr-only">Open main menu</span>
                                {isMobileMenuOpen ? (
                                    <X className="block h-6 w-6" aria-hidden="true" />
                                ) : (
                                    <Menu className="block h-6 w-6" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:items-center">
                            <span className="text-sm text-gray-500 mr-4 flex items-center">
                                {token && !user ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                                ) : (
                                    user?.name || user?.email
                                )}
                            </span>
                            <button
                                onClick={logout}
                                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                Log out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Drawer (Overlay and Slide-in menu) */}
                <div className={`fixed inset-0 z-50 sm:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>

                    {/* Drawer Content */}
                    <div className={`absolute inset-y-0 right-0 w-72 bg-white shadow-xl transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
                                <span className="text-xl font-bold text-indigo-600">Menu</span>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-500">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="flex-1 py-4 overflow-y-auto">
                                <nav className="px-2 space-y-1">
                                    {user?.role !== 'SUPER_ADMIN' && (
                                        <>
                                            <Link
                                                to="/"
                                                className={getLinkClass('/', true)}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                Chat
                                            </Link>
                                            <Link
                                                to="/history"
                                                className={getLinkClass('/history', true)}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                History
                                            </Link>
                                        </>
                                    )}
                                    <Link
                                        to="/resume"
                                        className={getLinkClass('/resume', true)}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Resume
                                    </Link>
                                    {user?.role === 'SUPER_ADMIN' && (
                                        <Link
                                            to="/users"
                                            className={getLinkClass('/users', true)}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            Users
                                        </Link>
                                    )}
                                </nav>
                            </div>

                            <div className="border-t border-gray-100 p-4">
                                <div className="flex items-center mb-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                                        {(user?.name || user?.email)?.[0].toUpperCase()}
                                    </div>
                                    <div className="ml-3 overflow-hidden">
                                        <div className="text-sm font-medium text-gray-900 truncate">{user?.name || user?.email}</div>
                                        <div className="text-xs text-gray-500 truncate">{user?.role}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <div className="max-w-[1600px] 3xl:max-w-[2400px] mx-auto md:py-12 py-8 px-[10px] sm:px-6 lg:px-8">
                <Outlet />
            </div>
        </div>
    )
}
