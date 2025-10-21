/**
 * GESTIÓN DE TRANSACCIONES
 * 
 * Permite:
 * - Registro manual de ingresos y egresos
 * - Importación desde Excel de Marangatu
 * - Categorización automática de gastos
 * - Edición y eliminación de transacciones
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface Transaction {
  id: string;
  transactionDate: Date;
  type: 'INGRESO' | 'EGRESO';
  documentType: string;
  documentNumber: string;
  rucCounterpart: string;
  dvCounterpart: string;
  nameCounterpart: string;
  grossAmount: number;
  ivaRate: number;
  ivaAmount: number;
  netAmount: number;
  ivaDeductionCategory: string;
  ivaDeductionPercentage: number;
  creditableIvaAmount: number;
  isDeductibleIrp: boolean;
  irpDeductionCategory: string;
  description: string;
  source: string;
}

interface DeductionCategory {
  code: string;
  name: string;
  appliesToIva: boolean;
  appliesToIrp: boolean;
  ivaDeductionPercentage: number;
}

export const TransactionsManager: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<DeductionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filtros
  const [filterType, setFilterType] = useState<'ALL' | 'INGRESO' | 'EGRESO'>('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulario
  const [formData, setFormData] = useState({
    transactionDate: new Date().toISOString().split('T')[0],
    type: 'EGRESO' as 'INGRESO' | 'EGRESO',
    documentType: 'TALONARIO',
    documentNumber: '',
    timbrado: '',
    rucCounterpart: '',
    dvCounterpart: '',
    nameCounterpart: '',
    grossAmount: '',
    ivaRate: '10',
    description: '',
    ivaDeductionCategory: '',
    irpDeductionCategory: ''
  });

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/deduction-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleCreateTransaction = () => {
    setModalMode('create');
    setSelectedTransaction(null);
    setFormData({
      transactionDate: new Date().toISOString().split('T')[0],
      type: 'EGRESO',
      documentType: 'TALONARIO',
      documentNumber: '',
      timbrado: '',
      rucCounterpart: '',
      dvCounterpart: '',
      nameCounterpart: '',
      grossAmount: '',
      ivaRate: '10',
      description: '',
      ivaDeductionCategory: '',
      irpDeductionCategory: ''
    });
    setShowModal(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setModalMode('edit');
    setSelectedTransaction(transaction);
    setFormData({
      transactionDate: new Date(transaction.transactionDate).toISOString().split('T')[0],
      type: transaction.type,
      documentType: transaction.documentType,
      documentNumber: transaction.documentNumber,
      timbrado: '',
      rucCounterpart: transaction.rucCounterpart,
      dvCounterpart: transaction.dvCounterpart,
      nameCounterpart: transaction.nameCounterpart,
      grossAmount: String(transaction.grossAmount),
      ivaRate: String(transaction.ivaRate),
      description: transaction.description,
      ivaDeductionCategory: transaction.ivaDeductionCategory,
      irpDeductionCategory: transaction.irpDeductionCategory
    });
    setShowModal(true);
  };

  const handleValidateRUC = async () => {
    if (formData.rucCounterpart.length < 3) return;

    try {
      const response = await api.get(`/validate-ruc/${formData.rucCounterpart}`);
      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          nameCounterpart: response.data.data.razonSocial,
          dvCounterpart: response.data.data.dv
        }));
      }
    } catch (error) {
      console.error('Error al validar RUC:', error);
    }
  };

  const calculateAmounts = () => {
    const gross = parseFloat(formData.grossAmount) || 0;
    const rate = parseFloat(formData.ivaRate) || 0;
    
    const iva = gross - (gross / (1 + rate / 100));
    const net = gross - iva;

    return { gross, iva, net };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const amounts = calculateAmounts();
      
      const payload = {
        ...formData,
        grossAmount: amounts.gross,
        ivaAmount: amounts.iva,
        netAmount: amounts.net,
        ivaRate: parseFloat(formData.ivaRate),
        isDeductibleIrp: formData.type === 'EGRESO',
        isCreditableIva: formData.type === 'EGRESO'
      };

      if (modalMode === 'create') {
        await api.post('/transactions', payload);
      } else {
        await api.put(`/transactions/${selectedTransaction?.id}`, payload);
      }

      setShowModal(false);
      loadTransactions();
    } catch (error) {
      console.error('Error al guardar transacción:', error);
      alert('Error al guardar la transacción');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta transacción?')) return;

    try {
      await api.delete(`/transactions/${id}`);
      loadTransactions();
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
      alert('Error al eliminar la transacción');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/transactions/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`Importadas ${response.data.imported} transacciones`);
      loadTransactions();
    } catch (error) {
      console.error('Error al importar archivo:', error);
      alert('Error al importar el archivo');
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'ALL' && t.type !== filterType) return false;
    if (filterDateFrom && new Date(t.transactionDate) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(t.transactionDate) > new Date(filterDateTo)) return false;
    if (searchTerm && !t.nameCounterpart.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !t.documentNumber.includes(searchTerm)) return false;
    return true;
  });

  const totals = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'INGRESO') {
      acc.ingresos += t.grossAmount;
      acc.ivaDebito += t.ivaAmount;
    } else {
      acc.egresos += t.grossAmount;
      acc.ivaCredito += t.creditableIvaAmount;
    }
    return acc;
  }, { ingresos: 0, egresos: 0, ivaDebito: 0, ivaCredito: 0 });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Transacciones</h1>
            <p className="text-gray-600 mt-2">
              Registra manualmente o importa facturas desde Marangatu
            </p>
          </div>
          <div className="flex space-x-3">
            <label className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow cursor-pointer transition-colors">
              📥 Importar Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
            <button
              onClick={handleCreateTransaction}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-colors"
            >
              + Nueva Transacción
            </button>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">Todos</option>
              <option value="INGRESO">Ingresos</option>
              <option value="EGRESO">Egresos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Nombre o N° documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Ingresos</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {formatCurrency(totals.ingresos)}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Total Egresos</p>
          <p className="text-2xl font-bold text-red-900 mt-1">
            {formatCurrency(totals.egresos)}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">IVA Débito</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {formatCurrency(totals.ivaDebito)}
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">IVA Crédito</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {formatCurrency(totals.ivaCredito)}
          </p>
        </div>
      </div>

      {/* Tabla de transacciones */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RUC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contraparte
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IVA
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No hay transacciones para mostrar
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(new Date(transaction.transactionDate))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          transaction.type === 'INGRESO'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.documentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.rucCounterpart}-{transaction.dvCounterpart}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {transaction.nameCounterpart}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(transaction.grossAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatCurrency(
                        transaction.type === 'INGRESO'
                          ? transaction.ivaAmount
                          : transaction.creditableIvaAmount
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEditTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(transaction.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de crear/editar transacción */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Nueva Transacción' : 'Editar Transacción'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="EGRESO">Egreso (Compra)</option>
                    <option value="INGRESO">Ingreso (Venta)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RUC
                  </label>
                  <input
                    type="text"
                    value={formData.rucCounterpart}
                    onChange={(e) => setFormData({ ...formData, rucCounterpart: e.target.value })}
                    onBlur={handleValidateRUC}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DV
                  </label>
                  <input
                    type="text"
                    value={formData.dvCounterpart}
                    onChange={(e) => setFormData({ ...formData, dvCounterpart: e.target.value })}
                    maxLength={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tasa IVA
                  </label>
                  <select
                    value={formData.ivaRate}
                    onChange={(e) => setFormData({ ...formData, ivaRate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="10">10%</option>
                    <option value="5">5%</option>
                    <option value="0">Exento</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre / Razón Social
                </label>
                <input
                  type="text"
                  value={formData.nameCounterpart}
                  onChange={(e) => setFormData({ ...formData, nameCounterpart: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nº Documento
                  </label>
                  <input
                    type="text"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Total (con IVA)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.grossAmount}
                    onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {formData.type === 'EGRESO' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría de Deducción
                  </label>
                  <select
                    value={formData.ivaDeductionCategory}
                    onChange={(e) => setFormData({ ...formData, ivaDeductionCategory: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Seleccione una categoría...</option>
                    {categories.filter(c => c.appliesToIva).map(cat => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name} ({cat.ivaDeductionPercentage}% deducible)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {formData.grossAmount && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Cálculo Automático:</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">Monto Neto:</p>
                      <p className="font-semibold text-blue-900">
                        {formatCurrency(calculateAmounts().net)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">IVA:</p>
                      <p className="font-semibold text-blue-900">
                        {formatCurrency(calculateAmounts().iva)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Total:</p>
                      <p className="font-semibold text-blue-900">
                        {formatCurrency(calculateAmounts().gross)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsManager;