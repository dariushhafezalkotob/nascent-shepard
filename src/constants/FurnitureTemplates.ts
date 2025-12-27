export interface FurnitureTemplate {
    id: string;
    label: string;
    category: 'living' | 'bedroom' | 'kitchen' | 'bathroom';
    width: number;
    depth: number;
    icon?: string; // We use name for Lucide icons
}

export const FURNITURE_TEMPLATES: FurnitureTemplate[] = [
    // Living Room
    { id: 'sofa-2', label: '2-Seater Sofa', category: 'living', width: 1.6, depth: 0.9 },
    { id: 'sofa-3', label: '3-Seater Sofa', category: 'living', width: 2.2, depth: 0.9 },
    { id: 'armchair', label: 'Armchair', category: 'living', width: 0.9, depth: 0.8 },
    { id: 'dining-table', label: 'Dining Table', category: 'living', width: 1.8, depth: 0.9 },
    { id: 'tv-stand', label: 'TV Stand', category: 'living', width: 1.5, depth: 0.4 },
    { id: 'coffee-table', label: 'Coffee Table', category: 'living', width: 1.0, depth: 0.6 },

    // Bedroom
    { id: 'bed-single', label: 'Single Bed', category: 'bedroom', width: 1.0, depth: 2.0 },
    { id: 'bed-double', label: 'Double Bed', category: 'bedroom', width: 1.6, depth: 2.0 },
    { id: 'bed-king', label: 'King Bed', category: 'bedroom', width: 2.0, depth: 2.0 },
    { id: 'nightstand', label: 'Nightstand', category: 'bedroom', width: 0.5, depth: 0.4 },
    { id: 'wardrobe', label: 'Wardrobe', category: 'bedroom', width: 1.2, depth: 0.6 },

    // Kitchen
    { id: 'fridge', label: 'Fridge', category: 'kitchen', width: 0.7, depth: 0.7 },
    { id: 'stove', label: 'Stove', category: 'kitchen', width: 0.6, depth: 0.6 },
    { id: 'sink', label: 'Sink', category: 'kitchen', width: 0.8, depth: 0.5 },
    { id: 'kitchen-island', label: 'Island', category: 'kitchen', width: 2.0, depth: 0.9 },

    // Bathroom
    { id: 'toilet', label: 'Toilet', category: 'bathroom', width: 0.4, depth: 0.7 },
    { id: 'shower', label: 'Shower', category: 'bathroom', width: 0.9, depth: 0.9 },
    { id: 'bathtub', label: 'Bathtub', category: 'bathroom', width: 1.7, depth: 0.7 },
    { id: 'vanity', label: 'Vanity', category: 'bathroom', width: 0.8, depth: 0.5 },
];
