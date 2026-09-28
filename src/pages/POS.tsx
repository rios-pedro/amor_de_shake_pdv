import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductCategory } from '../types';
import { useCartStore } from '../store/cartStore';
import { Cart } from '../components/Cart';
import { AddonModal } from '../components/AddonModal';
import { Loader2, LayoutGrid, ClipboardList, BarChart3, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const CATEGORIES: ProductCategory[] = ['Shakes', 'Refeições', 'Lanches', 'Bebidas', 'Kits', 'Outros'];

export const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  
  // Estados para o Modal de Adicionais
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const location = useLocation();
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    const element = categoryRefs.current[category];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filtra produtos principais (excluindo adicionais soltos da vitrine)
  const mainProducts = products.filter(p => p.category !== 'Adicionais');

  // Agrupa os produtos por categoria
  const groupedProducts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = mainProducts.filter(p => p.category === cat);
    return acc;
  }, {} as Record<ProductCategory, Product[]>);

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
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Cabeçalho Fixo */}
        <header className="p-6 pb-4 bg-gray-100 flex-shrink-0">
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold text-pink-600 tracking-tight">Amor dr Shake</h1>
            <p className="text-gray-500 mt-1 font-medium">Selecione os produtos por categoria</p>
          </div>

          {/* Barra de Atalhos de Categorias */}
          {!loading && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map(cat => {
                const hasItems = groupedProducts[cat]?.length > 0;
                if (!hasItems) return null;
                
                return (
                  <button
                    key={cat}
                    onClick={() => scrollToCategory(cat)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all shadow-sm ${
                      activeCategory === cat
                        ? 'bg-pink-600 text-white shadow-pink-200'
                        : 'bg-white text-gray-700 hover:bg-pink-50 hover:text-pink-600 border border-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {/* Lista de Produtos Dividida por Seções */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-8">
            {CATEGORIES.map(cat => {
              const items = groupedProducts[cat];
              if (!items || items.length === 0) return null;

              return (
                <div 
                  key={cat} 
                  ref={el => (categoryRefs.current[cat] = el)}
                  className="scroll-mt-6"
                >
                  <h2 className="text-xl font-black text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    {cat}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {items.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-300 transition-all text-left flex flex-col h-40 active:scale-95 group"
                      >
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 leading-tight text-md line-clamp-3 group-hover:text-pink-600 transition-colors">
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
                </div>
              );
            })}
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