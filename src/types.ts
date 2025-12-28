export interface Point {
    x: number;
    y: number;
}

export interface Wall {
    id: string;
    start: Point;
    end: Point;
    thickness: number;
    height: number; // Wall height in mm
    isVirtual?: boolean; // If true, this is a boundary line but not a physical wall
}

export interface WallObject {
    id: string;
    wallId: string;
    type: 'door' | 'window';
    position: number; // 0 to 1 (normalized position along the wall)
    width: number;
    height: number;
    offset: number; // Distance from floor
    hinge?: 'left' | 'right'; // For doors
    openDirection?: 'in' | 'out'; // For doors
}

export interface Furniture {
    id: string;
    templateId: string;
    x: number;
    y: number;
    width: number;
    depth: number;
    rotation: number;
    label: string;
    category: 'living' | 'bedroom' | 'kitchen' | 'bathroom';
    flipX?: boolean;
    flipY?: boolean;
}

export interface RoomLabel {
    id: string;
    text: string;
    x: number;
    y: number;
}

export interface EditorState {
    walls: Wall[];
    objects: WallObject[];
    furniture: Furniture[];
    labels: RoomLabel[];
    selectedId: string | null;
    mode: 'select' | 'wall' | 'door' | 'window';
    pan: Point;
    zoom: number;
    globalWallHeight?: number; // Global height in meters (2.5 - 3.3)
}
