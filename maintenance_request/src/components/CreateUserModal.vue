<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import type { User } from '@/types'
import Modal from './Modal.vue'

type NewUser = Omit<User, 'id'>

// Must match the UserRole enum names: the API serialises enums as strings
// and rejects integers (JsonStringEnumConverter with allowIntegerValues: false).
const userRoles = ['Tenant', 'Maintenance', 'Admin'] as const

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  created: [user: User]
}>()

const emptyUser = (): NewUser => ({
  firstName: '',
  lastName: '',
  address: '',
  userRole: userRoles[0],
})

const draft = ref<NewUser>(emptyUser())
const pending = ref(false)

// Reset on every close (Escape, X, backdrop, or success) so a cancelled
// form does not reappear half-filled next time.
watch(open, (isOpen) => {
  if (!isOpen) draft.value = emptyUser()
})

const submit = async () => {
  pending.value = true
  try {
    const response = await fetch('/api/User', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft.value),
    })

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`)
    }

    const created: User = await response.json()
    emit('created', created)
    open.value = false
  } catch {
    toast.error('Failed to create user')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Modal v-model:open="open">
    <form class="create-user" @submit.prevent="submit">
      <h2>Create New User</h2>

      <label for="create-user-firstName">First name</label>
      <input
        id="create-user-firstName"
        v-model.trim="draft.firstName"
        type="text"
        required
        maxlength="255"
      />

      <label for="create-user-lastName">Last name</label>
      <input
        id="create-user-lastName"
        v-model.trim="draft.lastName"
        type="text"
        required
        maxlength="255"
      />

      <label for="create-user-address">Address</label>
      <input
        id="create-user-address"
        v-model.trim="draft.address"
        type="text"
        required
        maxlength="255"
      />

      <label for="create-user-userRole">Role</label>
      <select id="create-user-userRole" v-model="draft.userRole" required>
        <option v-for="role in userRoles" :key="role" :value="role">{{ role }}</option>
      </select>

      <div class="actions">
        <button type="button" :disabled="pending" @click="open = false">Cancel</button>
        <button type="submit" :disabled="pending">{{ pending ? 'Saving…' : 'Create' }}</button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.create-user {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.create-user h2 {
  margin: 0 0 0.75rem;
  font-family: var(--font-display);
}

.create-user label {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
}

.create-user input,
.create-user select {
  padding: 0.5rem 0.65rem;
  border: var(--border);
  border-radius: var(--radius-sm);
  background-color: var(--surface);
  font: inherit;
}

.create-user input:focus-visible,
.create-user select:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
