import React, { useState } from 'react';
import { X, Sparkles, Loader2, Upload } from 'lucide-react';

interface AIModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (data: any, apiKey: string) => Promise<void>;
    apiKey: string;
    setApiKey: (key: string) => void;
}

export const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onGenerate, apiKey, setApiKey }) => {
    // Structured Form State
    const [mode, setMode] = useState<'generate' | 'import'>('generate');
    const [formData, setFormData] = useState({
        projectType: 'Apartment',
        styleDirection: 'Modern',
        landWidth: '15',
        landDepth: '20',
        bedrooms: '2',
        bathrooms: '1',
        priorities: 'Maximum daylight, open kitchen concept'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [importedImage, setImportedImage] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [referenceLength, setReferenceLength] = useState<string>('12.0');
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (PNG, JPG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            const cleanBase64 = base64.split(',')[1]; // Remove data:image/png;base64,
            setImportedImage(cleanBase64);
            setPreviewUrl(base64);
            setError(null);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'import' && !importedImage) {
                throw new Error("Please upload a floor plan image first.");
            }

            const finalData = {
                ...formData,
                importedImage: mode === 'import' ? importedImage : null,
                referenceLength: mode === 'import' ? parseFloat(referenceLength) : undefined,
                mode: mode
            };
            await onGenerate(finalData, apiKey);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to process request');
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
                <div className="p-4 border-b border-zinc-200 flex flex-col gap-4 bg-zinc-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Sparkles size={20} />
                            <h2 className="font-semibold text-lg text-black">AI Architect Studio</h2>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-zinc-200 rounded text-zinc-500 hover:text-black transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex p-1 bg-zinc-200/50 rounded-lg self-start">
                        <button
                            onClick={() => setMode('generate')}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'generate' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={14} />
                                AI DESIGNER
                            </div>
                        </button>
                        <button
                            onClick={() => setMode('import')}
                            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'import' ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            <div className="flex items-center gap-1.5">
                                <Upload size={14} />
                                BLUEPRINT IMPORTER
                            </div>
                        </button>
                    </div>
                </div>

                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {mode === 'generate' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Section 1: Land Constraints */}
                            <div className="col-span-full border-b border-zinc-100 pb-2 mb-2">
                                <h3 className="text-sm font-semibold text-zinc-900">1. Land Constraints (Site)</h3>
                            </div>

                            <InputField label="Land Width (m)" field="landWidth" placeholder="15" type="number" />
                            <InputField label="Land Depth (m)" field="landDepth" placeholder="20" type="number" />

                            {/* Section 1.5: Project Type */}
                            <div className="col-span-full border-b border-zinc-100 pb-2 mb-2 mt-4">
                                <h3 className="text-sm font-semibold text-zinc-900">1.5 Project Type</h3>
                            </div>
                            <div className="col-span-full">
                                <SelectField
                                    label="Project Type"
                                    field="projectType"
                                    options={['Villa', 'Apartment', 'House', 'Multiple Floors']}
                                />
                            </div>

                            {/* Section 2: Apartment Requirements */}
                            <div className="col-span-full border-b border-zinc-100 pb-2 mb-2 mt-4">
                                <h3 className="text-sm font-semibold text-zinc-900">2. Apartment Program</h3>
                            </div>

                            <SelectField label="Bedroom Count" field="bedrooms" options={['1', '2', '3', '4', '5']} />
                            <SelectField label="Bathroom Count" field="bathrooms" options={['1', '2', '3']} />

                            {/* Section 2.5: Design Style */}
                            <div className="col-span-full border-b border-zinc-100 pb-2 mb-2 mt-4">
                                <h3 className="text-sm font-semibold text-zinc-900">2.5 Design Style</h3>
                            </div>
                            <div className="col-span-full">
                                <SelectField
                                    label="Architectural Style"
                                    field="styleDirection"
                                    options={['Modern', 'Minimalist', 'Traditional', 'Industrial', 'Scandinavian']}
                                />
                            </div>

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
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Section 1: Upload */}
                            <div className="border-b border-zinc-100 pb-2">
                                <h3 className="text-sm font-semibold text-zinc-900 italic">"The accurate way to digitize your sketches"</h3>
                                <p className="text-xs text-zinc-500 mt-1">Upload a floor plan, blueprint, or even a hand-drawn sketch.</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex-1 cursor-pointer">
                                    <div className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 transition-all ${previewUrl ? 'border-indigo-500 bg-indigo-50/30' : 'border-zinc-200 hover:border-indigo-400 hover:bg-zinc-50'}`}>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                        {previewUrl ? (
                                            <div className="relative group mx-auto">
                                                <img src={previewUrl} alt="Import Preview" className="w-48 h-48 object-contain rounded-lg shadow-lg border-2 border-white" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity text-white text-xs font-bold">
                                                    Change Blueprint
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full shadow-inner">
                                                    <Upload size={32} />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-base font-medium text-zinc-700">Drop your floor plan here</p>
                                                    <p className="text-xs text-zinc-400 mt-1">Supports PNG, JPG (High resolution recommended)</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </label>
                                {previewUrl && (
                                    <button
                                        onClick={() => { setPreviewUrl(null); setImportedImage(null); }}
                                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors bg-white rounded-full shadow-sm hover:shadow border border-zinc-100"
                                        title="Remove Image"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            {/* Section 2: Referential Scaling */}
                            <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100 flex flex-col gap-4">
                                <div className="flex items-center gap-2 text-indigo-900 border-b border-indigo-100 pb-2">
                                    <div className="w-5 h-5 flex items-center justify-center bg-indigo-600 text-white rounded-full text-[10px] font-bold">!</div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider">Referential Scaling</h4>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <p className="text-xs text-indigo-700 leading-relaxed">
                                        To find the correct size for all walls, tell the AI the length of <b>one specific wall</b> in your image (e.g., the main exterior wall or the longest room wall).
                                    </p>

                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 flex flex-col gap-1">
                                            <label className="text-[10px] font-bold text-indigo-600 uppercase">Known Wall Length (m)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={referenceLength}
                                                    onChange={(e) => setReferenceLength(e.target.value)}
                                                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg outline-none text-sm font-semibold text-indigo-900 pr-10 shadow-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-300">METERS</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1 italic">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Analyzer Behavior</label>
                                            <p className="text-[10px] text-zinc-500">The AI will use this wall as a "ruler" to scale the rest of the plan proportionally.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-4 border-t border-zinc-200">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-zinc-500 uppercase">AI Model</label>
                                <select
                                    value={(formData as any).model || 'gemini-3-flash-preview'}
                                    onChange={(e) => handleInputChange('model', e.target.value)}
                                    className="w-full p-2 border border-zinc-200 rounded hover:border-zinc-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-black bg-white transition-colors"
                                >
                                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Recommended)</option>
                                    <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image Preview</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-medium text-zinc-500 uppercase flex justify-between">
                                    Google AI Studio API Key
                                </label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your API key..."
                                    className="w-full p-2 border border-zinc-200 rounded hover:border-zinc-300 focus:border-indigo-500 outline-none text-sm text-black font-mono"
                                />
                            </div>
                        </div>
                    </div>

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
                        className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:shadow-md active:scale-95"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                {mode === 'import' ? 'Scanning Blueprint...' : 'Designing Layout...'}
                            </>
                        ) : (
                            <>
                                {mode === 'import' ? <Upload size={16} /> : <Sparkles size={16} />}
                                {mode === 'import' ? 'Digitize Floor Plan' : 'Generate Floor Plan'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
