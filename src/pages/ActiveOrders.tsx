import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { Clock, CheckCircle2, ArrowLeft, Loader2, CreditCard, Banknote, Smartphone, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

interface OrderItemSummary {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Novo estado para controlar o desconto
  const [discount, setDiscount] = useState<number | ''>('');

  const handleAddMoreItems = (order: ActiveOrder) => {
    setActiveOrder(order.id, order.customer_name);
    navigate('/pos'); // Manda de volta pro caixa
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
      const itemsByOrder = new Map<string, OrderItemSummary[]>();

      orderItems.forEach(item => {
        const items = itemsByOrder.get(item.order_id) || [];
        items.push({
          ...item,
          product_name: productNames.get(item.product_id) || 'Produto não encontrado',
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
                            <span className="line-clamp-1">
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className="font-medium text-gray-500 whitespace-nowrap">
                              R$ {(item.quantity * item.unit_price).toFixed(2)}
                            </span>
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
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
  <button
    onClick={() => handleAddMoreItems(order)}
    className="flex-1 bg-white border-2 border-pink-500 text-pink-500 hover:bg-pink-50 font-bold py-3 rounded-xl transition-colors active:scale-95"
  >
    + Itens
  </button>
  <button
    onClick={() => handleOpenModal(order)}
    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-colors active:scale-95"
  >
    Pagar
  </button>
</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pagamento */}
      {checkoutOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Finalizar Comanda</h2>
            <p className="text-gray-500 mb-6">Cliente: <span className="font-bold text-gray-800">{checkoutOrder.customer_name}</span></p>
            
            <div className="mb-8">
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