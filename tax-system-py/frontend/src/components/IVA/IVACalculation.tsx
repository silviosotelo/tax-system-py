import React, { useState, useEffect } from 'react';
import { ivaAPI } from '../../services/api';

export default function IVACalculation() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const response = await ivaAPI.calculate(year, month);
        setCalculation(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [year, month]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-PY').format(val);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Cálculo IVA Mensual</h2>
      
      <div className="flex gap-4 mb-6">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 border rounded">
          {[2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 border rounded">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {loading ? <div>Calculando...</div> : calculation ? (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded">
            <div className="text-sm text-gray-600">Débito Fiscal</div>
            <div className="text-xl font-bold text-green-700">Gs. {formatMoney(calculation.debitoFiscal)}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded">
            <div className="text-sm text-gray-600">Crédito Fiscal</div>
            <div className="text-xl font-bold text-blue-700">Gs. {formatMoney(calculation.creditoFiscal)}</div>
          </div>
          <div className="bg-red-50 p-4 rounded">
            <div className="text-sm text-gray-600">Saldo a Pagar</div>
            <div className="text-xl font-bold text-red-700">Gs. {formatMoney(Math.abs(calculation.saldoIVA))}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
