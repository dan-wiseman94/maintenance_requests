<script setup lang="ts">

    import {onMounted, ref} from 'vue';
    import type {User} from '@/types';

    import Table from '@/components/Table.vue';
    const users = ref<User[]>([]);
    const loading = ref<boolean>(true);
    const error = ref<Error | null>(null);
    
    onMounted(async () =>  {
        try {
                const data = await fetch('/api/User');
                if (!data.ok) {
                    throw new Error("Failed to fetch users.");
                }
                users.value = await data.json() as User[];
            } 
            catch (errorValue: unknown) {
                if (errorValue instanceof Error)
                error.value = errorValue;
            } 
            finally {
                loading.value = false;
        }   
    });

</script>

<template>
    <h1>
     Hello from UsersView!
    </h1>
    <p v-if="loading === true"> LOADING </p>
    <p v-if="error">{{ error.message }}</p>
    
    <Table v-else>

    </Table>
    
</template>