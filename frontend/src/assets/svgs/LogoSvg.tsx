import type { FC, SVGProps } from 'react';

export const LogoSvg: FC<SVGProps<SVGSVGElement>> = (props) => {
    return (
        <svg
            viewBox="0 0 100 100"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {/* Background Fill */}
            <circle cx="50" cy="50" r="50" fill="#4f39f6" /> {/* Indigo-Primary */}
            {/* Outer Ring */}
            {/* <circle
                cx="50"
                cy="50"
                r="45"
                stroke="url(#gradient-outer)"
                strokeWidth="4"
                className="origin-center animate-[spin_10s_linear_infinite]"
            /> */}

            {/* Middle Ring - Reverse Spin */}
            <circle
                cx="50"
                cy="50"
                r="35"
                stroke="url(#gradient-inner)"
                strokeWidth="4"
                className="origin-center animate-[spin_15s_linear_infinite_reverse] opacity-80"
                strokeDasharray="160"
                strokeDashoffset="40"
                strokeLinecap="round"
                fill='transparent'
            />

            {/* Core Pulse */}
            {/* Blinking Eye */}
            <g className="origin-center animate-[pulse_3s_ease-in-out_infinite]">
                <g className="origin-center animate-[blink_4s_infinite]">
                    {/* Eye Shape */}
                    <path
                        d="M50 35C35 35 25 50 25 50C25 50 35 65 50 65C65 65 75 50 75 50C75 50 65 35 50 35Z"
                        fill="white"
                        stroke="url(#gradient-core)"
                        strokeWidth="2"
                    />
                    {/* Pupil */}
                    <circle cx="50" cy="50" r="8" fill="url(#gradient-core)" />
                </g>
            </g>

            <style>
                {`
                    @keyframes blink {
                        0%, 45%, 55%, 100% { transform: scaleY(1); }
                        50% { transform: scaleY(0.1); }
                    }
                `}
            </style>

            {/* Definitions */}
            <defs>
                <linearGradient id="gradient-outer" x1="0" y1="0" x2="100" y2="100">
                    <stop offset="0%" stopColor="#d1d1d1ff" /> {/* Indigo-400 */}
                    <stop offset="100%" stopColor="#4f39f6" /> {/* Purple-400 */}
                </linearGradient>
                <linearGradient id="gradient-inner" x1="100" y1="0" x2="0" y2="100">
                    <stop offset="0%" stopColor="#bdbdbdff" /> {/* Pink-400 */}
                    <stop offset="100%" stopColor="#4f39f6" /> {/* Indigo-300 */}
                </linearGradient>
                <linearGradient id="gradient-core" x1="50" y1="35" x2="50" y2="65">
                    <stop offset="0%" stopColor="#000" /> {/* Purple-600 */}
                    <stop offset="100%" stopColor="#925ec2ff" /> {/* Purple-500 */}
                </linearGradient>
            </defs>
        </svg>
    );
};
