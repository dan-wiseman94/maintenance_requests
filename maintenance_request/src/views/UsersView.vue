<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { User, Header, Sort } from '@/types'

import Table from '@/components/Table.vue'
import Pagination from '@/components/Pagination.vue'
import CreateUserModal from '@/components/CreateUserModal.vue'
const users = ref<User[]>([])
const page = ref(1)
const pageSize = ref(20)
// Mirrors the API's default ordering so the header arrow is correct before anyone clicks.
const sort = ref<Sort>({ key: 'lastName', desc: false })
const totalCount = ref(0)
const busy = ref(false)
const loading = ref<boolean>(true)
const error = ref<Error | null>(null)
const deleteError = ref<string | null>(null)
const showCreate = ref(false)

const userColumns: Header[] = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'address', label: 'Address' },
  { key: 'userRole', label: 'Role' },
]

async function loadPage(pageNum: number): Promise<void> {
  try {
    busy.value = true
    error.value = null
    const params = new URLSearchParams({
      page: String(pageNum),
      pageSize: String(pageSize.value),
      orderBy: sort.value.key,
      desc: String(sort.value.desc),
    })
    const data = await fetch(`/api/User?${params}`)
    if (!data.ok) {
      throw new Error(`Failed to fetch users. ${data.status}`)
    }
    const body = await data.json()
    users.value = body.items
    totalCount.value = body.totalCount
    page.value = body.page
  } catch (errorValue: unknown) {
    if (errorValue instanceof Error) error.value = errorValue
  } finally {
    loading.value = false
    busy.value = false
  }
}

// A new ordering invalidates the current page, so always restart from page 1.
function changeSort(next: Sort): void {
  sort.value = next
  loadPage(1)
}

onMounted(async () => {
  loadPage(1)
})
</script>

<template>
  <p v-if="loading === true">LOADING</p>
  <p v-else-if="error">{{ error.message }}</p>
  <div v-else>
    <button type="button" @click="showCreate = true">Create New User</button>
    <!-- A new row may land on any page under the current sort, so restart from page 1. -->
    <CreateUserModal v-model:open="showCreate" @created="loadPage(1)" />
    <Table
      :headers="userColumns"
      :items="users"
      :sort="sort"
      @update:sort="changeSort"
      type="User"
      @deleted="loadPage(page)"
      @updated="loadPage(page)"
      @delete-failed="deleteError = $event"
    />
    <Pagination
      :page="page"
      :pageSize="pageSize"
      :totalCount="totalCount"
      :busy="busy"
      @update:page="loadPage"
    />
  </div>
</template>
