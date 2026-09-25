import { useState, useEffect } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Product, CartAddon } from '../types';
import { supabase } from '../lib/supabase';

interface AddonModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (product: Product, quantity: number, addons: CartAddon[]) => void;
}

export function AddonModal({ product, isOpen, onClose, onConfirm }: AddonModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [availableAddons, setAvailableAddons] = useState<Product[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAddons() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Adicionais')
        .eq('is_active', true);
      
      if (!error && data) {
        setAvailableAddons(data);
      }
      setLoading(false);
    }
    
    if (isOpen) {
      fetchAddons();
      setQuantity(1);
      setSelectedAddons({});
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleAddonToggle = (addon: Product, action: 'add' | 'remove') => {
    setSelectedAddons(prev => {
      const currentQty = prev[addon.id] || 0;
      if (action === 'remove' && currentQty === 0) return prev;
      
      const newQty = action === 'add' ? currentQty + 1 : currentQty - 1;
      const updated = { ...prev };
      
      if (newQty === 0) {
        delete updated[addon.id];
      } else {
        updated[addon.id] = newQty;
      }
      return updated;
    });
  };

  const handleConfirm = () => {
    const addonsToCart: CartAddon[] = Object.entries(selectedAddons).map(([id, qty]) => {
      const addonProduct = availableAddons.find(a => a.id === id)!;
      return { product: addonProduct, quantity: qty };
    });

    onConfirm(product, quantity, addonsToCart);
    onClose();
  };

  // Calcula subtotal em tempo real no modal
  const addonsTotal = Object.entries(selectedAddons).reduce((total, [id, qty]) => {
    const addon = availableAddons.find(a => a.id === id);
    return total + ((addon?.price || 0) * qty);
  }, 0);
  const total = (product.price + addonsTotal) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-700">Quantidade do Item</h3>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 active:bg-red-200"
            >
              <Minus size={24} />
            </button>
            <span className="text-2xl font-bold">{quantity}</span>
            <button 
              onClick={() => setQuantity(q => q + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 active:bg-emerald-200"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 text-lg font-semibold text-gray-700">Adicionais</h3>
          {loading ? (
            <p>Carregando adicionais...</p>
          ) : (
            <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-2">
              {availableAddons.map(addon => (
                <div key={addon.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{addon.name}</p>
                    <p className="text-sm text-gray-500">+ R$ {addon.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleAddonToggle(addon, 'remove')}
                      className="rounded-full bg-gray-100 p-2 text-gray-600 disabled:opacity-50"
                      disabled={!selectedAddons[addon.id]}
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-4 text-center font-semibold">
                      {selectedAddons[addon.id] || 0}
                    </span>
                    <button 
                      onClick={() => handleAddonToggle(addon, 'add')}
                      className="rounded-full bg-gray-100 p-2 text-gray-600"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full rounded-lg bg-emerald-600 py-4 text-xl font-bold text-white transition-colors hover:bg-emerald-700 active:bg-emerald-800"
        >
          Confirmar - R$ {total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}