<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { MaintenanceRequest } from '@/types';
import Table from '@/components/Table.vue';
import Pagination from '@/components/Pagination.vue';
const requestColumns = [
    { key: 'location', label: 'Location' },
    { key: 'maintenanceType', label: 'Maintenance Type' },
    { key: 'createdAt', label: 'Created At' },
    { key: 'createdByName', label: 'Created By' },
    { key: 'requestStatus', label: 'Status' },
]

const statusLabels: Record<string, string> = {
    Open: 'Open',
    InProgress: 'In Progress',
    Closed: 'Closed'
}
const requests = ref<MaintenanceRequest[]>([]);
const page = ref(1);
const pageSize = ref(20);
const totalCount = ref(0);
const busy = ref(false);
const loading = ref<boolean>(true);
const error = ref<Error | null>(null);

async function loadPage(pageNum: number): Promise<void> {
    try {
        busy.value = true;
        error.value = null;
        const params = new URLSearchParams({ page: String(pageNum), pageSize: String(pageSize.value) });
        const data = await fetch(`/api/MaintenanceRequest?${params}`);
        if (!data.ok) {
            throw new Error(`Failed to fetch requests. ${data.status}`);
        }
        const body = await data.json();
        requests.value = body.items;
        totalCount.value = body.totalCount;
        page.value = body.page;

    } catch (errorValue: unknown) {
        if (errorValue instanceof Error)
            error.value = errorValue;
    } finally {
        loading.value = false;
        busy.value = false;
    }
};

onMounted(async () => {
    loadPage(1);
});

</script>
<template>
    <p v-if="loading === true">LOADING</p>
    <p v-else-if="error"> {{ error.message }}</p>
    <Table v-else :headers="requestColumns" :items="requests">
        <template #cell(requestStatus)="{ value }">
            {{ statusLabels[value as string] ?? value }}
        </template>
    </Table>
    <Pagination :page="page" :pageSize="pageSize" :totalCount="totalCount" :busy="busy"
        @update:page="loadPage" />
</template>

