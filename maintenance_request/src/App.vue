  <script setup lang="ts">
</script>

<template>
    <h1>Residential Maintenance Requests</h1>
    <nav>
        <RouterLink to="/">Default</RouterLink>
        <br>
        <RouterLink to="/users">View Users</RouterLink>
        <br>
        <RouterLink to="/requests">View Requests</RouterLink>
    </nav> 
    <main>
        <RouterView/>
    </main> 
</template>

<style scoped>
    main {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>

