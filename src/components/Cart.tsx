import React, { useState } from 'react';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export const Cart: React.FC = () => {
  const { cart, customerName, setCustomerName, activeOrderId, removeFromCart, clearCart, getCartTotal } = useCartStore();
  const [isSaving, setIsSaving] = useState(false);
  const total = getCartTotal();
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!customerName.trim()) return alert('Por favor, informe o nome do cliente.');
    if (cart.length === 0) return alert('O carrinho está vazio.');

    setIsSaving(true);

    try {
      let orderId = activeOrderId;

      if (!orderId) {
        // 1A. CRIA NOVA COMANDA
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([{ customer_name: customerName, status: 'open', total_amount: total }])
          .select('id')
          .single();
        
        if (orderError) throw orderError;
        orderId = orderData.id;
      } else {
        // 1B. ATUALIZA COMANDA EXISTENTE
        // Pega o valor que já estava na comanda antes
        const { data: currentOrder, error: fetchError } = await supabase
          .from('orders')
          .select('total_amount')
          .eq('id', orderId)
          .single();
          
        if (fetchError) throw fetchError;

        // Soma o valor antigo com o valor dos novos itens
        const newTotal = Number(currentOrder.total_amount) + total;

        const { error: updateError } = await supabase
          .from('orders')
          .update({ total_amount: newTotal })
          .eq('id', orderId);
          
        if (updateError) throw updateError;
      }

      // 2. Insere os novos itens (serve tanto para comanda nova quanto atualizada)
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

      alert(activeOrderId ? `Itens adicionados para ${customerName}!` : `Pedido aberto para ${customerName}!`);
      clearCart();
      
      // Se estava editando, volta pra tela de comandas após salvar
      if (activeOrderId) {
        navigate('/orders');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar comanda. Verifique o console.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-lg rounded-l-2xl border-l border-gray-200">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
          <ShoppingBag className="w-6 h-6 text-pink-500" />
          {activeOrderId ? 'Adicionando Itens' : 'Pedido Atual'}
        </h2>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Cliente</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={!!activeOrderId} // Bloqueia edição do nome se estiver adicionando à comanda existente
              placeholder="Ex: João Silva"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            />
            {activeOrderId && (
              <button 
                onClick={clearCart}
                className="px-3 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
            <ShoppingBag className="w-12 h-12 opacity-20" />
            <p>Selecione os itens</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {cart.map((item) => (
              <li key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 relative group">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {item.quantity}x {item.product.name}
                    </p>
                    {item.addons.length > 0 && (
                      <ul className="text-sm text-gray-500 mt-1 pl-2 border-l-2 border-pink-200">
                        {item.addons.map((addon, idx) => (
                          <li key={idx}>+ {addon.quantity}x {addon.product.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="font-bold text-gray-700">
                    R$ {item.itemTotal.toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <span className="text-lg text-gray-600">Total dos novos itens:</span>
          <span className="text-3xl font-bold text-gray-800">R$ {total.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          disabled={isSaving || cart.length === 0 || !customerName.trim()}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Gravando...' : (activeOrderId ? 'Atualizar Comanda' : 'Abrir Comanda')}
        </button>
      </div>
    </div>
  );
};