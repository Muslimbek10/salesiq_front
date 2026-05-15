/**
 * Products CRUD page
 */
import { useState }                              from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, Edit2, Trash2, AlertTriangle } from 'lucide-react';

import {
  getProducts, createProduct, updateProduct, deleteProduct,
} from '@/api/products';
import { getCategories } from '@/api/categories';

import { PageHeader }    from '@/components/layout/PageHeader';
import { Button }        from '@/components/ui/Button';
import { Input }         from '@/components/ui/Input';
import { Select }        from '@/components/ui/Select';
import { Card }          from '@/components/ui/Card';
import { Table }         from '@/components/ui/Table';
import { Badge }         from '@/components/ui/Badge';
import { EmptyState }    from '@/components/ui/EmptyState';
import { Spinner }       from '@/components/ui/Spinner';
import { Modal }         from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination }    from '@/components/ui/Pagination';
import { Alert }         from '@/components/ui/Alert';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useDebounce }      from '@/hooks/useDebounce';
import { useToast }         from '@/hooks/useToast';
import { formatCurrency }               from '@/utils/formatters';
import { parseApiError, parseFieldErrors } from '@/utils/api';

const PAGE_SIZE = 25;

const STOCK_STATUS_CONFIG = {
  ok:  { variant: 'success', label: 'In Stock' },
  low: { variant: 'warning', label: 'Low Stock' },
  out: { variant: 'danger',  label: 'Out of Stock' },
};

