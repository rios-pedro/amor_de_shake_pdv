import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { Cart } from '../components/Cart';
import { AddonModal } from '../components/AddonModal';
import { Loader2, LayoutGrid, ClipboardList, BarChart3, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o Modal de Adicionais
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const location = useLocation();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const mainProducts = products.filter(p => p.category !== 'Adicionais');

  // Componente interno para os botões do menu
  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all ${
          isActive 
            ? 'bg-pink-500 text-white shadow-md shadow-pink-200' 
            : 'text-gray-400 hover:bg-pink-50 hover:text-pink-500'
        }`}
        title={label}
      >
        <Icon className="w-6 h-6 mb-1" />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      
      {/* Barra Lateral de Navegação (Menu) */}
      <nav className="w-24 bg-white border-r border-gray-200 flex flex-col items-center py-6 shadow-sm z-10 flex-shrink-0">
        <div className="w-14 h-14 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mb-8 shadow-inner" title="Amor dr Shake">
          <span className="font-black text-xl">AS</span>
        </div>
        
        <div className="flex flex-col gap-4 w-full px-4">
          <NavItem to="/pos" icon={LayoutGrid} label="Caixa" />
          <NavItem to="/orders" icon={ClipboardList} label="Comandas" />
          <NavItem to="/dashboard" icon={BarChart3} label="Vendas" />
        </div>
        
        <div className="mt-auto px-4 w-full">
          <NavItem to="/admin/products" icon={Settings} label="Ajustes" />
        </div>
      </nav>

      {/* Lado Esquerdo - Vitrine */}
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-pink-600 tracking-tight">Amor dr Shake</h1>
            <p className="text-gray-500 mt-1 font-medium">Selecione os produtos para o pedido</p>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {mainProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-300 transition-all text-left flex flex-col h-40 active:scale-95 group"
              >
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wider bg-pink-50 px-2 py-1 rounded-md">
                    {product.category}
                  </span>
                  <h3 className="mt-3 font-bold text-gray-800 leading-tight text-md line-clamp-3 group-hover:text-pink-600 transition-colors">
                    {product.name}
                  </h3>
                </div>
                <div className="mt-auto pt-2 border-t border-gray-50">
                  <span className="text-lg font-black text-gray-900">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lado Direito - Carrinho */}
      <div className="w-96 min-w-[384px] h-full flex-shrink-0 z-20 shadow-2xl">
        <Cart />
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
};