/**
 * HISTORIAL IVA
 * Muestra el historial de cálculos IVA mensuales con gráficos y exportación
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ivaAPI } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface IVARecord {
  id: string;
  period: string;
  year: number;
  month: number;
  debitoFiscal: number;
  creditoFiscal: number;
  saldoIVA: number;
  dueDate: Date;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate?: Date;
  paidAmount?: number;
}

export const IVAHistory: React.FC = () => {
  const [records, setRecords] = useState<IVARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadHistory();
  }, [selectedYear]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await ivaAPI.getTrend(12);
      setRecords(response.data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = records.map(r => ({
    period: r.period,
    debito: r.debitoFiscal,
    credito: r.creditoFiscal,
    saldo: r.saldoIVA
  }));

  const totals = records.reduce((acc, r) => ({
    debito: acc.debito + r.debitoFiscal,
    credito: acc.credito + r.creditoFiscal,
    saldo: acc.saldo + r.saldoIVA
  }), { debito: 0, credito: 0, saldo: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Historial IVA</h1>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {[2023, 2024, 2025].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total Débito Fiscal</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(totals.debito)}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Total Crédito Fiscal</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {formatCurrency(totals.credito)}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">Saldo Total</p>
            <p className="text-2xl font-bold text-red-900 mt-1">
              {formatCurrency(totals.saldo)}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Line type="monotone" dataKey="debito" name="Débito" stroke="#3B82F6" strokeWidth={2} />
            <Line type="monotone" dataKey="credito" name="Crédito" stroke="#10B981" strokeWidth={2} />
            <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#EF4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Débito Fiscal</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Crédito Fiscal</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {record.period}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600">
                  {formatCurrency(record.debitoFiscal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                  {formatCurrency(record.creditoFiscal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                  {formatCurrency(record.saldoIVA)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    record.status === 'PAID' ? 'bg-green-100 text-green-800' :
                    record.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {record.status === 'PAID' ? 'Pagado' : 
                     record.status === 'OVERDUE' ? 'Vencido' : 'Pendiente'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    Ver Detalle
                  </button>
                  <button className="text-green-600 hover:text-green-900">
                    Descargar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IVAHistory;