// ── Form ─────────────────────────────────────────────────────────────────────
function ProductForm({ initial = {}, categories = [], onSubmit, loading, errors = {} }) {
  const [form, setForm] = useState({
    product_name:       initial.product_name       ?? '',
    sku:                initial.sku                ?? '',
    category:           initial.category           ?? '',   // PK integer
    cost_price:         initial.cost_price         ?? '',
    selling_price:      initial.selling_price      ?? '',
    stock_quantity:     initial.stock_quantity      ?? 0,
    minimum_stock_level: initial.minimum_stock_level ?? 10,
    is_active:          initial.is_active           ?? true,
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const margin = form.selling_price && form.cost_price
    ? (((+form.selling_price - +form.cost_price) / +form.selling_price) * 100).toFixed(1)
    : null;

  return (
    <form id="prod-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <Modal.Body className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Product Name" value={form.product_name} onChange={set('product_name')} error={errors.product_name} required autoFocus className="col-span-2" />
          <Input label="SKU"          value={form.sku}           onChange={set('sku')}           error={errors.sku} placeholder="e.g. ELEC-001" />
          <Select
            label="Category"
            value={form.category}
            onChange={set('category')}
            error={errors.category}
            required
            options={[
              { value: '', label: 'Select category…' },
              ...categories.map((c) => ({ value: c.id, label: c.category_name })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Cost Price"    value={form.cost_price}    onChange={set('cost_price')}    error={errors.cost_price}    type="number" min="0" step="0.01" required />
          <div>
            <Input label="Selling Price" value={form.selling_price} onChange={set('selling_price')} error={errors.selling_price} type="number" min="0" step="0.01" required />
            {margin !== null && (
              <p className="mt-1 text-xs text-emerald-600 font-medium">{margin}% margin</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Stock Quantity"     value={form.stock_quantity}      onChange={set('stock_quantity')}      type="number" min="0" />
          <Input label="Minimum Stock Level" value={form.minimum_stock_level} onChange={set('minimum_stock_level')} type="number" min="0" />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="prod_is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="prod_is_active" className="text-sm text-gray-700 cursor-pointer">
            Product is active / available for sale
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="prod-form" loading={loading}>
          {initial.id ? 'Save Changes' : 'Create Product'}
        </Button>
      </Modal.Footer>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Products() {
  useDocumentTitle('Products');
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [categoryId,  setCategoryId]  = useState('');
  const [isActive,    setIsActive]    = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const dSearch = useDebounce(search);

  const [modal,   setModal]   = useState(null);
  const [delRow,  setDelRow]  = useState(null);
  const [formErr, setFormErr] = useState({});
  const [apiErr,  setApiErr]  = useState('');

  const params = {
    page, page_size: PAGE_SIZE,
    ...(dSearch      && { search: dSearch }),
    ...(categoryId   && { category_id: categoryId }),
    ...(isActive     && { is_active: isActive }),
    ...(stockStatus  && { stock_status: stockStatus }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', params],
    queryFn:  () => getProducts(params),
    keepPreviousData: true,
  });

  const { data: catData } = useQuery({
    queryKey: ['categories-all'],
    queryFn:  () => getCategories({ page_size: 100 }),
    staleTime: 5 * 60_000,
  });

  const rows       = data?.results     ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count      = data?.count       ?? 0;
  const categories = catData?.results  ?? [];

  function invalidate() { queryClient.invalidateQueries({ queryKey: ['products'] }); }

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => { toast.success('Product created.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => { toast.success('Product updated.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => { toast.success('Product deleted.'); setDelRow(null); invalidate(); },
    onError: (e) => toast.error(parseApiError(e)),
  });

  function openAdd()   { setFormErr({}); setApiErr(''); setModal('add'); }
  function openEdit(r) { setFormErr({}); setApiErr(''); setModal({ edit: r }); }

  function handleSubmit(form) {
    setFormErr({}); setApiErr('');
    const payload = {
      ...form,
      category:            Number(form.category),
      cost_price:          Number(form.cost_price),
      selling_price:       Number(form.selling_price),
      stock_quantity:      Number(form.stock_quantity),
      minimum_stock_level: Number(form.minimum_stock_level),
    };
    if (modal === 'add') createMut.mutate(payload);
    else                 updateMut.mutate({ id: modal.edit.id, data: payload });
  }

  function resetFilters() { setSearch(''); setCategoryId(''); setIsActive(''); setStockStatus(''); setPage(1); }

  const editRow    = modal?.edit ?? null;
  const mutLoading = createMut.isPending || updateMut.isPending;
  const hasFilters = search || categoryId || isActive || stockStatus;

  const columns = [
    {
      key: 'product_name', header: 'Product',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900">{v}</p>
          <p className="text-xs text-gray-400 font-mono">{row.sku}</p>
        </div>
      ),
    },
    { key: 'category_name', header: 'Category',     render: (v) => v || '—' },
    { key: 'cost_price',    header: 'Cost',          render: (v) => formatCurrency(v) },
    {
      key: 'selling_price', header: 'Price',
      render: (v) => <span className="font-medium">{formatCurrency(v)}</span>,
    },
    {
      key: 'margin_percentage', header: 'Margin',
      render: (v) => v != null ? <span className="text-emerald-600 font-medium">{(+v).toFixed(1)}%</span> : '—',
    },
    {
      key: 'stock_quantity', header: 'Stock',
      render: (v, row) => (
        <div className="flex items-center gap-1.5">
          {row.stock_status === 'low' && <AlertTriangle size={12} className="text-amber-500" />}
          {row.stock_status === 'out' && <AlertTriangle size={12} className="text-red-500" />}
          <span className={row.stock_status === 'out' ? 'text-red-600 font-medium' : ''}>{v}</span>
        </div>
      ),
    },
    {
      key: 'stock_status', header: 'Status',
      render: (v) => {
        const cfg = STOCK_STATUS_CONFIG[v] ?? { variant: 'default', label: v };
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: 'is_active', header: 'Active',
      render: (v) => v
        ? <Badge variant="success">Yes</Badge>
        : <Badge variant="default">No</Badge>,
    },
    {
      key: '_actions', header: '', className: 'w-20 text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => setDelRow(row)} className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Product catalog and stock management"
        action={<Button leftIcon={<Plus size={16} />} onClick={openAdd}>Add Product</Button>}
      />

      {isError && <Alert type="error" title="Failed to load products" />}

      <Card>
        {/* Filters */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search name, SKU…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search size={15} />}
            className="w-56"
          />
          <Select
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.category_name }))]}
            className="w-44"
          />
          <Select
            value={stockStatus}
            onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
            options={[
              { value: '',    label: 'All stock levels' },
              { value: 'ok',  label: 'In Stock' },
              { value: 'low', label: 'Low Stock' },
              { value: 'out', label: 'Out of Stock' },
            ]}
            className="w-40"
          />
          <Select
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
            options={[
              { value: '',     label: 'All products' },
              { value: 'true', label: 'Active only' },
              { value: 'false',label: 'Inactive only' },
            ]}
            className="w-36"
          />
          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            message={hasFilters ? 'Try adjusting your filters.' : 'Add your first product.'}
            action={!hasFilters && <Button onClick={openAdd} leftIcon={<Plus size={15} />}>Add Product</Button>}
          />
        ) : (
          <>
            <Table columns={columns} data={rows} keyField="id" />
            <div className="px-5 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} count={count} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </>
        )}
      </Card>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editRow ? 'Edit Product' : 'Add Product'} size="lg">
        {apiErr && <div className="px-6 pt-4"><Alert type="error">{apiErr}</Alert></div>}
        <ProductForm
          initial={editRow ?? {}}
          categories={categories}
          onSubmit={handleSubmit}
          loading={mutLoading}
          errors={formErr}
        />
      </Modal>

      <ConfirmDialog
        open={!!delRow}
        onClose={() => setDelRow(null)}
        onConfirm={() => deleteMut.mutate(delRow.id)}
        loading={deleteMut.isPending}
        title="Delete Product"
        message={`Delete "${delRow?.product_name}"? Existing sales records will remain but be unlinked.`}
      />
    </div>
  );
}
