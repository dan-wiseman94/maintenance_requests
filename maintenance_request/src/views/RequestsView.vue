<script setup lang="ts">
    import {onMounted, ref} from 'vue';
    import type { MaintenanceRequest } from '@/types';
    import Table from '@/components/Table.vue';
    const requestColumns = [
        {key: 'location', label: 'Location'},
        {key: 'maintenanceType', label: 'Maintenance Type'},
        {key: 'createdAt', label: 'Created At'},
        {key: 'createdByName', label: 'Created By'},
        {key: 'requestStatus', label: 'Status'},
    ]

    const statusLabels: Record<string, string> = {
        Open: 'Open',
        InProgress: 'In Progress',
        Closed: 'Closed'
    }
    const requests = ref<MaintenanceRequest[]>([]);
    const loading = ref<boolean>(true);
    const error = ref<Error | null>(null);

    onMounted(async () => {
        try {
            const data = await fetch('/api/MaintenanceRequest');
            if (!data.ok) {
                throw new Error(`Failed to fetch requests. ${data.status}`);
            }
            requests.value = await data.json() as MaintenanceRequest[];
        } catch (errorValue: unknown) {
            if (errorValue instanceof Error) 
                error.value = errorValue;
        } finally {
            loading.value = false;
        }
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
</template>
