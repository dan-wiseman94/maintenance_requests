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
        <button class="arrows" :class="{ disabled: !canNext }" @click="goTo(page + 1)">Next &#8594;</button>
        <div :style="{ textAlign: 'center', fontWeight: 'bold'}">Page {{ page }} of {{ totalPages }}</div>
    </div>
</template>

<style lang="css" scoped>
    .arrows {
        display: inline-block;
        border: var(--border);
        border-radius: var(--radius);
        height: 5ch;
        width: 20ch;
        text-align: center;
        cursor: pointer;
        user-select: none;
        margin: 1ch;
    }

    .arrows.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .arrows-container {
        padding: 2ch;
    }
</style>
