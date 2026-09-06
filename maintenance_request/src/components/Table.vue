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

        <!-- loop throw items to build rows -->
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

<style scoped></style>
