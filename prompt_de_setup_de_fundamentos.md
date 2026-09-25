# Instruções de Setup - Fundamentos do PDV

Você é um assistente de desenvolvimento. Sua tarefa é criar quatro arquivos essenciais para o funcionamento do sistema "Amor dr Shake", inserindo o código fornecido em cada um de seus respectivos caminhos.

## 1. Variáveis de Ambiente

Crie um arquivo chamado `.env` na raiz do projeto (junto ao `package.json`) com o seguinte conteúdo:

```env
VITE_SUPABASE_URL=sua_url_do_supabase_aqui
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

## 2. Cliente do Supabase

Crie o arquivo `src/lib/supabase.ts` e insira o código abaixo:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltam as variáveis de ambiente do Supabase no arquivo .env!');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
```

## 3. Tipagens do Projeto (TypeScript)

Crie o arquivo `src/types/index.ts` e insira as definições de interface:

```typescript
export type ProductCategory = 'Shakes' | 'Adicionais' | 'Bebidas' | 'Outros';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: ProductCategory;
  image_url?: string;
  is_active: boolean;
}

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
```

## 4. Store do Carrinho (Zustand)

Crie o arquivo `src/store/cartStore.ts` e insira o código de gerenciamento de estado:

```typescript
import { create } from 'zustand';
import { CartItem, Product, CartAddon } from '../types';

interface CartState {
  cart: CartItem[];
  customerName: string;
  setCustomerName: (name: string) => void;
  addToCart: (product: Product, quantity: number, addons: CartAddon[]) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  customerName: '',
  
  setCustomerName: (name) => set({ customerName: name }),
  
  addToCart: (product, quantity, addons) => {
    const addonsTotal = addons.reduce(
      (total, addon) => total + (addon.product.price * addon.quantity), 
      0
    );
    
    const itemTotal = (product.price + addonsTotal) * quantity;
    
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product,
      quantity,
      addons,
      itemTotal
    };
    
    set((state) => ({ cart: [...state.cart, newItem] }));
  },
  
  removeFromCart: (cartItemId) => 
    set((state) => ({ cart: state.cart.filter(item => item.id !== cartItemId) })),
    
  clearCart: () => set({ cart: [], customerName: '' }),
  
  getCartTotal: () => get().cart.reduce((total, item) => total + item.itemTotal, 0)
}));
```