import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';
import { AddonModal } from '../components/AddonModal';
// ... importar ícones do Lucide (Trash2, etc) que você já tem

export function PDV() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { cart, customerName, setCustomerName, addToCart, removeFromCart, getCartTotal, clearCart } = useCartStore();

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .neq('category', 'Adicionais') // Oculta adicionais da vitrine principal
        .eq('is_active', true);
      if (data) setProducts(data);
    }
    loadProducts();
  }, []);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Função que grava a comanda no Supabase em cascata
  const handleOpenOrder = async () => {
    if (!customerName.trim() || cart.length === 0) return alert('Preencha o nome e adicione itens.');
    setIsSaving(true);

    try {
      // 1. Cria a comanda
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{ customer_name: customerName, status: 'open', total_amount: getCartTotal() }])
        .select('id')
        .single();
      
      if (orderError) throw orderError;
      const orderId = orderData.id;

      // 2. Insere os itens e seus adicionais
      for (const cartItem of cart) {
        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .insert([{
            order_id: orderId,
            product_id: cartItem.product.id,
            quantity: cartItem.quantity,
            unit_price: cartItem.product.price
          }])
          .select('id')
          .single();

        if (itemError) throw itemError;

        // 3. Insere adicionais se houver
        if (cartItem.addons.length > 0) {
          const addonsToInsert = cartItem.addons.map(addon => ({
            order_item_id: itemData.id,
            addon_product_id: addon.product.id,
            quantity: addon.quantity,
            unit_price: addon.product.price
          }));
          
          const { error: addonError } = await supabase
            .from('order_item_addons')
            .insert(addonsToInsert);
            
          if (addonError) throw addonError;
        }
      }

      alert('Comanda aberta com sucesso!');
      clearCart();
    } catch (error) {
      console.error(error);
      alert('Erro ao abrir comanda.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Vitrine de Produtos */}
      <div className="w-2/3 overflow-y-auto p-6">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">Cardápio</h1>
        <div className="grid grid-cols-3 gap-4">
          {products.map(product => (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              className="flex h-40 flex-col items-center justify-center rounded-xl bg-white p-4 shadow-sm transition-transform active:scale-95"
            >
              <span className="text-center text-lg font-semibold">{product.name}</span>
              <span className="mt-2 text-emerald-600 font-bold">R$ {product.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Carrinho Lateral */}
      <div className="flex w-1/3 flex-col border-l bg-white shadow-xl">
        <div className="p-6">
          <h2 className="mb-4 text-2xl font-bold">Comanda</h2>
          <input
            type="text"
            placeholder="Nome do Cliente"
            className="w-full rounded-lg border p-4 text-lg outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {cart.map(item => (
            <div key={item.id} className="mb-4 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="font-bold">{item.quantity}x {item.product.name}</span>
                <span className="font-bold">R$ {item.itemTotal.toFixed(2)}</span>
              </div>
              {item.addons.map(addon => (
                <div key={addon.product.id} className="text-sm text-gray-500 ml-4 mt-1">
                  + {addon.quantity}x {addon.product.name} (R$ {(addon.product.price * addon.quantity).toFixed(2)})
                </div>
              ))}
              <button 
                onClick={() => removeFromCart(item.id)}
                className="mt-3 text-sm text-red-500 font-medium"
              >
                Remover item
              </button>
            </div>
          ))}
        </div>

        <div className="border-t bg-gray-50 p-6">
          <div className="mb-4 flex justify-between text-2xl font-bold">
            <span>Total</span>
            <span>R$ {getCartTotal().toFixed(2)}</span>
          </div>
          <button
            onClick={handleOpenOrder}
            disabled={isSaving || cart.length === 0 || !customerName.trim()}
            className="w-full rounded-xl bg-emerald-600 py-4 text-xl font-bold text-white transition disabled:bg-gray-400 active:bg-emerald-700"
          >
            {isSaving ? 'Gravando...' : 'Abrir Comanda'}
          </button>
        </div>
      </div>

      {/* Renderiza o Modal de Customização */}
      <AddonModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={addToCart}
      />
    </div>
  );
}