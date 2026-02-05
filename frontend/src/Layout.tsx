import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useLoading } from './context/LoadingContext';

export const Layout = () => {
    const location = useLocation();
    const { logout, user, token } = useAuth();
    const { loading } = useLoading();
    // Modal logic removed as it's moved to AdminUsers page

    const isActive = (path: string) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    const getLinkClass = (path: string) => {
        return isActive(path)
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
            <nav className="bg-white shadow">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="flex-shrink-0 flex items-center">
                                <Link to="/" className="text-xl font-bold text-indigo-600">Hono AI</Link>
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
                        <div className="flex items-center">
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
            </nav>
            <div className="max-w-[1600px] mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <Outlet />
            </div>
        </div>
    )
}
