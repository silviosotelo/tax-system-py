import React, { useState, useEffect } from 'react';
import { ivaAPI } from '../../services/api';

export default function IVAHistory() {
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrend();
  }, []);

  const loadTrend = async () => {
    try {
      const response = await ivaAPI.getTrend(12);
      setTrend(response.data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Historial IVA</h2>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Período</th>
            <th>Débito</th>
            <th>Crédito</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((item, idx) => (
            <tr key={idx}>
              <td>{item.period}</td>
              <td>{formatCurrency(item.debitoFiscal)}</td>
              <td>{formatCurrency(item.creditoFiscal)}</td>
              <td>{formatCurrency(item.saldoIVA)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
