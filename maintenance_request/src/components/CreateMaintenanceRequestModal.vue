<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import type { MaintenanceRequest, PagedResult, User } from '@/types'
import Modal from './Modal.vue'

// What the API's CreateMaintenanceRequest record accepts. createdAt and
// createdByName are server-derived, so they are not part of the form.
type NewRequest = {
  location: string
  maintenanceType: string
  // '' is the unselected placeholder; `required` on the select blocks submit while it is chosen.
  createdBy: number | ''
  requestStatus: string
}

// Must match the RequestStatus enum names; the API rejects integers.
const statuses = [
  { value: 'Open', label: 'Open' },
  { value: 'InProgress', label: 'In Progress' },
  { value: 'Closed', label: 'Closed' },
] as const

const maintenanceTypes = [
  { value: 'Plumbing', label: 'Plumbing' },
  { value: 'Electrical', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'Appliance', label: 'Appliance' },
  { value: 'Structural', label: 'Structural' },
  { value: 'Landscaping', label: 'Landscaping' },
  { value: 'Pest Control', label: 'Pest Control' },
  { value: 'Painting', label: 'Painting' },
] as const

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: [request: MaintenanceRequest]
}>()

const emptyRequest = (): NewRequest => ({
  location: '',
  maintenanceType: '',
  createdBy: '',
  requestStatus: statuses[0].value,
})



const draft = ref<NewRequest>(emptyRequest())
const pending = ref(false)

// Users for the "created by" picker. Loaded lazily when the modal opens so
// the view's initial render does not depend on a second request.
const users = ref<User[]>([])
const usersError = ref<string | null>(null)

const loadUsers = async () => {
  usersError.value = null
  try {
    // TODO: the User endpoint caps pageSize at 100; a search box would be needed beyond that.
    const params = new URLSearchParams({
      page: '1',
      pageSize: '100',
      orderBy: 'lastName',
      desc: 'false',
    })
    const response = await fetch(`/api/User?${params}`)
    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`)
    }
    const body: PagedResult<User> = await response.json()
    users.value = body.items
  } catch {
    usersError.value = 'Could not load users'
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    loadUsers()
  } else {
    // Reset on every close so a cancelled form does not reappear half-filled.
    draft.value = emptyRequest()
  }
})

const submit = async () => {
  pending.value = true
  try {
    const response = await fetch('/api/MaintenanceRequest/CreateMaintenanceRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft.value),
    })

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`)
    }

    const created: MaintenanceRequest = await response.json()
    emit('created', created)
    open.value = false
  } catch {
    toast.error('Failed to create maintenance request')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Modal v-model:open="open">
    <form class="create-request" @submit.prevent="submit">
      <h2>Create New Maintenance Request</h2>

      <label for="create-request-location">Location</label>
      <input
        id="create-request-location"
        v-model.trim="draft.location"
        type="text"
        required
        maxlength="255"
      />

      <label for="create-request-maintenanceType">Maintenance type</label>
      <select
        id="create-request-maintenanceType"
        v-model.trim="draft.maintenanceType"
        required
      >
        <option value="" disabled>Select a maintenance type</option>
        <option v-for="type in maintenanceTypes" :key="type.value" :value="type.value">
          {{ type.label }}
        </option>
      </select>

      <label for="create-request-createdBy">Created by</label>
      <input id="create-request-createdBy" v-model="draft.createdBy" required>
      </input>
      <p v-if="usersError" class="field-error">{{ usersError }}</p>

      <label for="create-request-requestStatus">Status</label>
      <select id="create-request-requestStatus" v-model="draft.requestStatus" required>
        <option v-for="status in statuses" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>

      <div class="actions">
        <button type="button" :disabled="pending" @click="open = false">Cancel</button>
        <button type="submit" :disabled="pending">{{ pending ? 'Saving…' : 'Create' }}</button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.create-request {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.create-request h2 {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
}

.create-request label {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.create-request input,
.create-request select {
  padding: 0.5rem 0.65rem;
  border: var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--surface);
  font: inherit;
}

.create-request input:focus-visible,
.create-request select:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.field-error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--accent);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
