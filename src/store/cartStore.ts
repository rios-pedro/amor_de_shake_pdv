import { create } from 'zustand';
import type { CartAddon, CartItem, Product } from '../types';

interface CartState {
  cart: CartItem[];
  customerName: string;
  activeOrderId: string | null; // Guarda o ID da comanda se estivermos editando
  setCustomerName: (name: string) => void;
  setActiveOrder: (orderId: string, customerName: string) => void;
  addToCart: (product: Product, quantity: number, addons: CartAddon[]) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: [],
  customerName: '',
  activeOrderId: null,

  setCustomerName: (name) => set({ customerName: name }),

  // Prepara o carrinho para adicionar itens a um cliente existente
  setActiveOrder: (orderId, customerName) => set({ 
    activeOrderId: orderId, 
    customerName: customerName, 
    cart: [] // Começa com carrinho vazio para adicionar apenas os novos itens
  }),

  addToCart: (product, quantity, addons) => {
    const addonsTotal = addons.reduce(
      (total, addon) => total + addon.product.price * addon.quantity,
      0,
    );

    const itemTotal = (product.price + addonsTotal) * quantity;

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product,
      quantity,
      addons,
      itemTotal,
    };

    set((state) => ({ cart: [...state.cart, newItem] }));
  },

  removeFromCart: (cartItemId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== cartItemId),
    })),

  // Limpa tudo (incluindo o ID da comanda) após salvar
  clearCart: () => set({ cart: [], customerName: '', activeOrderId: null }),

  getCartTotal: () =>
    get().cart.reduce((total, item) => total + item.itemTotal, 0),
}));