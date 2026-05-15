/**
 * Sales CRUD page
 *
 * Features:
 *  - Summary bar (total_revenue, total_profit, total_transactions)
 *  - Filterable, paginated table
 *  - Create / Edit / Delete with modal forms
 *  - CSV export
 */
import { useState, useEffect }                   from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, ShoppingCart, Download, Edit2, Trash2, User,
} from 'lucide-react';

import {
  getSales, createSale, updateSale, deleteSale, getSalesSummary, exportSales as exportSalesCSV,
} from '@/api/sales';
import { getProducts }  from '@/api/products';
import { getCustomers } from '@/api/customers';
import { getBranches }  from '@/api/branches';
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
import {
  formatCurrency, formatCurrencyCompact, formatNumber, formatDate, todayISO,
} from '@/utils/formatters';
import { parseApiError, parseFieldErrors } from '@/utils/api';

const PAGE_SIZE = 25;

// ── Summary bar ───────────────────────────────────────────────────────────────
function SummaryBar({ summary, loading }) {
  const stats = [
    { label: 'Total Revenue',      value: formatCurrencyCompact(summary?.total_revenue) },
    { label: 'Total Profit',       value: formatCurrencyCompact(summary?.total_profit) },
    { label: 'Transactions',       value: formatNumber(summary?.total_transactions) },
    { label: 'Avg Order Value',    value: formatCurrencyCompact(summary?.avg_order_value) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="p-4">
          <p className="text-xs text-gray-400 mb-1">{s.label}</p>
          {loading
            ? <div className="h-6 w-20 bg-gray-100 animate-pulse rounded" />
            : <p className="text-lg font-bold text-gray-900">{s.value ?? '—'}</p>}
        </Card>
      ))}
    </div>
  );
}

