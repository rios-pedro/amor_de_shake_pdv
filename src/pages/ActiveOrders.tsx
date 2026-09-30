import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { ArrowLeft, Loader2, Clock, Trash2, ShoppingBag, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ActiveOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [discount, setDiscount] = useState<string>('0.00');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchActiveOrders();

    const subscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchActiveOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            subtotal,
            notes,
            products:product_id (
              name
            ),
            order_item_addons (
              id,
              quantity,
              unit_price,
              subtotal,
              products:addon_product_id (
                name
              )
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao buscar comandas ativas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    setDiscount('0.00');
    setIsPaymentModalOpen(true);
  };

  const handleFinishOrder = async (paymentMethod: string) => {
    if (!selectedOrder) return;

    const subtotal = selectedOrder.total_amount;
    const disc = parseFloat(discount) || 0;
    const finalAmount = Math.max(0, subtotal - disc);

    setProcessingId(selectedOrder.id);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          discount: disc,
          total_amount: finalAmount,
          closed_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;
      setIsPaymentModalOpen(false);
      setSelectedOrder(null);
      fetchActiveOrders();
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      alert('Erro ao finalizar o pedido.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta comanda?')) return;

    setProcessingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;
      fetchActiveOrders();
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      alert('Erro ao cancelar o pedido.');
    } finally {
      setProcessingId(null);
    }
  };

  const calculateTotalWithDiscount = () => {
    if (!selectedOrder) return 0;
    const subtotal = selectedOrder.total_amount;
    const disc = parseFloat(discount) || 0;
    return Math.max(0, subtotal - disc);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Link to="/pos" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao PDV
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Comandas Abertas</h1>
          </div>
          <div className="bg-pink-100 text-pink-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{orders.length} {orders.length === 1 ? 'comanda ativa' : 'comandas ativas'}</span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-1">Nenhuma comanda aberta no momento</h2>
            <p className="text-gray-400 text-sm">Os pedidos gerados no PDV aparecerão aqui em tempo real.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order: any) => (
              <div 
                key={order.id} 
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-400 to-pink-600" />

                <div>
                  <div className="flex justify-between items-start mb-4 pt-1">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-500 bg-pink-50 px-2.5 py-1 rounded-md">
                        Comanda #{order.id.slice(0, 4)}
                      </span>
                      <h2 className="text-xl font-black text-gray-800 mt-1">{order.customer_name || 'Cliente Balcão'}</h2>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">
                      {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="space-y-3 mb-6 max-h-56 overflow-y-auto pr-1">
                    {order.order_items?.map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                        <div className="flex justify-between items-start font-bold text-gray-800 text-sm">
                          <span>{item.quantity}x {item.products?.name || 'Produto'}</span>
                          <span className="text-gray-900">R$ {item.subtotal.toFixed(2)}</span>
                        </div>

                        {item.order_item_addons && item.order_item_addons.length > 0 && (
                          <div className="mt-1.5 pl-2 border-l-2 border-pink-200 space-y-0.5">
                            {item.order_item_addons.map((addon: any, aIdx: number) => (
                              <p key={aIdx} className="text-xs text-gray-500 flex justify-between">
                                <span>+ {addon.products?.name || 'Adicional'}</span>
                                <span>R$ {addon.subtotal.toFixed(2)}</span>
                              </p>
                            ))}
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-xs text-amber-600 bg-amber-50 p-1.5 rounded-lg mt-2 font-medium">
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center mb-4">
                    <span className="text-sm font-semibold text-gray-500">Total</span>
                    <span className="text-2xl font-black text-gray-900">R$ {order.total_amount.toFixed(2)}</span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleOpenPaymentModal(order)}
                      className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      Pagar / Fechar Comanda
                    </button>
                    <button
                      disabled={processingId === order.id}
                      onClick={() => handleCancelOrder(order.id)}
                      className="w-full py-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Cancelar Comanda
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-black text-gray-800 mb-1">Finalizar Comanda</h2>
            <p className="text-sm text-gray-500 mb-6">Cliente: <span className="font-bold text-gray-700">{selectedOrder.customer_name || 'Balcão'}</span></p>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-3 mb-6 border border-gray-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal do Pedido:</span>
                <span className="font-bold">R$ {selectedOrder.total_amount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Desconto (R$):</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-28 p-2 text-right bg-white border border-gray-300 rounded-xl font-bold text-gray-800 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-base font-extrabold text-gray-800">TOTAL A PAGAR:</span>
                <span className="text-2xl font-black text-pink-600">R$ {calculateTotalWithDiscount().toFixed(2)}</span>
              </div>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Selecione a forma de pagamento:</p>
            <div className="space-y-2">
              <button
                disabled={processingId === selectedOrder.id}
                onClick={() => handleFinishOrder('Pix')}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-sm active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === selectedOrder.id ? 'Salvando...' : 'Pix'}
              </button>
              <button
                disabled={processingId === selectedOrder.id}
                onClick={() => handleFinishOrder('Cartão')}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-sm active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === selectedOrder.id ? 'Salvando...' : 'Cartão (Crédito/Débito)'}
              </button>
              <button
                disabled={processingId === selectedOrder.id}
                onClick={() => handleFinishOrder('Dinheiro')}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all shadow-sm active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === selectedOrder.id ? 'Salvando...' : 'Dinheiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};