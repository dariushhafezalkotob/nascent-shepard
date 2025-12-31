export interface Point {
    x: number;
    y: number;
}

export interface ModelPart {
    type: 'box' | 'cylinder' | 'sphere';
    args: number[]; // Dimensions: box [w, h, d], cylinder [top, bot, h], sphere [r]
    position: [number, number, number];
    rotation?: [number, number, number]; // [x, y, z] in radians
    color: string;
    opacity?: number;
    metalness?: number;
    roughness?: number;
    emissive?: string;
    emissiveIntensity?: number;
}

export interface ModelRecipe {
    parts: ModelPart[];
    description?: string;
}

export interface MaterialDefinition {
    id: string;
    name: string;
    category: 'wood' | 'tile' | 'stone' | 'paint' | 'carpet';
    color: string;
    roughness?: number;
    metalness?: number;
    textureUrl?: string; // Optional for now, using colors mostly
    realSize?: [number, number]; // [width, height] in meters for pattern repetition
    repeat?: [number, number];
}

export interface Wall {
    id: string;
    start: Point;
    end: Point;
    thickness: number;
    height: number; // Wall height in mm
    isVirtual?: boolean; // If true, this is a boundary line but not a physical wall
    materialId?: string;
    materialSideA?: string;
    materialSideB?: string;
}

export interface WallObject {
    id: string;
    wallId: string;
    type: 'door' | 'window' | 'opening';
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
    customRecipe?: ModelRecipe;
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
    mode: 'select' | 'wall' | 'door' | 'window' | 'opening';
    pan: Point;
    zoom: number;
    globalWallHeight?: number; // Global height in meters (2.5 - 3.3)
    floorMaterials?: Record<string, string>; // roomLabelId -> materialId
}
