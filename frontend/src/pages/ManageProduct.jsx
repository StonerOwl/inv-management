import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Trash2, Pencil, XCircle, Search, Settings2 } from 'lucide-react';
import clsx from 'clsx';
import { listManagedProducts, createManagedProduct, updateManagedProduct, deleteManagedProduct } from '../api/client';

export default function ManageProduct() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modalError, setModalError] = useState('');

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await listManagedProducts({ search: searchQuery });
      setProducts(data.items || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setDescription(product.description || '');
    } else {
      setEditingProduct(null);
      setName('');
      setDescription('');
    }
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setName('');
    setDescription('');
    setModalError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
    };

    try {
      if (editingProduct) {
        await updateManagedProduct(editingProduct.id, payload);
      } else {
        await createManagedProduct(payload);
      }
      fetchProducts();
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save product:', err);
      setModalError(err.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDelete = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteManagedProduct(id);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Failed to delete product.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col -m-8 p-8 relative">
      <div className="max-w-7xl mx-auto w-full pb-20">
        
        {/* Header */}
        <div className="mb-12 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Package className="text-primary-600 dark:text-primary-400" size={32} />
              Manage Products
            </h1>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
              High-level overarching products above projects
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="aiq-btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Create Product
          </button>
        </div>

        {/* Search */}
        <div className="mb-8 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="aiq-input pl-10"
          />
        </div>

        {/* Product List */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
          {products.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-bold border-dashed border-2 m-8 border-gray-200 dark:border-gray-700 rounded-xl">
              No products found. Click "Create Product" to add one.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="p-4 pl-6">Product Name</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 w-32 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Package size={16} className="text-primary-500" />
                        {product.name}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                      {product.description || <span className="italic opacity-50">No description</span>}
                    </td>
                    <td className="p-4 pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(product.id, e)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:text-gray-100 transition-colors">
              <XCircle size={24} />
            </button>
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6 text-primary-600 dark:text-primary-400">
                <Package size={32} />
                <h2 className="text-2xl font-black tracking-tighter uppercase">{editingProduct ? 'Edit' : 'New'} Product</h2>
              </div>
              <form onSubmit={handleSave}>
                <div className="mb-6">
                  <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Product Name *</label>
                  <input
                    type="text"
                    autoFocus
                    value={name}
                    onChange={(e) => { setName(e.target.value); setModalError(''); }}
                    placeholder="ENTER PRODUCT NAME..."
                    className={`aiq-input ${modalError ? 'border-red-400 focus:border-red-500 dark:border-red-500' : ''}`}
                    required
                  />
                  {modalError && (
                    <div className="mt-2 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                      <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">{modalError}</p>
                    </div>
                  )}
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-bold tracking-normal text-gray-700 dark:text-gray-300 mb-2 uppercase">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="ENTER DESCRIPTION..."
                    className="aiq-input min-h-[100px] resize-y"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                  <button type="button" onClick={handleCloseModal} className="aiq-btn-ghost">
                    CANCEL
                  </button>
                  <button type="submit" disabled={!name.trim()} className="aiq-btn-primary">
                    {editingProduct ? 'SAVE CHANGES' : 'CREATE'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
