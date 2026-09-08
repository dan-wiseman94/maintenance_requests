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

h1 {
    margin: 0 0 var(--space-4);
    font-family: var(--font-display);
    font-size: clamp(1.55rem, 1rem + 2.2vw, 2.35rem);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: 0.01em;
    text-align: center;
    text-wrap: balance;
}

/* short accent rule under the title */
h1::after {
    content: "";
    display: block;
    width: 4rem;
    height: 3px;
    margin: var(--space-3) auto 0;
    border-radius: 2px;
    background-color: var(--accent);
}
</style>
