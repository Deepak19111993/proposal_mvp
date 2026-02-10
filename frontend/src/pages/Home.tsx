import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { askGemini } from '../api';
import { useLoading } from '../context/LoadingContext';
import { AIAnalysisLoader } from '../components/ui/AIAnalysisLoader';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Home = () => {
    const [question, setQuestion] = useState('');

    const [result, setResult] = useState<{ answer: string, question: string, fitscore?: number } | null>(null);
    const { startLoading, stopLoading, loading } = useLoading();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loadingStatus, setLoadingStatus] = useState("AI is analysing...");

    useEffect(() => {
        if (user?.role === 'SUPER_ADMIN') {
            navigate('/users');
        }
    }, [user, navigate]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (loading) {
            setLoadingStatus("Validating domain match...");
            let step = 0;
            const steps = [
                "Validating domain match...",
                "Analysing your professional profile...",
                "Aligning skills with job requirements...",
                "Drafting your comprehensive proposal...",
                "Finalizing response..."
            ];

            interval = setInterval(() => {
                step++;
                if (step < steps.length) {
                    setLoadingStatus(steps[step]);
                }
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        startLoading();
        setResult(null);
        try {
            const reqBody = { question };
            const data = await askGemini(reqBody);
            setResult(data);
            setQuestion('');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(error);
            setResult({ question, answer: error.message || 'Error connecting to server.' });
        }
        stopLoading();
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 ring-green-500/20';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 ring-yellow-500/20';
        return 'text-red-600 bg-red-100 ring-red-500/20';
    };

    const isSubmitDisabled = loading || !question.trim();
    const hasStarted = loading || result !== null;

    return (
        <div className="max-w-[900px] 3xl:max-w-[1400px] mx-auto flex flex-col gap-8 3xl:gap-16 items-start transition-all duration-700 ease-in-out">

            {/* Input Area */}
            <div className="max-w-[750px] 3xl:max-w-[1100px] w-full mx-auto space-y-8 3xl:space-y-12 transition-all duration-700 ease-in-out">
                <div className="text-center transition-all duration-700">
                    <h1 className="lg:text-5xl md:text-4xl text-3xl 3xl:text-7xl font-extrabold tracking-tight text-gray-900">
                        Proposal <span className="text-indigo-600">Generator</span>
                    </h1>
                    <p className="mt-3 text-base text-gray-500 lg:text-md md:mt-5 xl:text-xl 3xl:text-3xl 3xl:mt-8">
                        Describe your requirements, and I'll generate a detailed proposal with a compatibility score.
                    </p>
                </div>

                <div className="bg-white py-6 px-[15px] sm:px-[25px] 3xl:py-10 3xl:px-12 shadow sm:rounded-lg">
                    <form onSubmit={handleSubmit} className="space-y-6 3xl:space-y-10">
                        <div>
                            <label htmlFor="question" className="block text-sm 3xl:text-lg font-medium text-gray-700">
                                Project Requirements (Paste Job Description Here)
                            </label>
                            <div className="mt-1">
                                <textarea
                                    id="question"
                                    rows={8}
                                    className="appearance-none block w-full px-3 py-2 3xl:p-4 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm 3xl:text-xl transition-all duration-300"
                                    placeholder="E.g., I need a mobile app for a food delivery service... (Copy-paste the full job description)"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className={`w-full flex justify-center py-2 px-4 3xl:py-4 3xl:px-8 border border-transparent rounded-md shadow-sm text-sm 3xl:text-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${isSubmitDisabled ? 'opacity-75 cursor-not-allowed bg-indigo-400 hover:bg-indigo-400' : ''}`}
                            >
                                {loading ? 'Generating Proposal...' : 'Generate Proposal'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Output Area */}
            {hasStarted && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-forwards">
                    {loading && !result && (
                        <div className="space-y-6">
                            <AIAnalysisLoader status={loadingStatus} />
                        </div>
                    )}

                    {result && (
                        <div className="bg-white shadow sm:rounded-lg h-full border border-gray-100">
                            <div className="px-4 py-5 sm:px-6 3xl:p-8 border-b border-gray-200 flex justify-between items-center sticky top-[64px] bg-white z-10 shadow-sm">
                                <h3 className="text-lg 3xl:text-2xl leading-6 font-medium text-gray-900">Generated Proposal</h3>
                                {result.fitscore !== undefined && (
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 3xl:px-3 3xl:py-2 text-xs 3xl:text-base font-medium ring-1 ring-inset ${getScoreColor(result.fitscore)}`}>
                                        Fit Score: {result.fitscore}/100
                                    </span>
                                )}
                            </div>
                            <div className="px-4 py-5 sm:p-6 3xl:p-10">
                                <article className="prose prose-indigo 3xl:prose-xl max-w-none text-gray-800">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
                                </article>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
