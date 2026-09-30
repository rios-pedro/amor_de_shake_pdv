import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductCategory } from '../types';
import { useCartStore } from '../store/cartStore';
import { Cart } from '../components/Cart';
import { AddonModal } from '../components/AddonModal';
import { Loader2, LayoutGrid, ClipboardList, BarChart3, Settings, ShoppingBag, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const CATEGORIES: ProductCategory[] = ['Shakes', 'Refeições', 'Lanches', 'Bebidas', 'Kits', 'Outros'];

export const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  
  // Estados para o Modal de Adicionais
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cart = useCartStore((state) => state.cart);
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

  const mainProducts = products.filter(p => p.category !== 'Adicionais');
  const groupedProducts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = mainProducts.filter(p => p.category === cat);
    return acc;
  }, {} as Record<ProductCategory, Product[]>);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex flex-col md:flex-col items-center justify-center w-full md:w-16 h-14 md:h-16 rounded-xl md:rounded-2xl transition-all ${
          isActive 
            ? 'bg-pink-500 text-white shadow-md shadow-pink-200' 
            : 'text-gray-400 hover:bg-pink-50 hover:text-pink-500'
        }`}
        title={label}
      >
        <Icon className="w-5 h-5 md:w-6 md:h-6 mb-0.5 md:mb-1" />
        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100 overflow-hidden">
      
      {/* Menu Lateral (Desktop) / Barra Inferior (Mobile) */}
      <nav className="order-last md:order-first w-full md:w-24 bg-white border-t md:border-t-0 md:border-r border-gray-200 flex md:flex-col items-center justify-around md:justify-start py-2 md:py-6 shadow-lg md:shadow-sm z-30 flex-shrink-0">
        <div className="hidden md:flex w-14 h-14 bg-pink-100 text-pink-600 rounded-full items-center justify-center mb-8 shadow-inner" title="Amor de Shake">
          <span className="font-black text-xl">AS</span>
        </div>
        
        <div className="flex md:flex-col gap-2 md:gap-4 w-full px-2 md:px-4 justify-around md:justify-start">
          <NavItem to="/pos" icon={LayoutGrid} label="Caixa" />
          <NavItem to="/orders" icon={ClipboardList} label="Comandas" />
          <NavItem to="/dashboard" icon={BarChart3} label="Vendas" />
        </div>
        
        <div className="hidden md:flex mt-auto px-4 w-full">
          <NavItem to="/admin/products" icon={Settings} label="Ajustes" />
        </div>
      </nav>

      {/* Lado Esquerdo - Vitrine de Produtos */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        {/* Cabeçalho Fixo */}
        <header className="p-4 md:p-6 pb-4 bg-gray-100 flex-shrink-0">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-pink-600 tracking-tight">Amor de Shake</h1>
              <p className="text-gray-500 text-sm md:text-base mt-0.5 font-medium">Selecione os produtos por categoria</p>
            </div>
            {/* Atalho de Ajustes visível apenas no mobile */}
            <Link to="/admin/products" className="md:hidden p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-600">
              <Settings className="w-5 h-5" />
            </Link>
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
                    className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all shadow-sm ${
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
          <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-0 space-y-8">
            {CATEGORIES.map(cat => {
              const items = groupedProducts[cat];
              if (!items || items.length === 0) return null;

              return (
                <div 
                  key={cat} 
                  ref={el => { categoryRefs.current[cat] = el; }}
                  className="scroll-mt-6"
                >
                  <h2 className="text-lg md:text-xl font-black text-gray-800 mb-4 border-b border-gray-200 pb-2">
                    {cat}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                    {items.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-pink-300 transition-all text-left flex flex-col overflow-hidden h-48 md:h-52 active:scale-95 group"
                      >
                        {product.image_url ? (
                          <div className="w-full h-20 md:h-24 bg-gray-100 overflow-hidden">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          </div>
                        ) : (
                          <div className="w-full h-10 md:h-12 bg-pink-50/50 flex items-center px-3">
                            <span className="text-[9px] md:text-[10px] font-bold text-pink-500 uppercase tracking-wider">
                              {product.category}
                            </span>
                          </div>
                        )}

                        <div className="p-2.5 md:p-3 flex-1 flex flex-col justify-between">
                          <h3 className="font-bold text-gray-800 leading-tight text-xs md:text-sm line-clamp-2 group-hover:text-pink-600 transition-colors">
                            {product.name}
                          </h3>
                          <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-xs md:text-sm font-black text-gray-900">
                              R$ {product.price.toFixed(2)}
                            </span>
                          </div>
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

      {/* Botão Flutuante de Carrinho (Apenas visível no Mobile quando há itens) */}
      {totalCartItems > 0 && (
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="md:hidden fixed bottom-20 right-4 bg-pink-600 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 z-40 active:scale-95 transition-all font-bold"
        >
          <ShoppingBag className="w-6 h-6" />
          <span>Ver Carrinho ({totalCartItems})</span>
        </button>
      )}

      {/* Lado Direito - Carrinho (Fixo no Desktop / Gaveta Flutuante no Mobile) */}
      <div className={`
        fixed md:relative inset-y-0 right-0 z-50 w-full sm:w-96 md:w-96 min-w-[320px] md:min-w-[384px] h-full flex-shrink-0 shadow-2xl transition-transform duration-300 bg-white
        ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {/* Botão de Fechar Carrinho no Mobile */}
        <button 
          onClick={() => setIsMobileCartOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-600 z-10"
        >
          <X className="w-6 h-6" />
        </button>
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