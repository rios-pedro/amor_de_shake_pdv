import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Loader2, Calendar, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrderItemAddonDetail {
  id: string;
  quantity: number;
  unit_price: number;
  addon_name: string;
}

interface OrderItemDetail {
  id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  addons: OrderItemAddonDetail[];
}

interface OrderDetail extends Order {
  items: OrderItemDetail[];
}

export const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  
  // Pega a data local correta no formato YYYY-MM-DD
  const getLocalDateString = (date = new Date()) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  };

  const todayStr = getLocalDateString();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const getDateTimeRange = (date: string, endOfDay = false) => {
    const [year, month, day] = date.split('-').map(Number);
    const localDate = endOfDay
      ? new Date(year, month - 1, day, 23, 59, 59, 999)
      : new Date(year, month - 1, day, 0, 0, 0, 0);

    return localDate.toISOString();
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Constrói o range considerando o dia inteiro no fuso local,
    // incluindo registros desde 00:00:00 até 23:59:59.999.
    const start = getDateTimeRange(startDate);
    const end = getDateTimeRange(endDate, true);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'paid')
      .gte('closed_at', start)
      .lte('closed_at', end)
      .order('closed_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar dados:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const handleOrderClick = async (order: Order) => {
    setLoadingOrderDetail(true);

    try {
      const { data: itemData, error: itemError } = await supabase
        .from('order_items')
        .select('id, product_id, quantity, unit_price')
        .eq('order_id', order.id);

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
      const addonsByItem = new Map<string, OrderItemAddonDetail[]>();

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

      setSelectedOrder({
        ...order,
        items: orderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: productNames.get(item.product_id) || 'Produto não encontrado',
          addons: addonsByItem.get(item.id) || [],
        })),
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
      alert('Não foi possível carregar os detalhes do pedido.');
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const totalRevenue = orders.reduce((acc, order) => acc + order.total_amount, 0);
  const orderCount = orders.length;
  const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

  const paymentMethodTotals = orders.reduce((acc, order) => {
    const method = order.payment_method || 'Outro';
    acc[method] = (acc[method] || 0) + order.total_amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho Responsivo */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Link to="/pos" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao PDV
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">Dashboard de Vendas</h1>
          </div>
          
          {/* Seletor de Datas Responsivo */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200 w-full md:w-auto">
            <div className="flex items-center px-2 flex-1 md:flex-initial">
              <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="outline-none text-gray-700 text-sm font-medium bg-transparent w-full"
              />
            </div>
            <span className="text-gray-300 hidden md:inline">até</span>
            <div className="flex items-center px-2 flex-1 md:flex-initial border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="outline-none text-gray-700 text-sm font-medium bg-transparent w-full"
              />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Faturamento Total</p>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total de Pedidos</p>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">{orderCount}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ticket Médio</p>
                  <p className="text-2xl md:text-3xl font-black text-gray-900">R$ {averageTicket.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Resumo por Forma de Pagamento */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Receitas por Pagamento</h3>
                {Object.keys(paymentMethodTotals).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Nenhuma venda paga no período.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(paymentMethodTotals).map(([method, amount]) => (
                      <div key={method} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                        <span className="font-bold text-gray-700">{method}</span>
                        <span className="font-black text-gray-900">R$ {amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista dos últimos pedidos do período */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Histórico do Período</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs font-semibold text-gray-400 border-b border-gray-100">
                        <th className="pb-3">Data e Hora</th>
                        <th className="pb-3">Cliente</th>
                        <th className="pb-3">Pagamento</th>
                        <th className="pb-3 text-right">Valor Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr
                          key={order.id}
                          onClick={() => handleOrderClick(order)}
                          className="border-b border-gray-50 hover:bg-pink-50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 text-gray-600 text-sm">
                            {new Date(order.closed_at!).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 font-medium text-gray-800">{order.customer_name}</td>
                          <td className="py-3">
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-bold">
                              {order.payment_method}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-gray-900 text-right">
                            R$ {order.total_amount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400 text-sm">
                            Nenhum pedido finalizado nestas datas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {loadingOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-2xl bg-white p-6 shadow-2xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-pink-500" />
            <p className="mt-3 text-sm font-medium text-gray-600">Carregando detalhes...</p>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Detalhes do Pedido</h2>
                <p className="mt-1 text-gray-500">
                  {new Date(selectedOrder.closed_at || selectedOrder.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Fechar detalhes do pedido"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cliente</p>
                <p className="font-bold text-gray-800">{selectedOrder.customer_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pagamento</p>
                <p className="font-bold text-gray-800">{selectedOrder.payment_method || 'Não informado'}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-600">
                <ShoppingBag className="h-4 w-4 text-pink-500" />
                Itens do pedido
              </h3>
              {selectedOrder.items.length > 0 ? (
                <ul className="space-y-4 rounded-xl border border-gray-200 p-4">
                  {selectedOrder.items.map(item => (
                    <li key={item.id} className="text-sm text-gray-700">
                      <div className="flex justify-between gap-3">
                        <span>{item.quantity}x {item.product_name}</span>
                        <span className="whitespace-nowrap font-semibold">
                          R$ {(item.quantity * item.unit_price).toFixed(2)}
                        </span>
                      </div>
                      {item.addons.length > 0 && (
                        <ul className="mt-1 space-y-1 border-l-2 border-pink-200 pl-3 text-xs text-gray-500">
                          {item.addons.map(addon => (
                            <li key={addon.id} className="flex justify-between gap-3">
                              <span>+ {item.quantity * addon.quantity}x {addon.addon_name}</span>
                              <span className="whitespace-nowrap">
                                R$ {(item.quantity * addon.quantity * addon.unit_price).toFixed(2)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-gray-200 p-4 text-sm text-gray-400">Nenhum item encontrado.</p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-lg font-semibold text-gray-600">Total</span>
              <span className="text-3xl font-black text-pink-600">
                R$ {selectedOrder.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};