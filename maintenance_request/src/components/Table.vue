<script setup lang="ts">
import { toast } from 'vue-sonner';
import type { Header, Sort } from '@/types';
import { computed, ref } from 'vue';

interface Item {
  [key: string]: unknown;
  id?: string | number;
}

const props = defineProps<{
  headers: Header[];
  items: Item[];
  type: string;
  sort?: Sort;
  busy?: boolean;
}>();


const emit = defineEmits<{
  deleted: [id: string | number]
  'delete-failed': [message: string]
  'update:sort': [sort: Sort]
  updated: [id: string | number]
}>();

const deleteRow = async (rowType: string = "none", id?: string | number) => {
  if (id === undefined || id === null) {
    return;
  }

  try {
    const response = await fetch(`/api/${rowType}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`)
    } else {
      emit('deleted', id)
    }

  } catch (error) {
    toast.error('Failed to delete');
  }
};

// Id of the row in edit mode, and a copy of that row the inputs write to.
// Editing a copy leaves the parent's items untouched until the server confirms.
const editingId = ref<string | number | null>(null);
const draft = ref<Item | null>(null);

const isEditing = (item: Item): boolean =>
  item.id !== undefined && editingId.value === item.id;

const startEdit = (item: Item) => {
  if (item.id === undefined) return;
  editingId.value = item.id;
  draft.value = { ...item };
};

const saveEdit = async () => {
  const current = draft.value;
  if (current?.id === undefined) return;

  try {
    const response = await fetch(`/api/${props.type}/${current.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(current),
    });

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    editingId.value = null;
    draft.value = null;
    emit('updated', current.id);
  } catch (error) {
    toast.error('Failed to save');
  }
};

const directionFor = (header: Header): 'asc' | 'desc' | null => {
  if (props.sort?.key !== header.key) return null;
  return props.sort.desc ? 'desc' : 'asc';
};

const requestSort = (header: Header) => {
  const isActive = props.sort?.key === header.key;
  emit('update:sort', { key: header.key, desc: isActive ? !props.sort!.desc : false });
};

const canSort = computed(() => !props.busy);

</script>

<template>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th v-for="header in headers" :key="header.key">
            <!-- individual columns-->
            <button type="button" class="sort-button"
              :aria-sort="directionFor(header) === 'asc' ? 'ascending' : directionFor(header) === 'desc' ? 'descending' : 'none'"
              @click="requestSort(header)" :disabled="!canSort">
              {{ header.label }}
              <span class="sort-arrow" aria-hidden="true">
                <template v-if="directionFor(header) === 'asc'">&#x25B2;</template>
                <template v-else-if="directionFor(header) === 'desc'">&#x25BC;</template>
                <template v-else><span class="sort-arrow-both">&#x25B2;&#x25BC;</span></template>
              </span>
            </button>
          </th>
          <!-- TODO: make only available to Admin users (needs login system)-->
          <th>Edit</th>
          <th>Delete</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td :colspan="headers.length + 2" class="no-data">
            No data available.
          </td>
        </tr>

        <!-- loop through items to build rows -->
        <tr v-else v-for="(item, index) in items" :key="item.id ?? index">
          <td v-for="header in headers" :key="header.key">
            <!-- edit mode, only for columns the API will accept -->
            <input v-if="isEditing(item) && draft && header.editable !== false" v-model="draft[header.key]" />
            <!-- default read-only mode-->
            <slot v-else :name="`cell(${header.key})`" :item="item" :value="item[header.key]">
              {{ item[header.key] }}
            </slot>
          </td>
          <td>
            <button type="button" :aria-label="isEditing(item) ? 'Save' : 'Edit'" :aria-pressed="isEditing(item)"
              @click="isEditing(item) ? saveEdit() : startEdit(item)">
              <!-- floppy while editing, pencil otherwise -->
              <span aria-hidden="true">{{ isEditing(item) ? 'Save Changes \u{1F4BE}' : 'Edit \u270E' }}</span>
            </button>
          </td>
          <td>
            <button @click="deleteRow(type, item.id)">
              X
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-container {
  /* wide tables scroll inside the card; the page itself never scrolls sideways */
  overflow-x: auto;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background-color: var(--surface);
  box-shadow: var(--shadow-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.925rem;
  font-variant-numeric: tabular-nums;
}

.sort-button {
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.sort-button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.sort-arrow {
  color: var(--ink-faint);
  font-size: 0.65rem;
}

/* neutral state: both arrows stacked, sized to match the height of a single arrow */
.sort-arrow-both {
  display: inline-flex;
  flex-direction: column;
  font-size: 0.5em;
  line-height: 1;
}

[aria-sort="ascending"] .sort-arrow,
[aria-sort="descending"] .sort-arrow {
  color: var(--accent);
}

thead th {
  padding: 0.8rem 1rem;
  background-color: var(--surface-alt);
  border-bottom: 2px solid var(--rule-strong);
  color: var(--ink-soft);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

tbody td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--rule);
  vertical-align: top;
}

tbody tr:nth-child(even) td {
  background-color: var(--surface-alt);
}

tbody tr:hover td {
  background-color: var(--accent-wash);
}

tbody tr:last-child td {
  border-bottom: none;
}

.no-data {
  padding: var(--space-5) var(--space-3);
  color: var(--ink-faint);
  font-style: italic;
  text-align: center;
}

.no-data,
tbody tr:hover .no-data {
  background-color: transparent;
}
</style>
