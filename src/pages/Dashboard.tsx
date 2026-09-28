import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Order } from '../types';
import { ArrowLeft, TrendingUp, ShoppingBag, DollarSign, Loader2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Define a data de hoje como padrão inicial
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Ajusta o horário para pegar do início do dia 1 até o final do dia 2
    const start = `${startDate}T00:00:00.000Z`;
    const end = `${endDate}T23:59:59.999Z`;

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

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  // Cálculos das métricas
  const totalRevenue = orders.reduce((acc, order) => acc + order.total_amount, 0);
  const orderCount = orders.length;
  const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

  // Separação por método de pagamento
  const paymentMethodTotals = orders.reduce((acc, order) => {
    const method = order.payment_method || 'Outro';
    acc[method] = (acc[method] || 0) + order.total_amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <Link to="/pos" className="inline-flex items-center text-pink-500 hover:text-pink-600 mb-2 font-medium">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao PDV
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900">Dashboard de Vendas</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center px-3">
              <Calendar className="w-5 h-5 text-gray-400 mr-2" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="outline-none text-gray-700 font-medium bg-transparent"
              />
            </div>
            <span className="text-gray-300">até</span>
            <div className="flex items-center px-3">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="outline-none text-gray-700 font-medium bg-transparent"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Faturamento Total</p>
                  <p className="text-3xl font-black text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total de Pedidos</p>
                  <p className="text-3xl font-black text-gray-900">{orderCount}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ticket Médio</p>
                  <p className="text-3xl font-black text-gray-900">R$ {averageTicket.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Resumo por Forma de Pagamento */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 mb-6">Receitas por Pagamento</h3>
                {Object.keys(paymentMethodTotals).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhuma venda no período.</p>
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
                      <tr className="text-sm font-semibold text-gray-500 border-b border-gray-100">
                        <th className="pb-3">Data e Hora</th>
                        <th className="pb-3">Cliente</th>
                        <th className="pb-3">Pagamento</th>
                        <th className="pb-3 text-right">Valor Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3 text-gray-600 text-sm">
                            {new Date(order.closed_at!).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 font-medium text-gray-800">{order.customer_name}</td>
                          <td className="py-3">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
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
                          <td colSpan={4} className="py-8 text-center text-gray-500">
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
    </div>
  );
};