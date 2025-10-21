import React, { useState, useEffect } from 'react';
import { irpAPI } from '../../services/api';

export default function IRPCalculation() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await irpAPI.calculate(year);
        setCalculation(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [year]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-PY').format(val);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Cálculo IRP Anual</h2>
      
      <div className="mb-6">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 border rounded">
          {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? <div>Calculando...</div> : calculation ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded">
              <div className="text-sm">Ingresos Brutos</div>
              <div className="text-lg font-bold">Gs. {formatMoney(calculation.grossIncome)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-sm">Gastos Deducibles</div>
              <div className="text-lg font-bold">Gs. {formatMoney(calculation.deductibleExpenses)}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <div className="text-sm">Renta Neta</div>
              <div className="text-lg font-bold">Gs. {formatMoney(calculation.netIncome)}</div>
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-2">Cálculo por Tramos</h3>
            <div className="space-y-2">
              <div className="flex justify-between bg-gray-50 p-2">
                <span>Tramo 1 (8%)</span>
                <span>Gs. {formatMoney(calculation.tramo1.tax)}</span>
              </div>
              <div className="flex justify-between bg-gray-50 p-2">
                <span>Tramo 2 (9%)</span>
                <span>Gs. {formatMoney(calculation.tramo2.tax)}</span>
              </div>
              <div className="flex justify-between bg-gray-50 p-2">
                <span>Tramo 3 (10%)</span>
                <span>Gs. {formatMoney(calculation.tramo3.tax)}</span>
              </div>
            </div>
          </div>
          <div className="text-xl font-bold text-red-600 border-t pt-4">
            Total a Pagar: Gs. {formatMoney(calculation.taxToPay)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
