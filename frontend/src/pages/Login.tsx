import { useState } from 'react';
import { login as apiLogin } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Input } from "../components/ui/input"
import { EyeIcon } from "../assets/svgs/EyeIcon";
import { EyeSlashIcon } from "../assets/svgs/EyeSlashIcon";

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const data = await apiLogin(email, password);
            login(data.token, data.email, data.name, data.role);
            if (data.role === 'SUPER_ADMIN') {
                navigate('/users');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 3xl:py-20">
            <div className="sm:mx-auto sm:w-full sm:max-w-md 3xl:max-w-xl">
                <h2 className="mt-6 text-center text-3xl 3xl:text-5xl font-extrabold text-gray-900 3xl:mb-8">
                    Sign in to your account
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md 3xl:max-w-xl">
                <div className="bg-white py-8 px-4 3xl:p-12 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6 3xl:space-y-10" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm 3xl:text-lg font-medium text-gray-700">Email address</label>
                            <div className="mt-1">
                                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 3xl:p-4 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 sm:text-sm 3xl:text-lg" autoComplete="email" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm 3xl:text-lg font-medium text-gray-700">Password</label>
                            <div className="mt-1 relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 3xl:p-4 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 sm:text-sm 3xl:text-lg pr-10"
                                    autoComplete="current-password"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <EyeIcon className="w-5 h-5 3xl:w-7 3xl:h-7" />
                                        ) : (
                                            <EyeSlashIcon className="w-5 h-5 3xl:w-7 3xl:h-7" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && <div className="text-red-500 text-sm 3xl:text-base">{error}</div>}

                        <div>
                            <button type="submit" className="w-full flex justify-center py-2 px-4 3xl:py-4 3xl:px-8 border border-transparent rounded-md shadow-sm text-sm 3xl:text-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200">
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
