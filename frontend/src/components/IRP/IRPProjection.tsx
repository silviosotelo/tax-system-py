import React, { useState, useEffect } from 'react';
import { irpAPI } from '../../services/api';

export default function IRPProjection() {
  const [year] = useState(new Date().getFullYear());
  const [month] = useState(new Date().getMonth() + 1);
  const [projection, setProjection] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjection();
  }, []);

  const loadProjection = async () => {
    try {
      const response = await irpAPI.getProjection(year, month);
      setProjection(response.data);
    } catch (error) {
      console.error('Error al cargar proyección:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return <div className="text-center py-8">Cargando proyección...</div>;
  }

  if (!projection) return null;

  const percentageComplete = (projection.monthsElapsed / 12) * 100;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Proyección IRP al Cierre del Año</h2>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Progreso del año fiscal</span>
            <span>{projection.monthsElapsed} de 12 meses ({percentageComplete.toFixed(0)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${percentageComplete}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3 text-gray-700">Acumulado Actual</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresos:</span>
                <span className="font-medium">{formatCurrency(projection.actual.grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gastos:</span>
                <span className="font-medium">{formatCurrency(projection.actual.deductibleExpenses)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Renta Neta:</span>
                <span className="font-bold text-purple-600">
                  {formatCurrency(projection.actual.netIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">IRP Actual:</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(projection.actual.totalTax)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-gray-700">Proyección al Cierre</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Ingresos:</span>
                <span className="font-medium">{formatCurrency(projection.projected.grossIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gastos:</span>
                <span className="font-medium">{formatCurrency(projection.projected.deductibleExpenses)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Renta Neta Proyectada:</span>
                <span className="font-bold text-purple-600">
                  {formatCurrency(projection.projected.netIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">IRP Proyectado:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(projection.projected.totalTax)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Análisis</h4>
          <p className="text-sm text-yellow-700">
            Basado en el promedio mensual de los últimos {projection.monthsElapsed} meses,
            se proyecta un IRP total de <strong>{formatCurrency(projection.projected.totalTax)}</strong> al
            cierre del ejercicio fiscal {year}.
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            Diferencia vs actual: <strong>
              {formatCurrency(projection.projected.totalTax - projection.actual.totalTax)}
            </strong> en los {projection.monthsRemaining} meses restantes.
          </p>
        </div>
      </div>
    </div>
  );
}
