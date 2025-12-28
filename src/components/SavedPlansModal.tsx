import React, { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Trash2, Clock, LayoutTemplate } from 'lucide-react';
import { StorageService } from '../services/StorageService';

interface SavedPlansModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentState: any;
    onLoad: (state: any) => void;
}

export const SavedPlansModal: React.FC<SavedPlansModalProps> = ({ isOpen, onClose, currentState, onLoad }) => {
    const [plans, setPlans] = useState<{ id: string, name: string, date: number }[]>([]);
    const [newName, setNewName] = useState("");

    useEffect(() => {
        if (isOpen) {
            setPlans(StorageService.getSavedPlansList());
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!newName.trim()) return;
        StorageService.saveProject(newName, currentState);
        setPlans(StorageService.getSavedPlansList());
        setNewName("");
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this plan?")) {
            StorageService.deleteProject(id);
            setPlans(StorageService.getSavedPlansList());
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                    <div className="flex items-center gap-2">
                        <FolderOpen className="text-blue-600" size={24} />
                        <h2 className="text-xl font-bold text-zinc-900">Project Manager</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Save Current Section */}
                <div className="p-6 border-b border-zinc-100 bg-blue-50/30">
                    <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">Save Current Layout</label>
                        <div className="flex gap-2">
                            <input
                                autoFocus
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Enter plan name..."
                                className="flex-1 px-4 py-2 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                            />
                            <button
                                onClick={handleSave}
                                disabled={!newName.trim()}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
                            >
                                <Save size={18} />
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                {/* List Section */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    <h3 className="px-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">Saved Plans ({plans.length})</h3>
                    {plans.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-2xl">
                            No saved plans found.
                        </div>
                    ) : (
                        plans.sort((a, b) => b.date - a.date).map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => onLoad(StorageService.loadProject(plan.id))}
                                className="group flex items-center justify-between p-4 rounded-2xl border border-zinc-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                                        <LayoutTemplate size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-zinc-800">{plan.name}</span>
                                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                                            <Clock size={10} />
                                            {new Date(plan.date).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(plan.id, e)}
                                    className="p-2 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
