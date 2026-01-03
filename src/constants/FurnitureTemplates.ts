export interface FurnitureTemplate {
    id: string;
    label: string;
    category: 'living' | 'bedroom' | 'kitchen' | 'bathroom';
    width: number;
    depth: number;
    budgetWeight: number; // For budget allocation (1.0 = standard, higher = more budget)
    icon?: string; // We use name for Lucide icons
}

export const FURNITURE_TEMPLATES: FurnitureTemplate[] = [
    // Living Room
    { id: 'sofa-2', label: '2-Seater Sofa', category: 'living', width: 1.6, depth: 0.9, budgetWeight: 3.0 },
    { id: 'sofa-3', label: '3-Seater Sofa', category: 'living', width: 2.2, depth: 0.9, budgetWeight: 4.0 },
    { id: 'armchair', label: 'Armchair', category: 'living', width: 0.9, depth: 0.8, budgetWeight: 2.0 },
    { id: 'dining-table', label: 'Dining Table', category: 'living', width: 1.8, depth: 0.9, budgetWeight: 3.5 },
    { id: 'tv-stand', label: 'TV Stand', category: 'living', width: 1.5, depth: 0.4, budgetWeight: 1.5 },
    { id: 'coffee-table', label: 'Coffee Table', category: 'living', width: 1.0, depth: 0.6, budgetWeight: 1.2 },

    // Bedroom
    { id: 'bed-single', label: 'Single Bed', category: 'bedroom', width: 1.0, depth: 2.0, budgetWeight: 3.0 },
    { id: 'bed-double', label: 'Double Bed', category: 'bedroom', width: 1.6, depth: 2.0, budgetWeight: 4.5 },
    { id: 'bed-king', label: 'King Bed', category: 'bedroom', width: 2.0, depth: 2.0, budgetWeight: 6.0 },
    { id: 'nightstand', label: 'Nightstand', category: 'bedroom', width: 0.5, depth: 0.4, budgetWeight: 0.8 },
    { id: 'wardrobe', label: 'Wardrobe', category: 'bedroom', width: 1.2, depth: 0.6, budgetWeight: 3.0 },

    // Kitchen
    { id: 'fridge', label: 'Fridge', category: 'kitchen', width: 0.7, depth: 0.7, budgetWeight: 5.0 },
    { id: 'stove', label: 'Stove', category: 'kitchen', width: 0.6, depth: 0.6, budgetWeight: 3.0 },
    { id: 'sink', label: 'Sink', category: 'kitchen', width: 0.8, depth: 0.6, budgetWeight: 1.5 },
    { id: 'kitchen-island', label: 'Island', category: 'kitchen', width: 2.0, depth: 0.9, budgetWeight: 4.0 },
    { id: 'kitchen-counter', label: 'Base Cabinet (60)', category: 'kitchen', width: 0.6, depth: 0.56, budgetWeight: 1.5 },
    { id: 'kitchen-counter-45', label: 'Base Cabinet (45)', category: 'kitchen', width: 0.45, depth: 0.56, budgetWeight: 1.2 },
    { id: 'kitchen-counter-30', label: 'Base Cabinet (30)', category: 'kitchen', width: 0.3, depth: 0.56, budgetWeight: 1.0 },
    { id: 'kitchen-oven', label: 'Oven Module', category: 'kitchen', width: 0.55, depth: 0.56, budgetWeight: 4.0 },
    { id: 'kitchen-drawers-3', label: '3-Drawer Bank', category: 'kitchen', width: 0.6, depth: 0.56, budgetWeight: 2.0 },
    { id: 'kitchen-drawers-5', label: '5-Drawer Bank', category: 'kitchen', width: 0.26, depth: 0.56, budgetWeight: 1.5 },
    { id: 'kitchen-corner-base', label: 'Corner Base', category: 'kitchen', width: 0.9, depth: 0.9, budgetWeight: 2.5 },
    { id: 'kitchen-upper', label: 'Wall Cabinet (60)', category: 'kitchen', width: 0.6, depth: 0.35, budgetWeight: 1.2 },
    { id: 'kitchen-upper-45', label: 'Wall Cabinet (45)', category: 'kitchen', width: 0.45, depth: 0.35, budgetWeight: 1.0 },
    { id: 'kitchen-upper-30', label: 'Wall Cabinet (30)', category: 'kitchen', width: 0.3, depth: 0.35, budgetWeight: 0.8 },
    { id: 'kitchen-corner-upper', label: 'Corner Wall', category: 'kitchen', width: 0.6, depth: 0.6, budgetWeight: 1.8 },

    // Bathroom
    { id: 'toilet', label: 'Toilet', category: 'bathroom', width: 0.4, depth: 0.7, budgetWeight: 2.0 },
    { id: 'shower', label: 'Shower', category: 'bathroom', width: 0.9, depth: 0.9, budgetWeight: 4.0 },
    { id: 'bathtub', label: 'Bathtub', category: 'bathroom', width: 1.7, depth: 0.7, budgetWeight: 5.0 },
    { id: 'vanity', label: 'Vanity', category: 'bathroom', width: 0.8, depth: 0.5, budgetWeight: 2.5 },

    // Lighting
    { id: 'lamp-table', label: 'Table Lamp', category: 'living', width: 0.3, depth: 0.3, budgetWeight: 0.5 },
    { id: 'lamp-floor', label: 'Floor Lamp', category: 'living', width: 0.4, depth: 0.4, budgetWeight: 0.8 },
    { id: 'sofa-l', label: 'L-Sofa', category: 'living', width: 2.6, depth: 1.6, budgetWeight: 6.0 },
];
