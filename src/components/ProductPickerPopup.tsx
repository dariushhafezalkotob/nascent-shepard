import React, { useMemo } from 'react';
import { ShoppingBag, ChevronRight, Info, DollarSign, CheckCircle2 } from 'lucide-react';
import type { Furniture, Choice } from '../types';

interface ProductPickerPopupProps {
    item: Furniture;
    allocatedBudget: number;
    totalBudget: number;
    totalSpent: number;
    style: string;
    onSelect: (choice: Choice) => void;
    onClose: () => void;
}

// Mock Product Database Creator
const getMockProducts = (category: string, style: string, budget: number): Choice[] => {
    return [
        {
            id: `${category}-1`,
            name: `${style.charAt(0).toUpperCase() + style.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)} Premium`,
            price: Math.round(budget * 1.05),
            imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=200'
        },
        {
            id: `${category}-2`,
            name: `${style.charAt(0).toUpperCase() + style.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)} Standard`,
            price: Math.round(budget * 0.85),
            imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=200'
        },
        {
            id: `${category}-3`,
            name: `${style.charAt(0).toUpperCase() + style.slice(1)} ${category.charAt(0).toUpperCase() + category.slice(1)} Budget`,
            price: Math.round(budget * 0.6),
            imageUrl: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=200'
        },
    ];
};

export const ProductPickerPopup: React.FC<ProductPickerPopupProps> = ({ item, allocatedBudget, totalBudget, totalSpent, style, onSelect, onClose }) => {
    const products = useMemo(() => getMockProducts(item.category, style, allocatedBudget), [item.category, style, allocatedBudget]);

    const savings = totalBudget - totalSpent;

    return (
        <div className="absolute top-4 right-4 z-[90] w-72 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col animate-in slide-in-from-top-4 duration-300">
            {/* Project Budget Summary */}
            <div className="bg-zinc-900 text-white p-3 flex items-center justify-between border-b border-white/10">
                <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold">Total Budget</span>
                    <span className="text-sm font-bold">${totalBudget.toLocaleString()}</span>
                </div>
                <div className="h-8 w-px bg-white/20 mx-2" />
                <div className="flex flex-col text-right">
                    <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold">Total Savings</span>
                    <span className={`text-sm font-bold ${savings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {savings >= 0 ? '+' : ''}${savings.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Smart Selection</span>
                    <button onClick={onClose} className="p-0.5 hover:bg-white/20 rounded-md transition-colors">
                        <ChevronRight size={16} />
                    </button>
                </div>
                <h3 className="font-bold text-sm truncate">{item.label}</h3>

                <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between border border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <DollarSign size={14} />
                        </div>
                        <div>
                            <div className="text-[9px] opacity-70">Item Allocation</div>
                            <div className="text-sm font-black">${allocatedBudget.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[400px]">
                <div className="flex items-center gap-2 mb-2 px-1">
                    <ShoppingBag size={12} className="text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Recommended Options</span>
                </div>

                {products.map((product) => (
                    <button
                        key={product.id}
                        onClick={() => onSelect(product)}
                        className={`w-full group relative flex items-center gap-3 p-2 rounded-xl border-2 transition-all text-left ${item.selectedChoice?.id === product.id
                            ? 'border-indigo-600 bg-indigo-50/50'
                            : 'border-transparent bg-zinc-50 hover:bg-white hover:border-zinc-200 hover:shadow-sm'
                            }`}
                    >
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-100">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-[11px] font-bold text-zinc-900 truncate pr-4">{product.name}</h4>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`text-[10px] font-black ${product.price > allocatedBudget ? 'text-red-500' : 'text-emerald-600'}`}>
                                    ${product.price.toLocaleString()}
                                </span>
                                {item.selectedChoice?.id === product.id && (
                                    <CheckCircle2 size={12} className="text-indigo-600" />
                                )}
                            </div>
                        </div>
                        {product.price > allocatedBudget && (
                            <div className="absolute top-1 right-1">
                                <Info size={10} className="text-red-400" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-zinc-50 border-t border-zinc-100 italic text-[9px] text-zinc-400 text-center leading-tight">
                Prices are estimations based on your {style} style preference.
            </div>
        </div>
    );
};
