'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Plus, Edit2, Trash2, X, Check, Package, DollarSign, ShoppingCart, AlertCircle, Eye, Hash, Image as ImageIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ProductStatus = 'active' | 'inactive' | 'discontinued';

interface Product {
  id: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  price?: number | null;
  cost?: number | null;
  stock_quantity?: number | null;
  min_stock_level?: number | null;
  unit?: string | null;
  supplier?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  status?: ProductStatus | null;
  created_at?: string;
  updated_at?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    cost: '',
    stock_quantity: '',
    min_stock_level: '',
    unit: '',
    supplier: '',
    sku: '',
    barcode: '',
    image_url: '',
    status: 'active' as ProductStatus,
  });
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to fetch products';
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      setError(errorMessage);
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setModalError('Product name is required');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setError(null);
    setSuccess(null);

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save product');
      }

      setSuccess(editingProduct ? 'Product updated successfully' : 'Product added successfully');
      setFormData({
        name: '',
        description: '',
        category: '',
        price: '',
        cost: '',
        stock_quantity: '',
        min_stock_level: '',
        unit: '',
        supplier: '',
        sku: '',
        barcode: '',
        image_url: '',
        status: 'active',
      });
      setShowModal(false);
      setEditingProduct(null);
      await fetchProducts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setShowDetailsModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      stock_quantity: product.stock_quantity?.toString() || '',
      min_stock_level: product.min_stock_level?.toString() || '',
      unit: product.unit || '',
      supplier: product.supplier || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      image_url: product.image_url || '',
      status: product.status || 'active',
    });
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      cost: '',
      stock_quantity: '',
      min_stock_level: '',
      unit: '',
      supplier: '',
      sku: '',
      barcode: '',
      image_url: '',
      status: 'active',
    });
    setShowModal(true);
    setModalError(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete product');
      }

      setSuccess('Product deleted successfully');
      await fetchProducts();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      price: '',
      cost: '',
      stock_quantity: '',
      min_stock_level: '',
      unit: '',
      supplier: '',
      sku: '',
      barcode: '',
      image_url: '',
      status: 'active',
    });
    setModalError(null);
    setError(null);
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'discontinued':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700';
    }
  };

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'discontinued':
        return 'Discontinued';
      default:
        return 'Active';
    }
  };

  const getStockStatus = (stock: number | null | undefined, minStock: number | null | undefined) => {
    if (stock === null || stock === undefined || minStock === null || minStock === undefined) {
      return { color: 'bg-gray-100 text-gray-800', icon: null, label: '—' };
    }
    if (stock <= 0) {
      return { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: <TrendingDown className="h-3 w-3" />, label: 'Out of Stock' };
    }
    if (stock <= minStock) {
      return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <AlertCircle className="h-3 w-3" />, label: 'Low Stock' };
    }
    return { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: <TrendingUp className="h-3 w-3" />, label: 'In Stock' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">
            Manage your products and inventory
          </p>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {(error || success) && (
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {success.toLowerCase().includes('deleted') ? (
                <Alert variant="destructive">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    {success}
                  </AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Product Modal Dialog */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={handleCloseModal}
          >
            <div className="absolute inset-0 bg-background/60 backdrop-blur-lg" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-3xl z-10 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCloseModal}
                      className="h-8 w-8"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {modalError && (
                      <Alert variant="destructive">
                        <AlertDescription>{modalError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter product name"
                          value={formData.name}
                          onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                          autoFocus
                        />
                      </div>

                      {/* SKU */}
                      <div className="space-y-2">
                        <Label htmlFor="sku">
                          <Hash className="inline h-3 w-3 mr-1" />
                          SKU
                        </Label>
                        <Input
                          id="sku"
                          placeholder="Auto-generated if empty"
                          value={formData.sku}
                          onChange={(e) => {
                            setFormData({ ...formData, sku: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
                      </div>

                      {/* Category */}
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Input
                          id="category"
                          placeholder="e.g., Cleaning Supplies, Tools"
                          value={formData.category}
                          onChange={(e) => {
                            setFormData({ ...formData, category: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Price */}
                      <div className="space-y-2">
                        <Label htmlFor="price">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Selling Price (PKR) *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formData.price}
                          onChange={(e) => {
                            setFormData({ ...formData, price: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                        />
                      </div>

                      {/* Cost */}
                      <div className="space-y-2">
                        <Label htmlFor="cost">
                          <DollarSign className="inline h-3 w-3 mr-1" />
                          Cost Price (PKR)
                        </Label>
                        <Input
                          id="cost"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formData.cost}
                          onChange={(e) => {
                            setFormData({ ...formData, cost: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Stock Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor="stock_quantity">
                          <ShoppingCart className="inline h-3 w-3 mr-1" />
                          Stock Quantity *
                        </Label>
                        <Input
                          id="stock_quantity"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.stock_quantity}
                          onChange={(e) => {
                            setFormData({ ...formData, stock_quantity: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                        />
                      </div>

                      {/* Min Stock Level */}
                      <div className="space-y-2">
                        <Label htmlFor="min_stock_level">
                          <AlertCircle className="inline h-3 w-3 mr-1" />
                          Min Stock Level *
                        </Label>
                        <Input
                          id="min_stock_level"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.min_stock_level}
                          onChange={(e) => {
                            setFormData({ ...formData, min_stock_level: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          required
                        />
                        <p className="text-xs text-muted-foreground">Alert when stock falls below this</p>
                      </div>

                      {/* Unit */}
                      <div className="space-y-2">
                        <Label htmlFor="unit">Unit</Label>
                        <Input
                          id="unit"
                          placeholder="e.g., piece, liter, kg"
                          value={formData.unit}
                          onChange={(e) => {
                            setFormData({ ...formData, unit: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Supplier */}
                      <div className="space-y-2">
                        <Label htmlFor="supplier">Supplier</Label>
                        <Input
                          id="supplier"
                          placeholder="Supplier name"
                          value={formData.supplier}
                          onChange={(e) => {
                            setFormData({ ...formData, supplier: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Barcode */}
                      <div className="space-y-2">
                        <Label htmlFor="barcode">Barcode</Label>
                        <Input
                          id="barcode"
                          placeholder="Barcode number"
                          value={formData.barcode}
                          onChange={(e) => {
                            setFormData({ ...formData, barcode: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={(e) => {
                            setFormData({ ...formData, status: e.target.value as ProductStatus });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="discontinued">Discontinued</option>
                        </select>
                      </div>

                      {/* Image URL */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="image_url">
                          <ImageIcon className="inline h-3 w-3 mr-1" />
                          Image URL
                        </Label>
                        <Input
                          id="image_url"
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={formData.image_url}
                          onChange={(e) => {
                            setFormData({ ...formData, image_url: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                          id="description"
                          placeholder="Product description"
                          value={formData.description}
                          onChange={(e) => {
                            setFormData({ ...formData, description: e.target.value });
                            setModalError(null);
                          }}
                          disabled={isSubmitting}
                          rows={3}
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !formData.name.trim()}
                        className="flex-1"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            {editingProduct ? 'Update' : 'Add'}
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseModal}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => setShowDetailsModal(false)}
          >
            <div className="absolute inset-0 bg-background/60 backdrop-blur-lg" />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-2 shadow-2xl backdrop-blur-xl bg-card/95">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Eye className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Product Details</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowDetailsModal(false)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Product Image */}
                    {selectedProduct.image_url && (
                      <div className="flex justify-center">
                        <Avatar className="h-32 w-32 border-4 border-primary/20">
                          <AvatarImage src={selectedProduct.image_url} alt={selectedProduct.name} />
                          <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                            {selectedProduct.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}

                    {/* Name and Status */}
                    <div className="text-center">
                      <h3 className="text-2xl font-bold">{selectedProduct.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedProduct.status)}`}>
                          {getStatusLabel(selectedProduct.status)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStockStatus(selectedProduct.stock_quantity, selectedProduct.min_stock_level).color}`}>
                          {getStockStatus(selectedProduct.stock_quantity, selectedProduct.min_stock_level).icon}
                          {getStockStatus(selectedProduct.stock_quantity, selectedProduct.min_stock_level).label}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      {/* SKU */}
                      {selectedProduct.sku && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Hash className="h-4 w-4" />
                            <Label className="text-sm font-medium">SKU</Label>
                          </div>
                          <p className="text-base font-semibold font-mono">
                            {selectedProduct.sku}
                          </p>
                        </div>
                      )}

                      {/* Category */}
                      {selectedProduct.category && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                          <p className="text-base font-semibold">{selectedProduct.category}</p>
                        </div>
                      )}

                      {/* Price */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <Label className="text-sm font-medium">Selling Price</Label>
                        </div>
                        <p className="text-base font-semibold">
                          PKR {selectedProduct.price?.toLocaleString('en-PK', { minimumFractionDigits: 2 }) || '0.00'}
                        </p>
                      </div>

                      {/* Cost */}
                      {selectedProduct.cost !== null && selectedProduct.cost !== undefined && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <Label className="text-sm font-medium">Cost Price</Label>
                          </div>
                          <p className="text-base font-semibold">
                            PKR {selectedProduct.cost.toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}

                      {/* Stock Quantity */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <ShoppingCart className="h-4 w-4" />
                          <Label className="text-sm font-medium">Stock Quantity</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedProduct.stock_quantity !== null && selectedProduct.stock_quantity !== undefined 
                            ? `${selectedProduct.stock_quantity} ${selectedProduct.unit || ''}`.trim()
                            : '—'}
                        </p>
                      </div>

                      {/* Min Stock Level */}
                      <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          <Label className="text-sm font-medium">Min Stock Level</Label>
                        </div>
                        <p className="text-base font-semibold">
                          {selectedProduct.min_stock_level !== null && selectedProduct.min_stock_level !== undefined 
                            ? `${selectedProduct.min_stock_level} ${selectedProduct.unit || ''}`.trim()
                            : '—'}
                        </p>
                      </div>

                      {/* Unit */}
                      {selectedProduct.unit && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <Label className="text-sm font-medium text-muted-foreground">Unit</Label>
                          <p className="text-base font-semibold">{selectedProduct.unit}</p>
                        </div>
                      )}

                      {/* Supplier */}
                      {selectedProduct.supplier && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <Label className="text-sm font-medium text-muted-foreground">Supplier</Label>
                          <p className="text-base font-semibold">{selectedProduct.supplier}</p>
                        </div>
                      )}

                      {/* Barcode */}
                      {selectedProduct.barcode && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                          <Label className="text-sm font-medium text-muted-foreground">Barcode</Label>
                          <p className="text-base font-semibold font-mono">{selectedProduct.barcode}</p>
                        </div>
                      )}

                      {/* Description */}
                      {selectedProduct.description && (
                        <div className="space-y-2 p-4 border rounded-lg bg-muted/30 md:col-span-2">
                          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                          <p className="text-base font-semibold">{selectedProduct.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No products found. Add your first product to get started.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Product</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">SKU</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap min-w-[200px]">Name</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Category</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Price</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Stock</th>
                <th className="text-left p-4 font-semibold text-sm whitespace-nowrap">Status</th>
                <th className="text-right p-4 font-semibold text-sm sticky right-0 bg-muted/50 z-10 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {products.map((product, index) => {
                  const stockStatus = getStockStatus(product.stock_quantity, product.min_stock_level);
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      {/* Product Image/Icon */}
                      <td className="p-4 whitespace-nowrap">
                        {product.image_url ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={product.image_url} alt={product.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {product.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                          </div>
                        )}
                      </td>

                      {/* SKU */}
                      <td className="p-4 whitespace-nowrap">
                        {product.sku ? (
                          <div className="flex items-center gap-2">
                            <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-mono font-medium">{product.sku}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Name */}
                      <td className="p-4 whitespace-nowrap">
                        <p className="font-semibold text-sm">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {product.description}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-sm">{product.category || '—'}</span>
                      </td>

                      {/* Price */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium">
                            {product.price?.toLocaleString('en-PK', { minimumFractionDigits: 2 }) || '0.00'}
                          </span>
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${stockStatus.color}`}>
                            {stockStatus.icon}
                            {product.stock_quantity !== null && product.stock_quantity !== undefined 
                              ? `${product.stock_quantity} ${product.unit || ''}`.trim()
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(product.status)}`}>
                          {getStatusLabel(product.status)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 sticky right-0 bg-background z-10 border-l border-border whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(product)}
                            title="View details"
                            className="flex-shrink-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(product)}
                            title="Edit product"
                            className="flex-shrink-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product.id)}
                            className="text-destructive hover:text-destructive flex-shrink-0"
                            title="Delete product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

