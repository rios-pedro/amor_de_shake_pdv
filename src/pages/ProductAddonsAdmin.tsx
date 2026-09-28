import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { ArrowLeft, Loader2, Check, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProductAddonsAdmin: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [addons, setAddons] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [linkedAddonIds, setLinkedAddonIds] = useState<string[]>([]);
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
      // Busca produtos principais (excluindo adicionais)
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .neq('category', 'Adicionais')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // Busca todos os produtos da categoria 'Adicionais'
      const { data: addonData } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Adicionais')
        .eq('is_active', true)
        .order('name', { ascending: true });

      setProducts(prodData || []);
      setAddons(addonData || []);

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
      .from('product_addons_relation')
      .select('addon_id')
      .eq('product_id', productId);

    if (!error && data) {
      setLinkedAddonIds(data.map(r => r.addon_id));
    } else {
      setLinkedAddonIds([]);
    }
  };

  const handleToggleAddon = async (addonId: string) => {
    if (!selectedProduct) return;
    setSaving(true);

    const isLinked = linkedAddonIds.includes(addonId);

    try {
      if (isLinked) {
        // Remove o vínculo
        const { error } = await supabase
          .from('product_addons_relation')
          .delete()
          .eq('product_id', selectedProduct.id)
          .eq('addon_id', addonId);

        if (error) throw error;
        setLinkedAddonIds(prev => prev.idCode ? prev : prev.filter(id => id !== addonId));
        // Correção simples para atualizar o state local removendo o id:
        setLinkedAddonIds(prev => prev.filter(id => id !== addonId));
      } else {
        // Adiciona o vínculo
        const { error } = await supabase
          .from('product_addons_relation')
          .insert([{ product_id: selectedProduct.id, addon_id: addonId }]);

        if (error) throw error;
        setLinkedAddonIds(prev => [...prev, addonId]);
      }
    } catch (error) {
      console.error('Erro ao atualizar vínculo:', error);
      alert('Erro ao atualizar o adicional do produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <Link to="/admin/products" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para Produtos
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900">Vincular Adicionais por Produto</h1>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Lista de Produtos (Esquerda) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-[70vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-800 mb-4 px-2">Selecione o Produto</h2>
              <div className="space-y-2">
                {products.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => setSelectedProduct(prod)}
                    className={`w-full text-left p-3 rounded-xl font-medium transition-all ${
                      selectedProduct?.id === prod.id
                        ? 'bg-pink-500 text-white shadow-md shadow-pink-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <p className="font-bold line-clamp-1">{prod.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${
                      selectedProduct?.id === prod.id ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {prod.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Adicionais Disponíveis (Direita) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2 h-[70vh] flex flex-col">
              {selectedProduct ? (
                <>
                  <div className="mb-6 pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">Adicionais para: <span className="text-pink-600">{selectedProduct.name}</span></h2>
                    <p className="text-sm text-gray-500 mt-1">Marque os adicionais que o cliente pode escolher ao pedir este item.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {addons.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">Nenhum adicional cadastrado no sistema. Cadastre itens na categoria 'Adicionais' primeiro.</p>
                    ) : (
                      addons.map(addon => {
                        const isLinked = linkedAddonIds.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            disabled={saving}
                            onClick={() => handleToggleAddon(addon.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                              isLinked
                                ? 'border-pink-500 bg-pink-50/50 text-pink-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-left">
                              <p className="font-bold">{addon.name}</p>
                              <p className="text-sm text-gray-500">R$ {addon.price.toFixed(2)}</p>
                            </div>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              isLinked ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400'
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