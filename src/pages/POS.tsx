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
