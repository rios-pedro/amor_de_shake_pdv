# Instruções de Setup - Interface Principal do PDV

Você é um assistente de desenvolvimento. Siga os passos abaixo para criar a tela principal do Ponto de Venda e o componente do Carrinho.

## 1. Componente do Carrinho

Crie o arquivo `src/components/Cart.tsx` com o código abaixo. Este componente consumirá a nossa store do Zustand.

```tsx
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
```

## 2. Tela Principal (POS)

Crie o arquivo `src/pages/POS.tsx`. Ele vai buscar os produtos no banco e exibi-los ao lado do carrinho.

```tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { Cart } from '../components/Cart';
import { Loader2 } from 'lucide-react';

export const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const addToCart = useCartStore((state) => state.addToCart);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    // TODO: Abrir modal de adicionais no futuro. 
    // Por enquanto, adiciona direto sem adicionais.
    addToCart(product, 1, []);
  };

  const mainProducts = products.filter(p => p.category !== 'Adicionais');

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      {/* Lado Esquerdo - Vitrine */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-pink-600 tracking-tight">Amor dr Shake</h1>
          <p className="text-gray-500">Selecione os produtos para o pedido</p>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mainProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-300 transition-all text-left flex flex-col h-40 active:scale-95"
              >
                <div className="flex-1">
                  <span className="text-xs font-semibold text-pink-500 uppercase tracking-wider bg-pink-50 px-2 py-1 rounded-md">
                    {product.category}
                  </span>
                  <h3 className="mt-3 font-bold text-gray-800 leading-tight text-lg line-clamp-2">
                    {product.name}
                  </h3>
                </div>
                <div className="mt-auto">
                  <span className="text-xl font-black text-gray-900">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lado Direito - Carrinho */}
      <div className="w-96 min-w-[384px] h-full flex-shrink-0">
        <Cart />
      </div>
    </div>
  );
};
```

## 3. Atualizar Rotas (App.tsx)

Substitua o conteúdo de `src/App.tsx` para incluir o React Router e carregar a tela POS.

```tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { POS } from './pages/POS';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/pos" element={<POS />} />
        {/* Futuras rotas vão aqui */}
      </Routes>
    </Router>
  );
}

export default App;
```