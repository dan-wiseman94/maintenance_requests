<script setup lang="ts">
  interface Header {
    key: string;
    label: string;
  }

  interface Item {
    [key: string]: unknown;
    id?: string | number;
  }

  defineProps<{
    headers: Header[];
    items: Item[];
  }>();
</script>

<template>
  <div class="table-container" >
    <table>
      <thead>
        <tr>
          <th v-for="header in headers" :key="header.key">
            {{ header.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="items.length === 0">
          <td :colspan="headers.length" class="no-data">
            No data available.
          </td>
        </tr>

        <!-- loop through items to build rows -->
         <tr v-else  v-for="(item, index) in items" :key="item.id ?? index">
            <td v-for="header in headers" :key="header.key">
              <slot :name="`cell(${header.key})`" :item="item" :value="item[header.key]">
                {{ item[header.key] }}
              </slot>
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
