import React, { useState, useEffect } from 'react';
import { irpAPI } from '../../services/api';
import Button from '../Shared/Button';

export default function IRPCalculation() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateIRP = async () => {
    setLoading(true);
    try {
      const response = await irpAPI.calculate(year);
      setCalculation(response.data);
    } catch (error) {
      alert('Error al calcular IRP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateIRP();
  }, [year]);

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
        <h2 className="text-2xl font-bold mb-4">Cálculo de IRP Anual</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ejercicio Fiscal</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            {[2023, 2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Calculando...</div>
        ) : calculation ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Ingresos Brutos</div>
                <div className="text-xl font-bold text-green-700">
                  {formatCurrency(calculation.grossIncome)}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Gastos Deducibles</div>
                <div className="text-xl font-bold text-blue-700">
                  {formatCurrency(calculation.deductibleExpenses)}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Renta Neta</div>
                <div className="text-xl font-bold text-purple-700">
                  {formatCurrency(calculation.netIncome)}
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Cálculo por Tramos Progresivos</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                  <span>Tramo 1 (hasta Gs. 50M) al 8%:</span>
                  <span className="font-medium">{formatCurrency(calculation.tramo1.tax)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                  <span>Tramo 2 (50M - 150M) al 9%:</span>
                  <span className="font-medium">{formatCurrency(calculation.tramo2.tax)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                  <span>Tramo 3 (más de 150M) al 10%:</span>
                  <span className="font-medium">{formatCurrency(calculation.tramo3.tax)}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Impuesto Total:</span>
                <span className="text-orange-600">{formatCurrency(calculation.totalTax)}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-600">Retenciones:</span>
                <span className="font-medium">- {formatCurrency(calculation.withholdings)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-xl font-bold">
                <span>Saldo a Pagar:</span>
                <span className="text-red-600">{formatCurrency(calculation.taxToPay)}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={() => {
                irpAPI.generateForm515(year).then(res => {
                  console.log('Datos Form 515:', res.data);
                  alert('Datos del Form 515 generados (ver consola)');
                });
              }}>
                Generar Form 515
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
