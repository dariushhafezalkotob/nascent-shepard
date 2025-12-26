import React from 'react';
import type { Wall, WallObject } from '../types';
import { X } from 'lucide-react';

interface PropertiesPopupProps {
    selectedId: string | null;
    walls: Wall[];
    objects: WallObject[];
    updateObject: (id: string, updates: Partial<WallObject>) => void;
    updateWall: (id: string, updates: Partial<Wall>) => void;
    onClose: () => void;
}

export const PropertiesPopup: React.FC<PropertiesPopupProps> = ({
    selectedId,
    walls,
    objects,
    updateObject,
    updateWall,
    onClose,
}) => {
    if (!selectedId) return null;

    const selectedWall = walls.find((w) => w.id === selectedId);
    const selectedObject = objects.find((o) => o.id === selectedId);

    if (!selectedWall && !selectedObject) return null;

    return (
        <div className="absolute top-20 right-4 bg-white shadow-xl rounded-xl p-4 w-64 border border-zinc-200 animate-in slide-in-from-right-4 fade-in duration-200 text-black">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Properties</h3>
                <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-full">
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-4">
                {selectedWall && (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 uppercase">Thickness</label>
                            <input
                                type="number"
                                value={selectedWall.thickness}
                                onChange={(e) => updateWall(selectedWall.id, { thickness: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
                            />
                        </div>
                    </>
                )}

                {selectedObject && (
                    <>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-500 uppercase">Width</label>
                            <input
                                type="number"
                                value={selectedObject.width}
                                onChange={(e) => updateObject(selectedObject.id, { width: Number(e.target.value) })}
                                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
                            />
                        </div>
                        {selectedObject.type === 'window' && (
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-500 uppercase">Height</label>
                                <input
                                    type="number"
                                    value={selectedObject.height || 0}
                                    onChange={(e) => updateObject(selectedObject.id, { height: Number(e.target.value) })}
                                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
