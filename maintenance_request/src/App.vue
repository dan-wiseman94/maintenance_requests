<script setup lang="ts">
</script>

<template>

    <main>
        <div class="center">
            <h1>Residential Maintenance Requests</h1>
            <nav class="link-bar">
                <RouterLink to="/">Default</RouterLink>
                <RouterLink to="/users">View Users</RouterLink>
                <RouterLink to="/requests">View Requests</RouterLink>
            </nav>
            <RouterView />
        </div>
    </main>
</template>

<style scoped>
main {
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>
