import React from 'react';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export const Cart: React.FC = () => {
  const { cart, customerName, setCustomerName, removeFromCart, clearCart, getCartTotal } = useCartStore();
  const total = getCartTotal();

  const handleCheckout = () => {
    if (!customerName.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (cart.length === 0) {
      alert('O carrinho está vazio.');
      return;
    }
    // TODO: Integração com Supabase para salvar o pedido
    alert(`Pedido aberto para ${customerName} com sucesso!`);
    clearCart();
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-lg rounded-l-2xl border-l border-gray-200">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
          <ShoppingBag className="w-6 h-6 text-pink-500" />
          Pedido Atual
        </h2>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Cliente</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
            <ShoppingBag className="w-12 h-12 opacity-20" />
            <p>O carrinho está vazio</p>
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
          <span className="text-lg text-gray-600">Subtotal:</span>
          <span className="text-3xl font-bold text-gray-800">R$ {total.toFixed(2)}</span>
        </div>
        <button
          onClick={handleCheckout}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          Abrir Comanda
        </button>
      </div>
    </div>
  );
};