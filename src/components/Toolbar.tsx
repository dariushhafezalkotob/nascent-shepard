import React from 'react';
import { MousePointer2, Square, DoorOpen, AppWindow } from 'lucide-react';
import type { EditorState } from '../types';

interface ToolbarProps {
    mode: EditorState['mode'];
    setMode: (mode: EditorState['mode']) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ mode, setMode }) => {
    const tools = [
        { id: 'select', icon: MousePointer2, label: 'Select' },
        { id: 'wall', icon: Square, label: 'Wall' },
        { id: 'door', icon: DoorOpen, label: 'Door' },
        { id: 'window', icon: AppWindow, label: 'Window' },
    ] as const;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 shadow-lg rounded-xl p-2 flex gap-2 border border-zinc-200 dark:border-zinc-700">
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => setMode(tool.id)}
                    className={`p-3 rounded-lg transition-all ${mode === tool.id
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                        }`}
                    title={tool.label}
                >
                    <tool.icon size={20} />
                </button>
            ))}
        </div>
    );
};
