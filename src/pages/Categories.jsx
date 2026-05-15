/**
 * Categories CRUD page
 */
import { useState }                              from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Tag, Edit2, Trash2 }      from 'lucide-react';

import {
  getCategories, createCategory, updateCategory, deleteCategory,
} from '@/api/categories';

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
import { parseApiError, parseFieldErrors } from '@/utils/api';

const PAGE_SIZE = 25;

// ── Form ─────────────────────────────────────────────────────────────────────
function CategoryForm({ initial = {}, onSubmit, loading, errors = {} }) {
  const [form, setForm] = useState({
    category_name: initial.category_name ?? '',
    description:   initial.description   ?? '',
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <form id="cat-form" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <Modal.Body className="space-y-4">
        <Input
          label="Category Name"
          value={form.category_name}
          onChange={set('category_name')}
          error={errors.category_name}
          required
          autoFocus
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Optional description…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="cat-form" loading={loading}>
          {initial.id ? 'Save Changes' : 'Create Category'}
        </Button>
      </Modal.Footer>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Categories() {
  useDocumentTitle('Categories');
  const { toast }   = useToast();
  const queryClient = useQueryClient();

  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');
  const dSearch             = useDebounce(search);

  const [modal,   setModal]   = useState(null);   // null | 'add' | { edit: row }
  const [delRow,  setDelRow]  = useState(null);
  const [formErr, setFormErr] = useState({});
  const [apiErr,  setApiErr]  = useState('');

  const params = { page, page_size: PAGE_SIZE, ...(dSearch && { search: dSearch }) };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories', params],
    queryFn:  () => getCategories(params),
    keepPreviousData: true,
  });

  const rows       = data?.results      ?? [];
  const totalPages = data?.total_pages  ?? 1;
  const count      = data?.count        ?? 0;

  function invalidate() { queryClient.invalidateQueries({ queryKey: ['categories'] }); }

  const createMut = useMutation({
    mutationFn: createCategory,
    onSuccess: () => { toast.success('Category created.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: () => { toast.success('Category updated.'); setModal(null); invalidate(); },
    onError: (e) => { setFormErr(parseFieldErrors(e)); setApiErr(parseApiError(e)); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteCategory(id),
    onSuccess: () => { toast.success('Category deleted.'); setDelRow(null); invalidate(); },
    onError: (e) => toast.error(parseApiError(e)),
  });

  function openAdd()    { setFormErr({}); setApiErr(''); setModal('add'); }
  function openEdit(r)  { setFormErr({}); setApiErr(''); setModal({ edit: r }); }

  function handleSubmit(form) {
    setFormErr({}); setApiErr('');
    if (modal === 'add') createMut.mutate(form);
    else                 updateMut.mutate({ id: modal.edit.id, data: form });
  }

  const editRow     = modal?.edit ?? null;
  const mutLoading  = createMut.isPending || updateMut.isPending;

  const columns = [
    { key: 'id',            header: '#',          className: 'w-12 text-gray-400 text-xs' },
    { key: 'category_name', header: 'Name',       render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'description',   header: 'Description',render: (v) => <span className="text-gray-500 line-clamp-1">{v || '—'}</span> },
    { key: 'product_count', header: 'Products',   render: (v) => <Badge variant="default">{v ?? 0}</Badge> },
    {
      key: 'active_product_count',
      header: 'Active',
      render: (v) => <Badge variant="success">{v ?? 0}</Badge>,
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
        title="Categories"
        subtitle="Manage product categories"
        action={<Button leftIcon={<Plus size={16} />} onClick={openAdd}>Add Category</Button>}
      />

      {isError && <Alert type="error" title="Failed to load categories" />}

      <Card>
        <div className="px-5 py-4 border-b border-gray-100">
          <Input
            placeholder="Search categories…"
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
            icon={Tag}
            title="No categories found"
            message={search ? 'Try a different search term.' : 'Add your first category to get started.'}
            action={!search && <Button onClick={openAdd} leftIcon={<Plus size={15} />}>Add Category</Button>}
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

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editRow ? 'Edit Category' : 'Add Category'} size="md">
        {apiErr && <div className="px-6 pt-4"><Alert type="error">{apiErr}</Alert></div>}
        <CategoryForm initial={editRow ?? {}} onSubmit={handleSubmit} loading={mutLoading} errors={formErr} />
      </Modal>

      <ConfirmDialog
        open={!!delRow}
        onClose={() => setDelRow(null)}
        onConfirm={() => deleteMut.mutate(delRow.id)}
        loading={deleteMut.isPending}
        title="Delete Category"
        message={`Delete "${delRow?.category_name}"? Products in this category may be affected.`}
      />
    </div>
  );
}
