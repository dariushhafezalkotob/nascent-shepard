import React from 'react';
import { Move, Minus, Plus, Maximize } from 'lucide-react';

interface NavigationWidgetProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
}

export const NavigationWidget: React.FC<NavigationWidgetProps> = ({ onZoomIn, onZoomOut, onReset }) => {
    return (
        <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="bg-white text-black rounded-lg shadow-xl overflow-hidden w-48 border border-zinc-200">
                <div className="bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b border-zinc-200 flex justify-between items-center">
                    <span>Navigation</span>
                    <Move size={12} className="text-zinc-500" />
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                    <div className="aspect-square bg-white rounded border border-zinc-200 relative">
                        {/* Mini-map mock */}
                        <div className="absolute inset-2 border border-zinc-300 opacity-50"></div>
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                    <div className="flex flex-col gap-1 justify-center">
                        <button
                            onClick={onZoomIn}
                            className="bg-zinc-100 hover:bg-zinc-200 text-black p-1.5 rounded flex items-center justify-center transition-colors border border-zinc-200"
                        >
                            <Plus size={14} />
                        </button>
                        <button
                            onClick={onZoomOut}
                            className="bg-zinc-100 hover:bg-zinc-200 text-black p-1.5 rounded flex items-center justify-center transition-colors border border-zinc-200"
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            onClick={onReset}
                            className="bg-zinc-100 hover:bg-zinc-200 text-black p-1.5 rounded flex items-center justify-center transition-colors border border-zinc-200"
                        >
                            <Maximize size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
