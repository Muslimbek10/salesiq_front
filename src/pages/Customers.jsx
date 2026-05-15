/**
 * Customers CRUD page
 */
import { useState }                              from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Edit2, Trash2 }    from 'lucide-react';

import {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
} from '@/api/customers';

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
import { formatCurrencyCompact, formatDate } from '@/utils/formatters';
import { CUSTOMER_TYPES }                   from '@/utils/constants';
import { parseApiError, parseFieldErrors }  from '@/utils/api';

const PAGE_SIZE = 25;

const TYPE_VARIANT = {
  VIP:       'warning',
  Corporate: 'primary',
  Wholesale: 'info',
  Retail:    'default',
};

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];

// ── Form ─────────────────────────────────────────────────────────────────────
function CustomerForm({ initial = {}, onSubmit, loading, errors = {} }) {
  const [form, setForm] = useState({
    full_name:     initial.full_name     ?? '',
    email:         initial.email         ?? '',
    phone:         initial.phone         ?? '',
    region:        initial.region        ?? '',
    customer_type: initial.customer_type ?? 'Retail',
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <form id="cust-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <Modal.Body className="space-y-4">
        <Input label="Full Name"  value={form.full_name}  onChange={set('full_name')}  error={errors.full_name}  required autoFocus />
        <Input label="Email"      value={form.email}       onChange={set('email')}       error={errors.email}       type="email" />
        <Input label="Phone"      value={form.phone}       onChange={set('phone')}       error={errors.phone}       placeholder="+1 555 000 0000" />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Customer Type"
            value={form.customer_type}
            onChange={set('customer_type')}
            error={errors.customer_type}
            options={CUSTOMER_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Select
            label="Region"
            value={form.region}
            onChange={set('region')}
            error={errors.region}
            options={[{ value: '', label: 'Select region…' }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="cust-form" loading={loading}>
          {initial.id ? 'Save Changes' : 'Create Customer'}
        </Button>
      </Modal.Footer>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Customers() {
  useDocumentTitle('Customers');
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const [type,   setType]   = useState('');
  const [region, setRegion] = useState('');
  const dSearch             = useDebounce(search);

  const [modal,   setModal]   = useState(null);
  const [delRow,  setDelRow]  = useState(null);
  const [formErr, setFormErr] = useState({});
  const [apiErr,  setApiErr]  = useState('');

  const params = {
    page, page_size: PAGE_SIZE,
    ...(dSearch && { search: dSearch }),
    ...(type    && { customer_type: type }),
    ...(region  && { region }),
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', params],
    queryFn:  () => getCustomers(params),
    keepPreviousData: true,
  });

  const rows       = data?.results     ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count      = data?.count       ?? 0;

  function invalidate() { queryClient.invalidateQueries({ queryKey: ['customers'] }); }

  const createMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => { toast.success('Customer created.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: () => { toast.success('Customer updated.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => { toast.success('Customer deleted.'); setDelRow(null); invalidate(); },
    onError: (e) => toast.error(parseApiError(e)),
  });

  function openAdd()   { setFormErr({}); setApiErr(''); setModal('add'); }
  function openEdit(r) { setFormErr({}); setApiErr(''); setModal({ edit: r }); }

  function handleSubmit(form) {
    setFormErr({}); setApiErr('');
    if (modal === 'add') createMut.mutate(form);
    else                 updateMut.mutate({ id: modal.edit.id, data: form });
  }

  function resetFilters() { setSearch(''); setType(''); setRegion(''); setPage(1); }

  const editRow    = modal?.edit ?? null;
  const mutLoading = createMut.isPending || updateMut.isPending;
  const hasFilters = search || type || region;

  const columns = [
    {
      key: 'full_name', header: 'Customer',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900">{v}</p>
          <p className="text-xs text-gray-400">{row.email || row.phone || '—'}</p>
        </div>
      ),
    },
    {
      key: 'customer_type', header: 'Type',
      render: (v) => <Badge variant={TYPE_VARIANT[v] ?? 'default'}>{v}</Badge>,
    },
    { key: 'region', header: 'Region', render: (v) => v || '—' },
    {
      key: 'total_purchases', header: 'Orders',
      render: (v) => <span className="font-medium">{v ?? 0}</span>,
    },
    {
      key: 'total_spent', header: 'Total Spent',
      render: (v) => <span className="font-medium">{formatCurrencyCompact(v)}</span>,
    },
    {
      key: 'last_purchase_date', header: 'Last Purchase',
      render: (v) => v ? formatDate(v) : <span className="text-gray-400">—</span>,
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
        title="Customers"
        subtitle="Customer records and purchase history"
        action={<Button leftIcon={<Plus size={16} />} onClick={openAdd}>Add Customer</Button>}
      />

      {isError && <Alert type="error" title="Failed to load customers" />}

      <Card>
        {/* Filters */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search name, email, phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search size={15} />}
            className="w-64"
          />
          <Select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All types' },
              ...CUSTOMER_TYPES.map((t) => ({ value: t, label: t })),
            ]}
            className="w-40"
          />
          <Select
            value={region}
            onChange={(e) => { setRegion(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All regions' }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
            className="w-40"
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
            icon={Users}
            title="No customers found"
            message={hasFilters ? 'Try adjusting filters.' : 'Add your first customer.'}
            action={!hasFilters && <Button onClick={openAdd} leftIcon={<Plus size={15} />}>Add Customer</Button>}
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

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editRow ? 'Edit Customer' : 'Add Customer'} size="md">
        {apiErr && <div className="px-6 pt-4"><Alert type="error">{apiErr}</Alert></div>}
        <CustomerForm initial={editRow ?? {}} onSubmit={handleSubmit} loading={mutLoading} errors={formErr} />
      </Modal>

      <ConfirmDialog
        open={!!delRow}
        onClose={() => setDelRow(null)}
        onConfirm={() => deleteMut.mutate(delRow.id)}
        loading={deleteMut.isPending}
        title="Delete Customer"
        message={`Delete "${delRow?.full_name}"? Their sales history will remain but be unlinked.`}
      />
    </div>
  );
}
