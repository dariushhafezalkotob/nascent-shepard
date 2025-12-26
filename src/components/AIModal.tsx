import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (data: any, apiKey: string) => Promise<void>;
}

export const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onGenerate }) => {
    // Structured Form State
    const [formData, setFormData] = useState({
        type: 'Apartment',
        landWidth: '15',
        landDepth: '20',
        bedrooms: '2',
        bathrooms: '1',
        priorities: 'Maximum daylight, open kitchen concept'
    });

    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await onGenerate(formData, apiKey);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to generate layout');
        } finally {
            setIsLoading(false);
        }
    };

    const InputField = ({ label, field, placeholder, type = "text" }: { label: string, field: string, placeholder: string, type?: string }) => (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase">{label}</label>
            <input
                type={type}
                value={(formData as any)[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                placeholder={placeholder}
                className="w-full p-2 border border-zinc-200 rounded hover:border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-black transition-colors"
            />
        </div>
    );

    const SelectField = ({ label, field, options }: { label: string, field: string, options: string[] }) => (
        <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase">{label}</label>
            <select
                value={(formData as any)[field]}
                onChange={(e) => handleInputChange(field, e.target.value)}
                className="w-full p-2 border border-zinc-200 rounded hover:border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-black bg-white transition-colors"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Sparkles size={20} />
                        <h2 className="font-semibold text-lg text-black">AI Architect Studio</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded text-zinc-500 hover:text-black transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        {/* Section 1: Land Constraints */}
                        <div className="col-span-full border-b border-zinc-100 pb-2 mb-2">
                            <h3 className="text-sm font-semibold text-zinc-900">1. Land Constraints (Site)</h3>
                        </div>

                        <InputField label="Land Width (m)" field="landWidth" placeholder="15" type="number" />
                        <InputField label="Land Depth (m)" field="landDepth" placeholder="20" type="number" />

                        {/* Section 2: Apartment Requirements */}
                        <div className="col-span-full border-b border-zinc-100 pb-2 mb-2 mt-4">
                            <h3 className="text-sm font-semibold text-zinc-900">2. Apartment Program</h3>
                        </div>

                        <SelectField label="Bedroom Count" field="bedrooms" options={['1', '2', '3', '4', '5']} />
                        <SelectField label="Bathroom Count" field="bathrooms" options={['1', '2', '3']} />

                        {/* Section 3: Additional Notes */}
                        <div className="col-span-full border-b border-zinc-100 pb-2 mb-2 mt-4">
                            <h3 className="text-sm font-semibold text-zinc-900">3. Design Priorities</h3>
                        </div>
                        <div className="col-span-full">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-zinc-500 uppercase">Special Instructions</label>
                                <textarea
                                    value={formData.priorities}
                                    onChange={(e) => handleInputChange('priorities', e.target.value)}
                                    placeholder="e.g. Maximize daylight, sound insulation between bedrooms, open concept..."
                                    className="w-full p-2 border border-zinc-200 rounded hover:border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-black h-20 resize-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="mt-8 pt-4 border-t border-zinc-200">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-zinc-500 uppercase flex justify-between">
                                OpenRouter API Key
                                <span className="text-zinc-400 font-normal normal-case">(Optional)</span>
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-or-..."
                                className="w-full p-2 border border-zinc-200 rounded hover:border-zinc-300 focus:border-indigo-500 outline-none text-sm text-black font-mono"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-black hover:bg-zinc-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:shadow-md"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Designing...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                Generate Floor Plan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
