import { describe, it, expect, vi, afterEach } from 'vitest'

import { flushPromises, mount } from '@vue/test-utils'
import UsersView from '../views/UsersView.vue'
import type { PagedResult, User } from '@/types'
import Pagination from '@/components/Pagination.vue'

describe('UsersView', () => {
    
    afterEach(() => {
        vi.unstubAllGlobals();
    })

    it('retrieves data', async () => {
        const body: PagedResult<User> = {
            items: [
                { id: 1, firstName: 'Alice', lastName: 'Smith', address: '1 Main St', userRole: 'Tenant' },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
        }
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(body),
        })
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(UsersView)
        await flushPromises()

        expect(fetchMock).toHaveBeenCalledWith('/api/User?page=1&pageSize=20')
        expect(wrapper.text()).toContain('Alice')
        expect(wrapper.text()).toContain('Smith')
        expect(wrapper.text()).not.toContain('LOADING')
    })

    it('Shows LOADING on mount', async () => {
        const wrapper = mount(UsersView);

        expect(wrapper.text()).toContain('LOADING')

    })
    it('shows error message when ok: false', async () => {

        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        })
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(UsersView)
        await flushPromises()

        expect(wrapper.text()).toContain('Failed to fetch users. 500')
        expect(wrapper.text()).not.toContain('LOADING')
    })

    it('Passes page, pageSize, and totalCount to the Pagination element', async () => {
        const body: PagedResult<User> = {
            items: [],
            page: 3,
            pageSize: 20,
            totalCount: 42,
        }
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(body),
        })
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(UsersView)
        await flushPromises()

        const pagination = wrapper.findComponent({ name: 'Pagination' })

        expect(pagination.exists()).toBe(true)
        expect(pagination.props('page')).toBe(3)
        expect(pagination.props('pageSize')).toBe(20)
        expect(pagination.props('totalCount')).toBe(42)
    })

    it('shows loading state while a fetch is in flight', async () => {
        let resolveFetch: (value: any) => void
        const fetchMock = vi.fn().mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve
                }),
        )
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(UsersView)
        await Promise.resolve()

        expect(fetchMock).toHaveBeenCalledWith('/api/User?page=1&pageSize=20')
        expect(wrapper.text()).toContain('LOADING')

        resolveFetch!({
            ok: true,
            json: vi.fn().mockResolvedValue({
                items: [],
                page: 1,
                pageSize: 20,
                totalCount: 0,
            }),
        })
        await flushPromises()

        expect(wrapper.text()).not.toContain('LOADING')
    })

    it('When second load is in flight, Pagination busy = true, then false afterward', async () => {
        const emptyPage = (page: number): PagedResult<User> => ({ items: [], page, pageSize: 20, totalCount: 40 })

        let resolveSecond: (value: any) => void
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue(emptyPage(1)) })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve }))
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(UsersView)
        await flushPromises()

        const pagination = wrapper.findComponent(Pagination)
        expect(pagination.props('busy')).toBe(false)

        // Simulate the user clicking Next: Pagination emits, UsersView calls loadPage(2).
        pagination.vm.$emit('update:page', 2)
        await flushPromises()

        expect(fetchMock).toHaveBeenLastCalledWith('/api/User?page=2&pageSize=20')
        expect(pagination.props('busy')).toBe(true)

        resolveSecond!({ ok: true, json: vi.fn().mockResolvedValue(emptyPage(2)) })
        await flushPromises()

        expect(pagination.props('busy')).toBe(false)
        expect(pagination.props('page')).toBe(2)
    })

})
