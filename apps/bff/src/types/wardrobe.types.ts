// This is a TypeScript Interface.
// It defines the "Shape" of an object.
// It acts as a contract: any object labeled as 'WardrobeItem' MUST have these properties.

export interface WardrobeItem {
    id: string; // UUID
    user_id: string; // UUID of the owner
    image_url: string; // URL to the image in storage
    category?: string; // Optional string (e.g., 'top', 'bottom')
    color?: string; // Optional string
    created_at: string; // ISO-8601 timestamp from Supabase
}

// Why is this useful?
// 1. Autocomplete: When you type "item.", VS Code will show you "image_url", "category", etc.
// 2. Safety: If you try to access "item.price", TypeScript will yell at you because it's not in the contract.
