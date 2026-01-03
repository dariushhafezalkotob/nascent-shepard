import React, { useState } from 'react';
import { Sparkles, DollarSign, Palette, ArrowRight, X } from 'lucide-react';

interface DecorationSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (style: string, budget: number) => void;
}

const STYLES = [
    { id: 'modern', name: 'Modern Minimalist', icon: '✨', description: 'Clean lines, neutral colors, and functional beauty.' },
    { id: 'scandinavian', name: 'Nordic Comfort', icon: '🏠', description: 'Warm wood, cozy textures, and light-filled spaces.' },
    { id: 'industrial', name: 'Industrial Loft', icon: '🧱', description: 'Raw materials, exposed elements, and bold accents.' },
    { id: 'bohemian', name: 'Boho Chic', icon: '🌿', description: 'Eclectic patterns, natural fibers, and vibrant life.' },
];

export const DecorationSetupModal: React.FC<DecorationSetupModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [style, setStyle] = useState('modern');
    const [budget, setBudget] = useState<string>('15000');

    if (!isOpen) return null;

    const handleConfirm = () => {
        const budgetNum = parseFloat(budget);
        if (isNaN(budgetNum) || budgetNum <= 0) {
            alert("Please enter a valid budget amount.");
            return;
        }
        onConfirm(style, budgetNum);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row transition-all transform animate-in zoom-in-95 duration-300">
                {/* Visual Side */}
                <div className="w-full md:w-56 bg-indigo-600 p-8 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl" />

                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <h2 className="text-2xl font-bold leading-tight">Decorate Your Space</h2>
                    </div>

                    <p className="text-indigo-100 text-sm relative z-10 mt-4 leading-relaxed">
                        Define your vision and budget, and we'll help you find the perfect pieces for your new home.
                    </p>
                </div>

                {/* Form Side */}
                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-black flex items-center gap-2">
                                <Palette size={18} className="text-indigo-600" />
                                Select Your Style
                            </h3>
                            <p className="text-xs text-zinc-500">Pick a vibe that matches your personality</p>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-black">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                        {STYLES.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setStyle(s.id)}
                                className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all text-left group ${style === s.id
                                        ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                        : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'
                                    }`}
                            >
                                <span className="text-2xl mt-1">{s.icon}</span>
                                <div>
                                    <div className={`font-bold text-sm ${style === s.id ? 'text-indigo-600' : 'text-zinc-800'}`}>
                                        {s.name}
                                    </div>
                                    <div className="text-[10px] text-zinc-500 leading-tight">
                                        {s.description}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign size={18} className="text-indigo-600" />
                            <h3 className="text-lg font-bold text-black">Total Decoration Budget</h3>
                        </div>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold group-focus-within:text-indigo-600 transition-colors">$</span>
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                className="w-full bg-zinc-50 border-2 border-zinc-100 rounded-2xl py-4 pl-10 pr-6 text-xl font-black text-black focus:outline-none focus:border-indigo-600 focus:bg-white transition-all placeholder:text-zinc-300"
                                placeholder="0.00"
                            />
                        </div>
                        <p className="mt-2 text-[10px] text-zinc-400 italic">
                            Tip: A typical 1-bedroom apartment decoration ranges from $10k to $30k.
                        </p>
                    </div>

                    <button
                        onClick={handleConfirm}
                        className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all hover:shadow-xl active:scale-95 group"
                    >
                        Save & Calculate Budget
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};
