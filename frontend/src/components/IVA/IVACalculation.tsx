import React, { useState, useEffect } from 'react';
import { ivaAPI } from '../../services/api';
import Button from '../Shared/Button';

export default function IVACalculation() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateIVA = async () => {
    setLoading(true);
    try {
      const response = await ivaAPI.calculate(year, month);
      setCalculation(response.data);
    } catch (error) {
      alert('Error al calcular IVA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateIVA();
  }, [year, month]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Cálculo de IVA Mensual</h2>
        
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleString('es', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Calculando...</div>
        ) : calculation ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Débito Fiscal</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(calculation.debitoFiscal)}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Crédito Fiscal</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(calculation.creditoFiscal)}
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Saldo a Pagar</div>
                <div className="text-2xl font-bold text-red-700">
                  {formatCurrency(Math.abs(calculation.saldoIVA))}
                </div>
              </div>
            </div>

            <Button onClick={() => {
              ivaAPI.generateForm120(year, month).then(() => {
                alert('Datos Form 120 generados');
              });
            }}>
              Generar Form 120
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
