export type ProductCategory = 'Shakes' | 'Refeições' | 'Lanches' | 'Bebidas' | 'Adicionais' | 'Kits' | 'Outros';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  image_url?: string;
  is_active: boolean;
}

// 👇 ESTA É A INTERFACE QUE ESTÁ FALTANDO OU NÃO FOI SALVA
export interface CartAddon {
  product: Product;
  quantity: number;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  addons: CartAddon[];
  itemTotal: number;
}

export interface Order {
  id: string;
  customer_name: string;
  status: 'open' | 'paid' | 'canceled';
  payment_method?: string;
  total_amount: number;
  created_at: string;
  closed_at?: string;
}