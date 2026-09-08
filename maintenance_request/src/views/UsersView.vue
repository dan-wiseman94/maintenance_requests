<script setup lang="ts">

import { onMounted, ref } from 'vue';
import type { User } from '@/types';

import Table from '@/components/Table.vue';
import Pagination from '@/components/Pagination.vue';

const users = ref<User[]>([]);
const page = ref(1);
const pageSize = ref(20);
const totalCount = ref(0);
const busy = ref(false);
const loading = ref<boolean>(true);
const error = ref<Error | null>(null);
const userColumns = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'address', label: 'Address' },
    { key: 'userRole', label: 'Role' },
]

async function loadPage(pageNum: number): Promise<void> {
     try {
        busy.value = true;
        error.value = null;
        const params = new URLSearchParams({ page: String(pageNum), pageSize: String(pageSize.value) });
        const data = await fetch(`/api/User?${params}`);
        if (!data.ok) {
            throw new Error(`Failed to fetch users. ${data.status}`);
        }
        const body = await data.json();
        users.value = body.items;
        totalCount.value = body.totalCount;
        page.value = body.page;
    }
    catch (errorValue: unknown) {
        if (errorValue instanceof Error)
            error.value = errorValue;
    }
    finally {
        loading.value = false;
        busy.value = false;
    }
 }
onMounted(async () => {
    loadPage(1);
});

</script>

<template>

    <p v-if="loading === true"> LOADING </p>
    <p v-else-if="error">{{ error.message }}</p>

    <Table v-else :headers="userColumns" :items="users" />
    <Pagination :page="page" :pageSize="pageSize" :totalCount="totalCount" :busy="busy" @update:page="loadPage" />


</template>
