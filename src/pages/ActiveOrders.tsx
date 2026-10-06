import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { Clock, CheckCircle2, ArrowLeft, Loader2, CreditCard, Banknote, Smartphone, ShoppingBag, Edit3, Minus, Plus, Trash2, Save } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

interface OrderItemSummary {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  addons: OrderItemAddonSummary[];
}

interface OrderItemAddonSummary {
  id: string;
  quantity: number;
  unit_price: number;
  addon_name: string;
}

interface ActiveOrder extends Order {
  items: OrderItemSummary[];
}

export const ActiveOrders: React.FC = () => {
  const navigate = useNavigate();
  const setActiveOrder = useCartStore(state => state.setActiveOrder);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOrder, setCheckoutOrder] = useState<ActiveOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<ActiveOrder | null>(null);
  const [editingItems, setEditingItems] = useState<OrderItemSummary[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCancelingOrder, setIsCancelingOrder] = useState(false);
  
  // Novo estado para controlar o desconto
  const [discount, setDiscount] = useState<number | ''>('');

  const handleAddMoreItems = (order: ActiveOrder) => {
    setActiveOrder(order.id, order.customer_name);
    navigate('/pos'); // Manda de volta pro caixa
  };

  const getItemTotal = (item: OrderItemSummary, quantity = item.quantity) => {
    const addonsTotal = item.addons.reduce(
      (total, addon) => total + addon.quantity * addon.unit_price,
      0,
    );
    return quantity * (item.unit_price + addonsTotal);
  };

  const handleOpenEditModal = (order: ActiveOrder) => {
    setEditingOrder(order);
    setEditingItems(order.items.map(item => ({ ...item, addons: [...item.addons] })));
  };

  const handleCloseEditModal = () => {
    if (isSavingEdit) return;
    setEditingOrder(null);
    setEditingItems([]);
  };

  const handleItemQuantityChange = (itemId: string, quantity: number) => {
    setEditingItems(items => items.map(item => (
      item.id === itemId
        ? { ...item, quantity: Math.max(0, Math.floor(quantity) || 0) }
        : item
    )));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setIsSavingEdit(true);

    try {
      for (const item of editingItems) {
        if (item.quantity === 0) {
          const { error: addonDeleteError } = await supabase
            .from('order_item_addons')
            .delete()
            .eq('order_item_id', item.id);

          if (addonDeleteError) throw addonDeleteError;

          const { error: itemDeleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('id', item.id);

          if (itemDeleteError) throw itemDeleteError;
        } else {
          const { error: itemUpdateError } = await supabase
            .from('order_items')
            .update({ quantity: item.quantity })
            .eq('id', item.id);

          if (itemUpdateError) throw itemUpdateError;
        }
      }

      const updatedTotal = editingItems.reduce(
        (total, item) => total + getItemTotal(item),
        0,
      );
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ total_amount: updatedTotal })
        .eq('id', editingOrder.id);

      if (orderUpdateError) throw orderUpdateError;

      const updatedItems = editingItems.filter(item => item.quantity > 0);
      const updatedOrder = { ...editingOrder, items: updatedItems, total_amount: updatedTotal };
      setOrders(ordersList => ordersList.map(order => (
        order.id === updatedOrder.id ? updatedOrder : order
      )));
      setEditingOrder(null);
      setEditingItems([]);
    } catch (error) {
      console.error('Erro ao editar comanda:', error);
      alert('Erro ao atualizar os itens da comanda.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!editingOrder) return;

    const confirmed = window.confirm(
      `Cancelar a comanda de ${editingOrder.customer_name}? Essa ação não poderá ser desfeita.`,
    );
    if (!confirmed) return;

    setIsCancelingOrder(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'canceled',
          closed_at: new Date().toISOString(),
        })
        .eq('id', editingOrder.id);

      if (error) throw error;

      setOrders(ordersList => ordersList.filter(order => order.id !== editingOrder.id));
      setEditingOrder(null);
      setEditingItems([]);
    } catch (error) {
      console.error('Erro ao cancelar comanda:', error);
      alert('Erro ao cancelar a comanda.');
    } finally {
      setIsCancelingOrder(false);
    }
  };

  const fetchOpenOrders = async () => {
    setLoading(true);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: true });

      if (orderError) throw orderError;

      const openOrders = (orderData || []) as Order[];
      if (openOrders.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = openOrders.map(order => order.id);
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, quantity, unit_price')
        .in('order_id', orderIds);

      if (itemError) throw itemError;

      const orderItems = itemData || [];
      const productIds = [...new Set(orderItems.map(item => item.product_id))];
      const { data: productData, error: productError } = productIds.length > 0
        ? await supabase
            .from('products')
            .select('id, name')
            .in('id', productIds)
        : { data: [], error: null };

      if (productError) throw productError;

      const productNames = new Map((productData || []).map(product => [product.id, product.name]));
      const itemIds = orderItems.map(item => item.id);
      const { data: addonData, error: addonError } = itemIds.length > 0
        ? await supabase
            .from('order_item_addons')
            .select('id, order_item_id, addon_product_id, quantity, unit_price')
            .in('order_item_id', itemIds)
        : { data: [], error: null };

      if (addonError) throw addonError;

      const addonProductIds = [...new Set((addonData || []).map(addon => addon.addon_product_id))];
      const { data: addonProductData, error: addonProductError } = addonProductIds.length > 0
        ? await supabase
            .from('products')
            .select('id, name')
            .in('id', addonProductIds)
        : { data: [], error: null };

      if (addonProductError) throw addonProductError;

      const addonNames = new Map((addonProductData || []).map(addon => [addon.id, addon.name]));
      const addonsByItem = new Map<string, OrderItemAddonSummary[]>();

      (addonData || []).forEach(addon => {
        const addons = addonsByItem.get(addon.order_item_id) || [];
        addons.push({
          id: addon.id,
          quantity: addon.quantity,
          unit_price: addon.unit_price,
          addon_name: addonNames.get(addon.addon_product_id) || 'Adicional não encontrado',
        });
        addonsByItem.set(addon.order_item_id, addons);
      });

      const itemsByOrder = new Map<string, OrderItemSummary[]>();

      orderItems.forEach(item => {
        const items = itemsByOrder.get(item.order_id) || [];
        items.push({
          ...item,
          product_name: productNames.get(item.product_id) || 'Produto não encontrado',
          addons: addonsByItem.get(item.id) || [],
        });
        itemsByOrder.set(item.order_id, items);
      });

      setOrders(openOrders.map(order => ({
        ...order,
        items: itemsByOrder.get(order.id) || [],
      })));
    } catch (error) {
      console.error('Erro ao buscar comandas e produtos:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpenOrders();
    const interval = setInterval(fetchOpenOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calcula o total final com o desconto aplicado
  const finalTotal = checkoutOrder 
    ? Math.max(0, checkoutOrder.total_amount - (Number(discount) || 0)) 
    : 0;

  const handlePayment = async (method: string) => {
    if (!checkoutOrder) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_method: method,
          total_amount: finalTotal, // Atualiza o banco com o valor com desconto
          closed_at: new Date().toISOString()
        })
        .eq('id', checkoutOrder.id);

      if (error) throw error;
      
      handleCloseModal();
      fetchOpenOrders();
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Erro ao fechar a comanda.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenModal = (order: ActiveOrder) => {
    setCheckoutOrder(order);
    setDiscount(''); // Zera o desconto ao abrir nova comanda
  };

  const handleCloseModal = () => {
    setCheckoutOrder(null);
    setDiscount('');
  };

  const getElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffMins = Math.floor((now - start) / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    return `${hours}h ${diffMins % 60}m`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <Link to="/pos" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao PDV
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900">Comandas Abertas</h1>
          </div>
          <button onClick={fetchOpenOrders} className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 active:scale-95 transition-all">
            Atualizar Lista
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Nenhuma comanda aberta</h2>
            <p className="text-gray-500 mt-2">Todos os clientes já foram atendidos!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800 line-clamp-1">{order.customer_name}</h3>
                    <span className="flex items-center text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded-full whitespace-nowrap">
                      <Clock className="w-4 h-4 mr-1" /> {getElapsedTime(order.created_at)}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600 mb-2">
                      <ShoppingBag className="w-4 h-4 text-pink-500" />
                      Produtos
                    </div>
                    {order.items.length > 0 ? (
                      <ul className="space-y-1.5">
                        {order.items.map(item => (
                          <li key={item.id} className="flex justify-between gap-3 text-sm text-gray-600">
                            <div className="min-w-0">
                              <div className="flex justify-between gap-3">
                                <span className="line-clamp-1">
                                  {item.quantity}x {item.product_name}
                                </span>
                                <span className="font-medium text-gray-500 whitespace-nowrap">
                                  R$ {(item.quantity * item.unit_price).toFixed(2)}
                                </span>
                              </div>
                              {item.addons.length > 0 && (
                                <ul className="mt-1 pl-3 border-l-2 border-pink-200 text-xs text-gray-500 space-y-0.5">
                                  {item.addons.map(addon => (
                                    <li key={addon.id} className="flex justify-between gap-3">
                                      <span className="line-clamp-1">+ {item.quantity * addon.quantity}x {addon.addon_name}</span>
                                      <span className="whitespace-nowrap">
                                        R$ {(item.quantity * addon.quantity * addon.unit_price).toFixed(2)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-400">Nenhum produto encontrado.</p>
                    )}
                  </div>
                  <div className="text-3xl font-black text-gray-900 mt-4">
                    R$ {order.total_amount.toFixed(2)}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 grid grid-cols-3 gap-2">
  <button
    onClick={() => handleOpenEditModal(order)}
    className="min-w-0 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-2 rounded-xl transition-colors active:scale-95 text-xs sm:text-sm whitespace-nowrap"
  >
    Editar
  </button>
  <button
    onClick={() => handleAddMoreItems(order)}
    className="min-w-0 bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-50 font-bold py-3 px-2 rounded-xl transition-colors active:scale-95 text-xs sm:text-sm whitespace-nowrap"
  >
    + Itens
  </button>
  <button
    onClick={() => handleOpenModal(order)}
    className="min-w-0 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-2 rounded-xl transition-colors active:scale-95 text-xs sm:text-sm whitespace-nowrap"
  >
    Pagar
  </button>
</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edição dos Itens */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Editar Comanda</h2>
                <p className="text-gray-500 mt-1">
                  Cliente: <span className="font-bold text-gray-800">{editingOrder.customer_name}</span>
                </p>
              </div>
              <Edit3 className="w-6 h-6 text-pink-500 flex-shrink-0" />
            </div>

            {editingItems.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhum item nesta comanda.</p>
            ) : (
              <div className="space-y-3 my-6">
                {editingItems.map(item => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 line-clamp-2">{item.product_name}</p>
                        <p className="text-sm text-gray-500">
                          R$ {item.unit_price.toFixed(2)} por unidade
                        </p>
                        {item.addons.length > 0 && (
                          <ul className="mt-2 pl-3 border-l-2 border-pink-200 text-xs text-gray-500 space-y-0.5">
                            {item.addons.map(addon => (
                              <li key={addon.id}>
                                + {addon.quantity}x {addon.addon_name} (R$ {addon.unit_price.toFixed(2)})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleItemQuantityChange(item.id, 0)}
                        className="h-9 w-9 flex-shrink-0 rounded-lg text-red-500 hover:bg-red-50"
                        aria-label={`Remover ${item.product_name}`}
                      >
                        <Trash2 className="w-5 h-5 mx-auto" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleItemQuantityChange(item.id, item.quantity - 1)}
                          className="h-9 w-9 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40"
                          disabled={item.quantity <= 0}
                          aria-label={`Diminuir quantidade de ${item.product_name}`}
                        >
                          <Minus className="w-4 h-4 mx-auto" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={event => handleItemQuantityChange(item.id, Number(event.target.value))}
                          className="w-16 rounded-lg border border-gray-300 p-2 text-center font-bold outline-none focus:ring-2 focus:ring-pink-500"
                          aria-label={`Quantidade de ${item.product_name}`}
                        />
                        <button
                          type="button"
                          onClick={() => handleItemQuantityChange(item.id, item.quantity + 1)}
                          className="h-9 w-9 rounded-lg bg-pink-100 text-pink-600 hover:bg-pink-200"
                          aria-label={`Aumentar quantidade de ${item.product_name}`}
                        >
                          <Plus className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                      <span className="font-bold text-gray-800">
                        R$ {getItemTotal(item).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
              <span className="font-bold text-gray-600">Novo total</span>
              <span className="text-2xl font-black text-pink-600">
                R$ {editingItems.reduce((total, item) => total + getItemTotal(item), 0).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
              <button
                type="button"
                disabled={isSavingEdit || isCancelingOrder}
                onClick={handleCloseEditModal}
                className="min-w-0 py-3 px-2 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingEdit || isCancelingOrder}
                onClick={handleCancelOrder}
                className="min-w-0 flex items-center justify-center gap-1 border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold py-3 px-2 rounded-xl transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
              >
                <Trash2 className="w-5 h-5" />
                <span className="sm:hidden">{isCancelingOrder ? 'Cancelando' : 'Cancelar'}</span>
                <span className="hidden sm:inline">{isCancelingOrder ? 'Cancelando...' : 'Cancelar comanda'}</span>
              </button>
              <button
                type="button"
                disabled={isSavingEdit || isCancelingOrder}
                onClick={handleSaveEdit}
                className="col-span-2 sm:col-span-1 min-w-0 flex items-center justify-center gap-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-2 rounded-xl transition-colors disabled:bg-gray-300 text-sm whitespace-nowrap"
              >
                <Save className="w-5 h-5" />
                <span className="sm:hidden">{isSavingEdit ? 'Salvando' : 'Salvar'}</span>
                <span className="hidden sm:inline">{isSavingEdit ? 'Salvando...' : 'Salvar alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {checkoutOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Finalizar Comanda</h2>
            <p className="text-gray-500 mb-6">Cliente: <span className="font-bold text-gray-800">{checkoutOrder.customer_name}</span></p>
            
            <div className="mb-8">
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-600">Itens do pedido</h3>
                <ul className="space-y-3">
                  {checkoutOrder.items.map(item => (
                    <li key={item.id} className="text-sm text-gray-700">
                      <div className="flex justify-between gap-3">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span className="font-medium whitespace-nowrap">
                          R$ {(item.quantity * item.unit_price).toFixed(2)}
                        </span>
                      </div>
                      {item.addons.length > 0 && (
                        <ul className="mt-1 pl-3 border-l-2 border-pink-200 text-xs text-gray-500 space-y-0.5">
                          {item.addons.map(addon => (
                            <li key={addon.id}>
                              + {item.quantity * addon.quantity}x {addon.addon_name} (R$ {(item.quantity * addon.quantity * addon.unit_price).toFixed(2)})
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center text-gray-500 mb-4">
                <span>Subtotal do Pedido:</span>
                <span className="text-lg">R$ {checkoutOrder.total_amount.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200 mb-6">
                <label htmlFor="discount" className="font-medium text-gray-700">Desconto (R$):</label>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-28 p-2 text-right text-lg font-bold border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="text-center pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500 uppercase tracking-widest font-semibold">Total a Pagar</span>
                <div className="text-4xl font-black text-pink-600 mt-1">
                  R$ {finalTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 mb-2">Forma de pagamento:</label>
              
              <button disabled={isProcessing} onClick={() => handlePayment('Pix')} className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group">
                <div className="flex items-center gap-3">
                  <Smartphone className="text-gray-400 group-hover:text-emerald-600" />
                  <span className="font-bold text-gray-700 group-hover:text-emerald-700">Pix</span>
                </div>
              </button>
              
              <button disabled={isProcessing} onClick={() => handlePayment('Cartão')} className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group">
                <div className="flex items-center gap-3">
                  <CreditCard className="text-gray-400 group-hover:text-blue-600" />
                  <span className="font-bold text-gray-700 group-hover:text-blue-700">Cartão (Crédito/Débito)</span>
                </div>
              </button>
              
              <button disabled={isProcessing} onClick={() => handlePayment('Dinheiro')} className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group">
                <div className="flex items-center gap-3">
                  <Banknote className="text-gray-400 group-hover:text-orange-600" />
                  <span className="font-bold text-gray-700 group-hover:text-orange-700">Dinheiro</span>
                </div>
              </button>
            </div>

            <button
              disabled={isProcessing}
              onClick={handleCloseModal}
              className="w-full mt-4 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};