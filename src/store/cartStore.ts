import { create } from 'zustand';
import type { CartAddon, CartItem, Product } from '../types';

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

  clearCart: () => set({ cart: [], customerName: '' }),

  getCartTotal: () =>
    get().cart.reduce((total, item) => total + item.itemTotal, 0),
}));
