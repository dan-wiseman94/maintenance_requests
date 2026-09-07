<script setup lang="ts">

    import {onMounted, ref} from 'vue';
    import type {User} from '@/types';

    import Table from '@/components/Table.vue';
    const users = ref<User[]>([]);
    const loading = ref<boolean>(true);
    const error = ref<Error | null>(null);
    const userColumns = [
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName',  label: 'Last Name'  },
        { key: 'address',   label: 'Address'    },
        { key: 'userRole',  label: 'Role'       },
    ]
    
    onMounted(async () =>  {
        try {
                const data = await fetch('/api/User');
                if (!data.ok) {
                    throw new Error(`Failed to fetch users. ${data.status}`);
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
    
    <p v-if="loading === true"> LOADING </p>
    <p v-else-if="error">{{ error.message }}</p>
    
    <Table v-else :headers="userColumns" :items="users"/>

    
</template>