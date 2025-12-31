import React from 'react';
import { SURFACE_MATERIALS } from '../constants/SurfaceMaterials';
import { Layers, X } from 'lucide-react';

interface MaterialsSidebarProps {
    onClose: () => void;
}

export const MaterialsSidebar: React.FC<MaterialsSidebarProps> = ({ onClose }) => {
    const categories = ['wood', 'tile', 'stone', 'paint', 'carpet'];

    const handleDragStart = (materialId: string) => {
        (window as any).draggingMaterialId = materialId;
    };

    const handleDragEnd = () => {
        // We'll clear it after a longer delay to ensure the drop handler catches it
        setTimeout(() => {
            (window as any).draggingMaterialId = null;
        }, 500);
    };

    return (
        <div className="w-80 h-full bg-white border-l border-zinc-200 flex flex-col shadow-xl animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                <div className="flex items-center gap-2 text-indigo-600">
                    <Layers size={20} />
                    <h2 className="font-bold text-lg text-black uppercase tracking-tight">Surface Materials</h2>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-black">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {categories.map(cat => (
                    <div key={cat} className="space-y-3">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">
                            {cat}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {SURFACE_MATERIALS.filter(m => m.category === cat).map(material => (
                                <div
                                    key={material.id}
                                    draggable
                                    onDragStart={() => handleDragStart(material.id)}
                                    onDragEnd={handleDragEnd}
                                    className="group cursor-grab active:cursor-grabbing"
                                >
                                    <div
                                        className="aspect-square rounded-lg shadow-sm border border-zinc-100 group-hover:border-indigo-300 group-hover:shadow-md transition-all duration-200"
                                        style={{ backgroundColor: material.color }}
                                    />
                                    <p className="mt-1.5 text-[10px] font-semibold text-zinc-600 truncate group-hover:text-indigo-600">
                                        {material.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-indigo-50 border-t border-indigo-100">
                <p className="text-[10px] text-indigo-600 leading-relaxed font-medium">
                    <span className="font-bold">TIP:</span> Drag a material from here and drop it directly onto a wall or the floor in the 3D building view.
                </p>
            </div>
        </div>
    );
};
