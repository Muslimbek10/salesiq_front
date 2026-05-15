/**
 * Branches CRUD page
 */
import { useState }                              from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Edit2, Trash2 } from 'lucide-react';

import {
  getBranches, createBranch, updateBranch, deleteBranch,
} from '@/api/branches';

import { PageHeader }    from '@/components/layout/PageHeader';
import { Button }        from '@/components/ui/Button';
import { Input }         from '@/components/ui/Input';
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
import { formatCurrencyCompact, formatNumber } from '@/utils/formatters';
import { parseApiError, parseFieldErrors }     from '@/utils/api';

const PAGE_SIZE = 25;

// ── Form ─────────────────────────────────────────────────────────────────────
function BranchForm({ initial = {}, onSubmit, loading, errors = {} }) {
  const [form, setForm] = useState({
    branch_name:  initial.branch_name  ?? '',
    location:     initial.location     ?? '',
    manager_name: initial.manager_name ?? '',
    is_active:    initial.is_active    ?? true,
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <form id="branch-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <Modal.Body className="space-y-4">
        <Input
          label="Branch Name"
          value={form.branch_name}
          onChange={set('branch_name')}
          error={errors.branch_name}
          required
          autoFocus
        />
        <Input
          label="Location"
          value={form.location}
          onChange={set('location')}
          error={errors.location}
          placeholder="City, Address"
          required
        />
        <Input
          label="Manager Name"
          value={form.manager_name}
          onChange={set('manager_name')}
          error={errors.manager_name}
          placeholder="Full name"
        />
        <div className="flex items-center gap-3">
          <input
            id="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">
            Branch is active
          </label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="branch-form" loading={loading}>
          {initial.id ? 'Save Changes' : 'Create Branch'}
        </Button>
      </Modal.Footer>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Branches() {
  useDocumentTitle('Branches');
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const dSearch             = useDebounce(search);

  const [modal,   setModal]   = useState(null);
  const [delRow,  setDelRow]  = useState(null);
  const [formErr, setFormErr] = useState({});
  const [apiErr,  setApiErr]  = useState('');

  const params = { page, page_size: PAGE_SIZE, ...(dSearch && { search: dSearch }) };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['branches', params],
    queryFn:  () => getBranches(params),
    keepPreviousData: true,
  });

  const rows       = data?.results     ?? [];
  const totalPages = data?.total_pages ?? 1;
  const count      = data?.count       ?? 0;

  function invalidate() { queryClient.invalidateQueries({ queryKey: ['branches'] }); }

  const createMut = useMutation({
    mutationFn: createBranch,
    onSuccess: () => { toast.success('Branch created.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateBranch(id, data),
    onSuccess: () => { toast.success('Branch updated.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteBranch(id),
    onSuccess: () => { toast.success('Branch deleted.'); setDelRow(null); invalidate(); },
    onError: (e) => toast.error(parseApiError(e)),
  });

  function openAdd()   { setFormErr({}); setApiErr(''); setModal('add'); }
  function openEdit(r) { setFormErr({}); setApiErr(''); setModal({ edit: r }); }

  function handleSubmit(form) {
    setFormErr({}); setApiErr('');
    if (modal === 'add') createMut.mutate(form);
    else                 updateMut.mutate({ id: modal.edit.id, data: form });
  }

  const editRow    = modal?.edit ?? null;
  const mutLoading = createMut.isPending || updateMut.isPending;

  const columns = [
    { key: 'id',           header: '#',          className: 'w-12 text-gray-400 text-xs' },
    {
      key: 'branch_name', header: 'Branch',
      render: (v, row) => (
        <div>
          <p className="font-medium text-gray-900">{v}</p>
          <p className="text-xs text-gray-400">{row.location}</p>
        </div>
      ),
    },
    { key: 'manager_name',     header: 'Manager',      render: (v) => v || '—' },
    {
      key: 'total_revenue',    header: 'Revenue',
      render: (v) => <span className="font-medium">{formatCurrencyCompact(v)}</span>,
    },
    { key: 'total_profit',     header: 'Profit',       render: (v) => formatCurrencyCompact(v) },
    { key: 'total_transactions', header: 'Transactions', render: (v) => formatNumber(v) },
    {
      key: 'is_active', header: 'Status',
      render: (v) => v
        ? <Badge variant="success" dot>Active</Badge>
        : <Badge variant="danger"  dot>Inactive</Badge>,
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
        title="Branches"
        subtitle="Branch locations and performance"
        action={<Button leftIcon={<Plus size={16} />} onClick={openAdd}>Add Branch</Button>}
      />

      {isError && <Alert type="error" title="Failed to load branches" />}

      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <Input
            placeholder="Search branches…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            leftIcon={<Search size={15} />}
            className="max-w-xs"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No branches found"
            message={search ? 'Try a different search term.' : 'Add your first branch to get started.'}
            action={!search && <Button onClick={openAdd} leftIcon={<Plus size={15} />}>Add Branch</Button>}
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

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editRow ? 'Edit Branch' : 'Add Branch'} size="md">
        {apiErr && <div className="px-6 pt-4"><Alert type="error">{apiErr}</Alert></div>}
        <BranchForm initial={editRow ?? {}} onSubmit={handleSubmit} loading={mutLoading} errors={formErr} />
      </Modal>

      <ConfirmDialog
        open={!!delRow}
        onClose={() => setDelRow(null)}
        onConfirm={() => deleteMut.mutate(delRow.id)}
        loading={deleteMut.isPending}
        title="Delete Branch"
        message={`Delete "${delRow?.branch_name}"? All associated sales data will be unlinked.`}
      />
    </div>
  );
}