// ── Create Form ───────────────────────────────────────────────────────────────
function SaleCreateForm({ products = [], customers = [], branches = [], onSubmit, loading, errors = {} }) {
  const [form, setForm] = useState({
    product_id:  '',
    customer_id: '',
    branch_id:   '',
    quantity:    1,
    unit_price:  '',
    sale_date:   todayISO(),
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  // Auto-fill unit_price when product changes
  function handleProductChange(e) {
    const pid = e.target.value;
    const product = products.find((p) => String(p.id) === String(pid));
    setForm((f) => ({
      ...f,
      product_id: pid,
      unit_price: product ? product.selling_price : f.unit_price,
    }));
  }

  const total = form.unit_price && form.quantity
    ? (+form.unit_price * +form.quantity).toFixed(2)
    : null;

  return (
    <form id="sale-create-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <Modal.Body className="space-y-4">
        <Select
          label="Product"
          value={form.product_id}
          onChange={handleProductChange}
          error={errors.product_id}
          required
          options={[
            { value: '', label: 'Select product…' },
            ...products.map((p) => ({ value: p.id, label: `${p.product_name} (${p.sku})` })),
          ]}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Unit Price"
            value={form.unit_price}
            onChange={set('unit_price')}
            error={errors.unit_price}
            type="number" min="0" step="0.01" required
          />
          <div>
            <Input
              label="Quantity"
              value={form.quantity}
              onChange={set('quantity')}
              error={errors.quantity}
              type="number" min="1" required
            />
            {total && <p className="mt-1 text-xs text-gray-500">Total: <span className="font-semibold">{formatCurrency(total)}</span></p>}
          </div>
        </div>
        <Select
          label="Branch"
          value={form.branch_id}
          onChange={set('branch_id')}
          error={errors.branch_id}
          required
          options={[
            { value: '', label: 'Select branch…' },
            ...branches.map((b) => ({ value: b.id, label: b.branch_name })),
          ]}
        />
        <Select
          label="Customer (optional — leave blank for walk-in)"
          value={form.customer_id}
          onChange={set('customer_id')}
          error={errors.customer_id}
          options={[
            { value: '', label: 'Walk-in (no customer)' },
            ...customers.map((c) => ({ value: c.id, label: c.full_name })),
          ]}
        />
        <Input
          label="Sale Date"
          value={form.sale_date}
          onChange={set('sale_date')}
          error={errors.sale_date}
          type="date"
          required
        />
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="sale-create-form" loading={loading}>Record Sale</Button>
      </Modal.Footer>
    </form>
  );
}

// ── Edit Form (product cannot change) ─────────────────────────────────────────
function SaleEditForm({ initial = {}, customers = [], branches = [], onSubmit, loading, errors = {} }) {
  const [form, setForm] = useState({
    customer_id: initial.customer_id ?? '',
    branch_id:   initial.branch_id   ?? '',
    quantity:    initial.quantity    ?? 1,
    unit_price:  initial.unit_price  ?? '',
    sale_date:   initial.sale_date?.slice(0, 10) ?? todayISO(),
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  const total = form.unit_price && form.quantity
    ? (+form.unit_price * +form.quantity).toFixed(2)
    : null;

  return (
    <form id="sale-edit-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <Modal.Body className="space-y-4">
        {/* Read-only product info */}
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <p className="text-xs text-gray-400 mb-0.5">Product (cannot be changed)</p>
          <p className="font-medium text-gray-800">{initial.product_name}</p>
          <p className="text-xs text-gray-400 font-mono">{initial.sku}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Unit Price" value={form.unit_price} onChange={set('unit_price')} error={errors.unit_price} type="number" min="0" step="0.01" required />
          <div>
            <Input label="Quantity"   value={form.quantity}   onChange={set('quantity')}   error={errors.quantity}   type="number" min="1" required />
            {total && <p className="mt-1 text-xs text-gray-500">Total: <span className="font-semibold">{formatCurrency(total)}</span></p>}
          </div>
        </div>
        <Select
          label="Branch"
          value={form.branch_id}
          onChange={set('branch_id')}
          error={errors.branch_id}
          required
          options={[
            { value: '', label: 'Select branch…' },
            ...branches.map((b) => ({ value: b.id, label: b.branch_name })),
          ]}
        />
        <Select
          label="Customer"
          value={form.customer_id}
          onChange={set('customer_id')}
          error={errors.customer_id}
          options={[
            { value: '', label: 'Walk-in (no customer)' },
            ...customers.map((c) => ({ value: c.id, label: c.full_name })),
          ]}
        />
        <Input label="Sale Date" value={form.sale_date} onChange={set('sale_date')} error={errors.sale_date} type="date" required />
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="sale-edit-form" loading={loading}>Save Changes</Button>
      </Modal.Footer>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Sales() {
  useDocumentTitle('Sales');
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [page,       setPage]       = useState(1);
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [branchId,   setBranchId]   = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isWalkIn,   setIsWalkIn]   = useState('');
  const [search,     setSearch]     = useState('');
  const dSearch = useDebounce(search);

  const [modal,      setModal]    = useState(null);   // null | 'add' | { edit: row }
  const [delRow,     setDelRow]   = useState(null);
  const [formErr,    setFormErr]  = useState({});
  const [apiErr,     setApiErr]   = useState('');
  const [exporting,  setExporting] = useState(false);

  const filterParams = {
    ...(dateFrom   && { date_from: dateFrom }),
    ...(dateTo     && { date_to:   dateTo }),
    ...(branchId   && { branch_id: branchId }),
    ...(categoryId && { category_id: categoryId }),
    ...(isWalkIn   && { is_walk_in: isWalkIn }),
    ...(dSearch    && { search: dSearch }),
  };

  const listParams = { page, page_size: PAGE_SIZE, ...filterParams };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales', listParams],
    queryFn:  () => getSales(listParams),
    keepPreviousData: true,
  });

  const summaryQuery = useQuery({
    queryKey: ['sales-summary', filterParams],
    queryFn:  () => getSalesSummary(filterParams),
    staleTime: 60_000,
  });

  // Dropdown data
  const { data: prodData }   = useQuery({ queryKey: ['products-all'],   queryFn: () => getProducts({ page_size: 200, is_active: 'true' }),  staleTime: 5 * 60_000 });
  const { data: custData }   = useQuery({ queryKey: ['customers-all'],  queryFn: () => getCustomers({ page_size: 200 }),                     staleTime: 5 * 60_000 });
  const { data: branchData } = useQuery({ queryKey: ['branches-all'],   queryFn: () => getBranches({ page_size: 50 }),                       staleTime: 5 * 60_000 });
  const { data: catData }    = useQuery({ queryKey: ['categories-all'], queryFn: () => getCategories({ page_size: 100 }),                    staleTime: 5 * 60_000 });

  const rows       = data?.results     ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count      = data?.count       ?? 0;
  const products   = prodData?.results  ?? [];
  const customers  = custData?.results  ?? [];
  const branches   = branchData?.results ?? [];
  const categories = catData?.results    ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
  }

  const createMut = useMutation({
    mutationFn: createSale,
    onSuccess: () => { toast.success('Sale recorded.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateSale(id, data),
    onSuccess: () => { toast.success('Sale updated.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteSale(id),
    onSuccess: () => { toast.success('Sale deleted.'); setDelRow(null); invalidate(); },
    onError: (e) => toast.error(parseApiError(e)),
  });

  function openAdd()   { setFormErr({}); setApiErr(''); setModal('add'); }
  function openEdit(r) { setFormErr({}); setApiErr(''); setModal({ edit: r }); }

  function handleCreateSubmit(form) {
    setFormErr({}); setApiErr('');
    createMut.mutate({
      product_id:  Number(form.product_id),
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      branch_id:   Number(form.branch_id),
      quantity:    Number(form.quantity),
      unit_price:  Number(form.unit_price),
      sale_date:   form.sale_date,
    });
  }

  function handleEditSubmit(form) {
    setFormErr({}); setApiErr('');
    updateMut.mutate({
      id: modal.edit.id,
      data: {
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        branch_id:   Number(form.branch_id),
        quantity:    Number(form.quantity),
        unit_price:  Number(form.unit_price),
        sale_date:   form.sale_date,
      },
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportSalesCSV(filterParams);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `sales_export_${todayISO()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('CSV export failed.');
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    setDateFrom(''); setDateTo(''); setBranchId('');
    setCategoryId(''); setIsWalkIn(''); setSearch('');
    setPage(1);
  }

  const editRow    = modal?.edit ?? null;
  const mutLoading = createMut.isPending || updateMut.isPending;
  const hasFilters = dateFrom || dateTo || branchId || categoryId || isWalkIn || search;

  const columns = [
    {
      key: 'sale_date', header: 'Date',
      render: (v) => <span className="text-sm">{formatDate(v)}</span>,
    },
    {
      key: 'product_name', header: 'Product',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">{v}</p>
          <p className="text-xs text-gray-400 font-mono">{row.sku}</p>
        </div>
      ),
    },
    { key: 'category_name', header: 'Category', render: (v) => <span className="text-sm text-gray-500">{v || '—'}</span> },
    {
      key: 'customer_name', header: 'Customer',
      render: (v, row) => row.customer_id
        ? <span className="text-sm">{v}</span>
        : <span className="text-xs text-gray-400 flex items-center gap-1"><User size={11} />Walk-in</span>,
    },
    { key: 'branch_name', header: 'Branch', render: (v) => <Badge variant="default">{v}</Badge> },
    {
      key: 'quantity', header: 'Qty',
      render: (v) => <span className="font-medium text-center block">{v}</span>,
    },
    { key: 'unit_price',    header: 'Unit Price', render: (v) => formatCurrency(v) },
    {
      key: 'total_amount',  header: 'Total',
      render: (v) => <span className="font-semibold">{formatCurrency(v)}</span>,
    },
    {
      key: 'total_profit',  header: 'Profit',
      render: (v) => (
        <span className={+v >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
          {formatCurrency(v)}
        </span>
      ),
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
        title="Sales"
        subtitle="All transactions"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              leftIcon={<Download size={15} />}
              onClick={handleExport}
              loading={exporting}
            >
              Export CSV
            </Button>
            <Button leftIcon={<Plus size={16} />} onClick={openAdd}>
              Record Sale
            </Button>
          </div>
        }
      />

      {isError && <Alert type="error" title="Failed to load sales data" />}

      <SummaryBar summary={summaryQuery.data} loading={summaryQuery.isLoading} />

      <Card>
        {/* Filters */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search product, customer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search size={15} />}
              className="w-56"
            />
            <Select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
              options={[{ value: '', label: 'All branches' }, ...branches.map((b) => ({ value: b.id, label: b.branch_name }))]}
              className="w-40"
            />
            <Select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
              options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.category_name }))]}
              className="w-44"
            />
            <Select
              value={isWalkIn}
              onChange={(e) => { setIsWalkIn(e.target.value); setPage(1); }}
              options={[
                { value: '',      label: 'All customers' },
                { value: 'false', label: 'Identified only' },
                { value: 'true',  label: 'Walk-ins only' },
              ]}
              className="w-40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">From</span>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">To</span>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36" />
            </div>
            {hasFilters && (
              <button onClick={resetFilters} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No sales found"
            message={hasFilters ? 'Try adjusting your filters.' : 'Record your first sale.'}
            action={!hasFilters && <Button onClick={openAdd} leftIcon={<Plus size={15} />}>Record Sale</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table columns={columns} data={rows} keyField="id" />
            </div>
            <div className="px-5 border-t border-gray-100">
              <Pagination page={page} totalPages={totalPages} count={count} pageSize={PAGE_SIZE} onPage={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Create modal */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Record Sale" size="md">
        {apiErr && <div className="px-6 pt-4"><Alert type="error">{apiErr}</Alert></div>}
        <SaleCreateForm
          products={products}
          customers={customers}
          branches={branches}
          onSubmit={handleCreateSubmit}
          loading={mutLoading}
          errors={formErr}
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editRow} onClose={() => setModal(null)} title="Edit Sale" size="md">
        {apiErr && <div className="px-6 pt-4"><Alert type="error">{apiErr}</Alert></div>}
        <SaleEditForm
          initial={editRow ?? {}}
          customers={customers}
          branches={branches}
          onSubmit={handleEditSubmit}
          loading={mutLoading}
          errors={formErr}
        />
      </Modal>

      <ConfirmDialog
        open={!!delRow}
        onClose={() => setDelRow(null)}
        onConfirm={() => deleteMut.mutate(delRow.id)}
        loading={deleteMut.isPending}
        title="Delete Sale"
        message="Delete this sale record? This action cannot be undone."
        confirmLabel="Delete Sale"
      />
    </div>
  );
}
