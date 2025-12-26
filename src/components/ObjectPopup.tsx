import React from 'react';
import type { WallObject } from '../types';
import { X, ArrowRightLeft, ArrowUpDown } from 'lucide-react';

interface ObjectPopupProps {
    object: WallObject;
    position: { x: number; y: number };
    variant?: 'floating' | 'sidebar';
    onUpdate: (id: string, updates: Partial<WallObject>) => void;
    onClose: () => void;
    snapshot: () => void;
}

export const ObjectPopup: React.FC<ObjectPopupProps> = ({
    object,
    position,
    variant = 'floating',
    onUpdate,
    onClose,
    snapshot
}) => {
    // Prevent click propagation to canvas
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const handleUpdate = (updates: Partial<WallObject>) => {
        snapshot();
        onUpdate(object.id, updates);
    };

    return (
        <div
            className="absolute bg-white shadow-xl rounded-lg border border-zinc-200 p-3 w-48 z-50 animate-in fade-in zoom-in-95 duration-200 text-black"
            style={{
                left: position.x,
                top: position.y,
                transform: variant === 'floating' ? 'translate(-50%, -100%) translateY(-16px)' : 'none'
            }}
            onMouseDown={handleClick}
            onClick={handleClick}
        >
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-100">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {object.type} Properties
                </span>
                <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-black transition-colors"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase flex items-center gap-1.5">
                        <ArrowRightLeft size={12} /> Width
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={object.width}
                            onChange={(e) => onUpdate(object.id, { width: Number(e.target.value) })}
                            onFocus={snapshot}
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-zinc-400">m</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500 uppercase flex items-center gap-1.5">
                        <ArrowUpDown size={12} /> Height
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={object.height || (object.type === 'door' ? 2.1 : 1.2)}
                            onChange={(e) => onUpdate(object.id, { height: Number(e.target.value) })}
                            onFocus={snapshot}
                            step="0.01"
                            className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black"
                        />
                        <span className="absolute right-2 top-1.5 text-[10px] text-zinc-400">m</span>
                    </div>
                </div>

                {object.type === 'door' && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">Hinge</label>
                            <div className="flex bg-zinc-50 rounded border border-zinc-200 p-0.5">
                                <button
                                    onClick={() => handleUpdate({ hinge: 'left' })}
                                    className={`flex-1 py-1 text-[10px] rounded ${object.hinge === 'left' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Left
                                </button>
                                <button
                                    onClick={() => handleUpdate({ hinge: 'right' })}
                                    className={`flex-1 py-1 text-[10px] rounded ${object.hinge === 'right' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Right
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-medium text-zinc-500 uppercase">Swing</label>
                            <div className="flex bg-zinc-50 rounded border border-zinc-200 p-0.5">
                                <button
                                    onClick={() => handleUpdate({ openDirection: 'in' })}
                                    className={`flex-1 py-1 text-[10px] rounded ${object.openDirection === 'in' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    In
                                </button>
                                <button
                                    onClick={() => handleUpdate({ openDirection: 'out' })}
                                    className={`flex-1 py-1 text-[10px] rounded ${object.openDirection === 'out' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-zinc-400 hover:text-zinc-600'}`}
                                >
                                    Out
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Triangle pointer */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white dark:border-t-zinc-900 drop-shadow-sm"
            />
        </div>
    );
};
