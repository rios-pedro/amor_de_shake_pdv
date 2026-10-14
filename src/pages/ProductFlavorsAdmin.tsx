import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { ArrowLeft, Loader2, Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProductFlavorsAdmin: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [flavors, setFlavors] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [linkedFlavorIds, setLinkedFlavorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchProductRelations(selectedProduct.id);
    }
  }, [selectedProduct]);

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .neq('category', 'Adicionais')
        .neq('category', 'Sabores')
        .eq('is_active', true)
        .order('name', { ascending: true });

      const { data: flavorData } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Sabores')
        .eq('is_active', true)
        .order('name', { ascending: true });

      setProducts(prodData || []);
      setFlavors(flavorData || []);

      if (prodData && prodData.length > 0) {
        setSelectedProduct(prodData[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductRelations = async (productId: string) => {
    const { data, error } = await supabase
      .from('product_flavors_relation')
      .select('flavor_id')
      .eq('product_id', productId);

    if (!error && data) {
      setLinkedFlavorIds(data.map(r => r.flavor_id));
    } else {
      setLinkedFlavorIds([]);
    }
  };

  const handleToggleFlavor = async (flavorId: string) => {
    if (!selectedProduct) return;
    setSaving(true);

    const isLinked = linkedFlavorIds.includes(flavorId);

    try {
      if (isLinked) {
        const { error } = await supabase
          .from('product_flavors_relation')
          .delete()
          .eq('product_id', selectedProduct.id)
          .eq('flavor_id', flavorId);

        if (error) throw error;
        setLinkedFlavorIds(prev => prev.filter(id => id !== flavorId));
      } else {
        const { error } = await supabase
          .from('product_flavors_relation')
          .insert([{ product_id: selectedProduct.id, flavor_id: flavorId }]);

        if (error) throw error;
        setLinkedFlavorIds(prev => [...prev, flavorId]);
      }
    } catch (error) {
      console.error('Erro ao atualizar vínculo de sabor:', error);
      alert('Erro ao atualizar o sabor do produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <Link to="/admin/products" className="inline-flex items-center text-brand-500 hover:text-brand-600 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Produtos
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900">Vincular Sabores por Produto</h1>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-brand-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-[70vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">Selecione o Produto</h2>
              <div className="space-y-2">
                {products.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => setSelectedProduct(prod)}
                    className={`w-full text-left p-3 rounded-xl font-medium transition-all ${
                      selectedProduct?.id === prod.id
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-bold line-clamp-1">{prod.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${
                      selectedProduct?.id === prod.id ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {prod.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2 h-[70vh] flex flex-col">
              {selectedProduct ? (
                <>
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Sabores para: <span className="text-brand-600">{selectedProduct.name}</span></h2>
                    <p className="text-sm text-gray-500 mt-1">Marque os sabores disponíveis para este item.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {flavors.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Nenhum sabor cadastrado no sistema. Cadastre itens na categoria 'Sabores' primeiro.</p>
                    ) : (
                      flavors.map(flavor => {
                        const isLinked = linkedFlavorIds.includes(flavor.id);
                        return (
                          <button
                            key={flavor.id}
                            disabled={saving}
                            onClick={() => handleToggleFlavor(flavor.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                              isLinked
                                ? 'border-brand-500 bg-brand-50/50 text-brand-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-bold">{flavor.name}</p>
                              <p className="text-sm text-gray-500">{flavor.description || 'Sabor disponível para venda'}</p>
                            </div>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isLinked ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                            }`}>
                              {isLinked ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Selecione um produto ao lado
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
