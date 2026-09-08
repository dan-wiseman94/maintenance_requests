<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ page: number; pageSize: number; totalCount: number; busy?: boolean }>();
const emit = defineEmits<{ (e: 'update:page', value: number): void }>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.totalCount / props.pageSize)));
const canPrev = computed(() => !props.busy && props.page > 1);
const canNext = computed(() => !props.busy && props.page < totalPages.value);

function goTo(target: number): void {
    if (props.busy || target < 1 || target > totalPages.value) {
        return;
    }
    emit('update:page', target);
}

</script>


<template>
    <div class="arrows-container">
        <button class="arrows" :class="{ disabled: !canPrev }" @click="goTo(page - 1)">&#8592; Previous</button>
        <div class="page-indicator">Page {{ page }} of {{ totalPages }}</div>
        <button class="arrows" :class="{ disabled: !canNext }" @click="goTo(page + 1)">Next &#8594;</button>
    </div>
</template>

<style lang="css" scoped>
.arrows-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--space-2) var(--space-4);
    margin-top: var(--space-4);
}

.arrows {
    padding: 0.55rem 1.25rem;
    border: var(--border);
    border-radius: 999px;
    background-color: var(--surface);
    color: var(--ink-soft);
    font-size: 0.9rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}

.arrows:hover:not(.disabled) {
    background-color: var(--accent-wash);
    border-color: var(--accent);
    color: var(--accent);
}

.arrows:active:not(.disabled) {
    transform: translateY(1px);
}

.arrows.disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

.page-indicator {
    min-width: 12ch;
    color: var(--ink-soft);
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
    text-align: center;
}
</style>
