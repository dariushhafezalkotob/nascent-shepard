import React from 'react';
import { DoorOpen, AppWindow, Square, PenTool, LayoutTemplate, Sofa, PaintBucket, Sparkles, Bed, Utensils, Bath, Boxes } from 'lucide-react';
import { FURNITURE_TEMPLATES } from '../constants/FurnitureTemplates';

interface BottomBarProps {
    activeTab: 'layout' | 'furniture' | 'surfaces' | '3d';
    setActiveTab: (tab: 'layout' | 'furniture' | 'surfaces' | '3d') => void;
    onToolSelect: (tool: 'wall' | 'select') => void;
    onOpenAI?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
    living: Sofa,
    bedroom: Bed,
    kitchen: Utensils,
    bathroom: Bath
};

export const BottomBar: React.FC<BottomBarProps> = ({ activeTab, setActiveTab, onToolSelect, onOpenAI }) => {

    const tabs = [
        { id: 'layout', label: 'Layout', icon: LayoutTemplate },
        { id: 'furniture', label: 'Furniture', icon: Sofa },
        { id: '3d', label: '3D View', icon: Boxes },
        { id: 'surfaces', label: 'Wall / Floor', icon: PaintBucket },
    ];

    const layoutItems = [
        { type: 'wall', icon: PenTool, label: 'Draw Wall', action: () => onToolSelect('wall') },
        { type: 'door', icon: DoorOpen, label: 'Door', draggable: true },
        { type: 'window', icon: AppWindow, label: 'Window', draggable: true },
        { type: 'block', icon: Square, label: 'Block', draggable: true },
        { type: 'ai', icon: Sparkles, label: 'AI Architect', action: onOpenAI },
    ];

    const handleDragStart = (e: React.DragEvent, type: string, templateId?: string) => {
        e.dataTransfer.setData('application/react-dnd-type', type);
        if (templateId) {
            e.dataTransfer.setData('application/react-dnd-template', templateId);
        }
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="bg-white border-t border-zinc-200 flex flex-col text-black">
            {/* Tabs */}
            <div className="flex border-b border-zinc-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'text-black border-b-2 border-black bg-zinc-100'
                            : 'text-zinc-500 hover:text-black'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="h-28 flex items-center px-4 gap-4 overflow-x-auto p-4 scrollbar-hide">
                {activeTab === 'layout' && layoutItems.map((item) => (
                    <div
                        key={item.type}
                        draggable={item.draggable}
                        onDragStart={(e) => item.draggable && handleDragStart(e, item.type)}
                        onClick={item.action}
                        className={`flex flex-col items-center gap-2 group min-w-[80px] ${item.draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                    >
                        <div className="w-14 h-14 border border-zinc-200 rounded-xl flex items-center justify-center bg-zinc-50 group-hover:border-black group-hover:shadow-md transition-all">
                            <item.icon size={24} className="text-zinc-600 group-hover:text-black" />
                        </div>
                        <span className="text-xs font-medium text-zinc-500 group-hover:text-black whitespace-nowrap">{item.label}</span>
                    </div>
                ))}

                {activeTab === 'furniture' && FURNITURE_TEMPLATES.map((item) => {
                    const Icon = CATEGORY_ICONS[item.category] || Sofa;
                    return (
                        <div
                            key={item.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, 'furniture', item.id)}
                            className="flex flex-col items-center gap-2 group min-w-[80px] cursor-grab active:cursor-grabbing"
                        >
                            <div className="w-14 h-14 border border-zinc-200 rounded-xl flex items-center justify-center bg-zinc-50 group-hover:border-black group-hover:shadow-md transition-all">
                                <Icon size={24} className="text-zinc-600 group-hover:text-black" />
                            </div>
                            <span className="text-xs font-medium text-zinc-500 group-hover:text-black whitespace-nowrap">{item.label}</span>
                        </div>
                    );
                })}

                {activeTab === 'surfaces' && (
                    <div className="text-sm text-zinc-400 italic w-full text-center">Surface materials coming soon...</div>
                )}

                {activeTab === '3d' && (
                    <div className="text-sm text-zinc-400 italic w-full text-center">3D Scene generated from your layout. Use mouse to rotate and zoom.</div>
                )}
            </div>
        </div>
    );
};
