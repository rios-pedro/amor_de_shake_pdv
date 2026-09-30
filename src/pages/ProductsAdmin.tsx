import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, ProductCategory } from '../types';
import { Plus, Edit2, Trash2, ArrowLeft, Loader2, Image as ImageIcon, Upload, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const CATEGORIES: ProductCategory[] = ['Shakes', 'Refeições', 'Lanches', 'Bebidas', 'Adicionais', 'Kits', 'Outros'];

export const ProductsAdmin: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'Shakes' as ProductCategory,
    is_active: true,
    image_url: ''
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Estados para o Cropper de Imagem
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<any>({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
  const [completedCrop, setCompletedCrop] = useState<any>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar produtos:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        category: product.category,
        is_active: product.is_active,
        image_url: product.image_url || ''
      });
      setImagePreview(product.image_url || '');
      setEditingId(product.id);
    } else {
      setFormData({ name: '', price: '', category: 'Shakes', is_active: true, image_url: '' });
      setImagePreview('');
      setEditingId(null);
    }
    setCroppedImageBlob(null);
    setIsModalOpen(true);
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
      const reader = new FileReader();
      reader.onload = () => {
        setImgSrc(reader.result?.toString() || '');
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleConfirmCrop = async () => {
    const image = imgRef.current;
    if (!image || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      setIsCropperOpen(false);
      return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      500,
      500
    );

    canvas.toBlob((blob) => {
      if (blob) {
        setCroppedImageBlob(blob);
        setImagePreview(URL.createObjectURL(blob));
      }
      setIsCropperOpen(false);
    }, 'image/jpeg', 0.9);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let imageUrl = formData.image_url;

      if (croppedImageBlob) {
        const fileName = `prod_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, croppedImageBlob, { contentType: 'image/jpeg', upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;
      }

      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        is_active: formData.is_active,
        image_url: imageUrl || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar o produto com a imagem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const confirmMessage = currentStatus 
      ? 'Deseja desativar este produto? Ele não aparecerá mais no PDV.' 
      : 'Deseja reativar este produto?';
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      fetchProducts();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do produto.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Cabeçalho Responsivo */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Link to="/pos" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao PDV
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Gerenciar Produtos</h1>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3 w-full md:w-auto">
            <Link
              to="/admin/product-addons"
              className="flex-1 md:flex-initial text-center bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-50 px-4 py-2.5 md:px-5 md:py-3 rounded-xl font-bold shadow-sm transition-all text-sm active:scale-95"
            >
              Vincular Adicionais
            </Link>
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-bold shadow-sm transition-all text-sm active:scale-95"
            >
              <Plus className="w-5 h-5" /> Novo Produto
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Visualização em Tabela para Tablets e Computadores (hidden no mobile) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 font-semibold text-gray-600 w-16">Foto</th>
                    <th className="p-4 font-semibold text-gray-600">Nome do Produto</th>
                    <th className="p-4 font-semibold text-gray-600">Categoria</th>
                    <th className="p-4 font-semibold text-gray-600">Preço</th>
                    <th className="p-4 font-semibold text-gray-600">Status</th>
                    <th className="p-4 font-semibold text-gray-600 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-xl border border-gray-200" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-medium text-gray-800">{product.name}</td>
                      <td className="p-4">
                        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                          {product.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-gray-700">R$ {product.price.toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {product.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 flex justify-end gap-2 items-center h-20">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            product.is_active 
                              ? 'text-red-500 hover:bg-red-50' 
                              : 'text-emerald-500 hover:bg-emerald-50'
                          }`}
                          title={product.is_active ? "Desativar" : "Reativar"}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visualização em Cards para Celulares (visível apenas no mobile) */}
            <div className="md:hidden space-y-3">
              {products.map((product) => (
                <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-xl border border-gray-200 flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium">
                          {product.category}
                        </span>
                        <span className="font-black text-gray-900 text-xs">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </div>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {product.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleOpenModal(product)}
                      className="p-2 text-blue-600 bg-blue-50 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(product.id, product.is_active)}
                      className={`p-2 rounded-xl transition-colors ${
                        product.is_active ? 'text-red-500 bg-red-50' : 'text-emerald-500 bg-emerald-50'
                      }`}
                      title={product.is_active ? "Desativar" : "Reativar"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de Recorte Interativo (Cropper) */}
      {isCropperOpen && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl flex flex-col items-center">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Ajustar Enquadramento (1:1)</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">Arraste e redimensione a área de corte para escolher a melhor parte da foto.</p>
            
            <div className="max-h-[60vh] overflow-auto flex justify-center w-full bg-gray-900 rounded-xl p-2 mb-6">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
              >
                <img ref={imgRef} src={imgSrc} alt="Ajustar" className="max-h-[50vh]" />
              </ReactCrop>
            </div>

            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setIsCropperOpen(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCrop}
                className="flex-1 px-4 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Check className="w-5 h-5" /> Confirmar Recorte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação/Edição */}
      {isModalOpen && !isCropperOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto do Produto (Opcional - Proporção 1:1)</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleSelectFile}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors text-sm"
                    >
                      <Upload className="w-4 h-4" /> Escolher Foto
                    </button>
                    <p className="text-xs text-gray-400 mt-1">Você poderá ajustar o corte ao selecionar.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                  placeholder="Ex: Shake de Morango"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                    placeholder="18.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value as ProductCategory})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white text-sm"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 text-pink-500 rounded focus:ring-pink-500"
                />
                <label htmlFor="isActive" className="font-medium text-gray-700 cursor-pointer text-sm">
                  Produto Ativo (Aparece no PDV)
                </label>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-3 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-50 text-sm"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};