<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'

// `open` is the single source of truth. The dialog element is driven from it
// (showModal/close) and reports back through @close so Escape stays in sync.
const open = defineModel<boolean>('open', { default: false })

const dialog = useTemplateRef<HTMLDialogElement>('dialog')

watch(
  open,
  (isOpen) => {
    const el = dialog.value
    if (!el) return
    if (isOpen && !el.open) el.showModal()
    else if (!isOpen && el.open) el.close()
  },
  { flush: 'post' },
)

// Fires for Escape, the X button, and any programmatic close().
const onClose = () => {
  open.value = false
}

// Clicks inside the panel bubble up to the dialog too, so only treat a click
// whose target *is* the dialog (i.e. the backdrop) as a dismissal.
const onBackdropClick = (event: MouseEvent) => {
  if (event.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog ref="dialog" class="modal" @close="onClose" @click="onBackdropClick">
    <div class="modal-panel">
      <button type="button" class="modal-close" aria-label="Close" @click="open = false">
        &times;
      </button>
      <slot></slot>
    </div>
  </dialog>
</template>

<style scoped>
.modal {
  padding: 0;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background-color: var(--surface);
  color: var(--ink);
  box-shadow: var(--shadow);
  width: min(28rem, calc(100vw - 2rem));
}

.modal::backdrop {
  background-color: rgb(35 28 16 / 0.45);
}

.modal-panel {
  position: relative;
  padding: var(--space-5, 1.5rem);
}

.modal-close {
  all: unset;
  position: absolute;
  top: 0.5rem;
  right: 0.75rem;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--ink-faint);
}

.modal-close:hover {
  color: var(--ink);
}

.modal-close:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
