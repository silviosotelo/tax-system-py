/**
 * PROYECCIÓN IRP
 * Proyecta el IRP anual basado en el progreso actual y permite simulaciones
 */

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { irpAPI } from '../../services/api';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface Projection {
  currentMonth: number;
  yearProgress: number;
  actualIncome: number;
  projectedYearIncome: number;
  actualExpenses: number;
  projectedYearExpenses: number;
  projectedNetIncome: number;
  projectedTax: number;
  monthlyData: Array<{
    month: string;
    income: number;
    expenses: number;
    netIncome: number;
  }>;
}

export const IRPProjection: React.FC = () => {
  const [projection, setProjection] = useState<Projection | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [simulatedIncome, setSimulatedIncome] = useState('');
  const [simulatedExpenses, setSimulatedExpenses] = useState('');

  useEffect(() => {
    loadProjection();
  }, [year]);

  const loadProjection = async () => {
    try {
      setLoading(true);
      const response = await irpAPI.getProjection(year, new Date().getMonth() + 1);
      setProjection(response.data);
    } catch (error) {
      console.error('Error al cargar proyección:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSimulation = () => {
    if (!projection) return null;

    const income = parseFloat(simulatedIncome) || projection.projectedYearIncome;
    const expenses = parseFloat(simulatedExpenses) || projection.projectedYearExpenses;
    const netIncome = income - expenses;

    // Cálculo simplificado de IRP por tramos
    let tax = 0;
    const mmu = 2650731; // MMU 2024

    if (netIncome <= mmu * 10) {
      tax = 0;
    } else if (netIncome <= mmu * 20) {
      tax = (netIncome - mmu * 10) * 0.08;
    } else if (netIncome <= mmu * 30) {
      tax = (mmu * 10 * 0.08) + ((netIncome - mmu * 20) * 0.09);
    } else {
      tax = (mmu * 10 * 0.08) + (mmu * 10 * 0.09) + ((netIncome - mmu * 30) * 0.10);
    }

    return { income, expenses, netIncome, tax };
  };

  const simulation = calculateSimulation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!projection) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">No se pudo cargar la proyección</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Proyección IRP {year}</h1>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Progreso del Año</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">
              {formatPercentage(projection.yearProgress)}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Ingresos Proyectados</p>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {formatCurrency(projection.projectedYearIncome)}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Gastos Proyectados</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">
              {formatCurrency(projection.projectedYearExpenses)}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600 font-medium">IRP Proyectado</p>
            <p className="text-2xl font-bold text-red-900 mt-1">
              {formatCurrency(projection.projectedTax)}
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={projection.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="income" name="Ingresos" fill="#10B981" />
            <Bar dataKey="expenses" name="Gastos" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Simulador IRP</h2>
        <p className="text-gray-600 mb-6">
          Simula diferentes escenarios de ingresos y gastos para estimar tu IRP final
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingresos Anuales Totales
            </label>
            <input
              type="number"
              value={simulatedIncome}
              onChange={(e) => setSimulatedIncome(e.target.value)}
              placeholder={String(projection.projectedYearIncome)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gastos Deducibles Totales
            </label>
            <input
              type="number"
              value={simulatedExpenses}
              onChange={(e) => setSimulatedExpenses(e.target.value)}
              placeholder={String(projection.projectedYearExpenses)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {simulation && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Resultado de la Simulación</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Ingresos</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(simulation.income)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Gastos</p>
                <p className="text-lg font-bold text-red-700">
                  {formatCurrency(simulation.expenses)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Renta Neta</p>
                <p className="text-lg font-bold text-purple-700">
                  {formatCurrency(simulation.netIncome)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">IRP Estimado</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(simulation.tax)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IRPProjection;