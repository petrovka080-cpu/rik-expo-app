/**
 * Supplier Module Types
 * Extracted from supplier.tsx for better modularity
 */

export interface Product {
    id: string;
    supplier_id: string;
    name: string;
    category: string | null;
    subcategory: string | null;
    price: number;
    unit: string;
    image_url: string | null;
    description: string | null;
    phone: string | null;
    in_stock: boolean;
}

export type ProductType = 'product' | 'service';
export type ActiveTab = 'overview' | 'catalog';
