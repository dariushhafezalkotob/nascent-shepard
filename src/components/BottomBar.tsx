import React from 'react';
import {
    DoorOpen, AppWindow, Square, PenTool, LayoutTemplate,
    Sofa, PaintBucket, Sparkles, Bed, Utensils, Bath,
    Boxes, PlusCircle, FolderOpen
} from 'lucide-react';
import { FURNITURE_TEMPLATES } from '../constants/FurnitureTemplates';

interface BottomBarProps {
    activeTab: 'layout' | 'furniture' | 'surfaces' | '3d';
    setActiveTab: (tab: 'layout' | 'furniture' | 'surfaces' | '3d') => void;
    onToolSelect: (tool: 'wall' | 'select') => void;
    onOpenAI?: () => void;
    onNew?: () => void;
    onLoad?: () => void;
}

const CATEGORY_ICONS: Record<string, any> = {
    living: Sofa,
    bedroom: Bed,
    kitchen: Utensils,
    bathroom: Bath
};

export const BottomBar: React.FC<BottomBarProps> = ({
    activeTab, setActiveTab, onToolSelect, onOpenAI, onNew, onLoad
}) => {

    const tabs: { id: typeof activeTab, label: string, icon: any }[] = [
        { id: 'layout', label: 'Layout', icon: LayoutTemplate },
        { id: 'furniture', label: 'Furniture', icon: Sofa },
        { id: '3d', label: '3D View', icon: Boxes },
        { id: 'surfaces', label: 'Wall / Floor', icon: PaintBucket },
    ];

    const layoutItems = [
        { type: 'new', icon: PlusCircle, label: 'New Plan', action: onNew },
        { type: 'load', icon: FolderOpen, label: 'Load Plan', action: onLoad },
        { type: 'ai', icon: Sparkles, label: 'AI Architect', action: onOpenAI },
        { type: 'separator', isSeparator: true },
        { type: 'wall', icon: PenTool, label: 'Draw Wall', action: () => onToolSelect('wall') },
        { type: 'door', icon: DoorOpen, label: 'Door', draggable: true },
        { type: 'window', icon: AppWindow, label: 'Window', draggable: true },
        { type: 'opening', icon: Square, label: 'Void', draggable: true },
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
                        onClick={() => setActiveTab(tab.id)}
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
                {activeTab === 'layout' && layoutItems.map((item, idx) => {
                    if ('isSeparator' in item && item.isSeparator) {
                        return <div key={`sep-${idx}`} className="w-[1px] h-12 bg-zinc-200 mx-2 flex-shrink-0" />;
                    }

                    const Icon = (item as any).icon;
                    return (
                        <div
                            key={item.type}
                            draggable={(item as any).draggable}
                            onDragStart={(e) => (item as any).draggable && handleDragStart(e, item.type)}
                            onClick={(item as any).action}
                            className={`flex flex-col items-center gap-2 group min-w-[80px] ${(item as any).draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                        >
                            <div className={`w-14 h-14 border border-zinc-200 rounded-xl flex items-center justify-center bg-zinc-50 group-hover:border-black group-hover:shadow-md transition-all ${item.type === 'new' ? 'hover:bg-red-50 hover:border-red-100' : ''} ${item.type === 'load' ? 'hover:bg-blue-50 hover:border-blue-100' : ''}`}>
                                <Icon size={24} className={`text-zinc-600 group-hover:text-black ${item.type === 'new' ? 'group-hover:text-red-600' : ''} ${item.type === 'load' ? 'group-hover:text-blue-600' : ''}`} />
                            </div>
                            <span className="text-xs font-medium text-zinc-500 group-hover:text-black whitespace-nowrap">{item.label}</span>
                        </div>
                    );
                })}

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
                    <div className="text-sm text-zinc-400 italic w-full text-center font-medium">Surface materials and patterns coming soon...</div>
                )}

                {activeTab === '3d' && (
                    <div className="text-sm text-zinc-400 italic w-full text-center font-medium">3D Scene generated from your layout. Use your mouse to rotate and zoom.</div>
                )}
            </div>
        </div>
    );
};
