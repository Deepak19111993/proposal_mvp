
import type { FC } from 'react';
import { LogoSvg } from '../../assets/svgs/LogoSvg';

export const Logo: FC<{ className?: string }> = ({ className = "" }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <LogoSvg className="w-10 h-10" />
            <span className="text-xl 3xl:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#4f39f6] to-purple-600">
                Prop AI
            </span>
        </div>
    );
};
