<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { MaintenanceRequest, Header, Sort } from '@/types';
import Table from '@/components/Table.vue';
import Pagination from '@/components/Pagination.vue';
const requestColumns: Header[] = [
    { key: 'location', label: 'Location' },
    { key: 'maintenanceType', label: 'Maintenance Type' },
    // Set by the server; the update endpoint ignores both.
    { key: 'createdAt', label: 'Created At', editable: false },
    { key: 'createdByName', label: 'Created By', editable: false },
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
const sort = ref<Sort>({ key: 'createdAt', desc: false });
const totalCount = ref(0);
const busy = ref(false);
const loading = ref<boolean>(true);
const error = ref<Error | null>(null);
const deleteError = ref<string | null>(null);

async function loadPage(pageNum: number): Promise<void> {
    try {
        busy.value = true;
        error.value = null;
        const params = new URLSearchParams({
            page: String(pageNum),
            pageSize: String(pageSize.value),
            orderBy: sort.value.key,
            desc: String(sort.value.desc),
        });
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

// A new ordering invalidates the current page, so always restart from page 1.
function changeSort(next: Sort): void {
    sort.value = next;
    loadPage(1);
}

onMounted(async () => {
    loadPage(1);
});

</script>
<template>
    <p v-if="loading === true">LOADING</p>
    <p v-else-if="error"> {{ error.message }}</p>
    <p v-if="deleteError">{{ deleteError }}</p>
    <Table v-else :headers="requestColumns" :items="requests" :sort="sort" @update:sort="changeSort" type="MaintenanceRequest" @deleted="loadPage(page)" @updated="loadPage(page)" @delete-failed="deleteError = $event">
        <template #cell(requestStatus)="{ value }">
            {{ statusLabels[value as string] ?? value }}
        </template>
    </Table>
    <Pagination :page="page" :pageSize="pageSize" :totalCount="totalCount" :busy="busy"
        @update:page="loadPage" />
</template>

