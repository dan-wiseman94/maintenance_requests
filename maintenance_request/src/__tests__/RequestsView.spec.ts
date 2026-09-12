import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from 'vitest-browser-vue'

import { flushPromises, mount } from '@vue/test-utils'

import RequestsView from '../views/RequestsView.vue'
import type { PagedResult, MaintenanceRequest } from '@/types'
import Pagination from '@/components/Pagination.vue'

describe('RequestsView', () => {

    afterEach(() => {
        vi.unstubAllGlobals();
    })

    it('retrieves data', async () => {
        const body: PagedResult<MaintenanceRequest> = {
            items: [
                { id: 1, location: 'Anywhere', maintenanceType: 'FakeCat', createdAt: 'Now', createdBy: 15, requestStatus: 'Do it', createdByName: 'Me Too' }
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

        const wrapper = await render(RequestsView, {
            global: {
                stubs: { RouterLink: true, RouterView: true }
            }
        });

        expect(fetchMock).toHaveBeenCalledWith('/api/MaintenanceRequest?page=1&pageSize=20');

        await expect.element(wrapper.getByText('Anywhere')).toBeInTheDocument();
        await expect.element(wrapper.getByText('LOADING')).not.toBeInTheDocument();
    })

    it('Shows LOADING on mount', async () => {
        const wrapper = mount(RequestsView)
        expect(wrapper.text()).toContain('LOADING')
    })

    it('shows error message when ok: false', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 500
        })
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(RequestsView)
        await flushPromises()

        expect(wrapper.text()).toContain('Failed to fetch requests. 500')
        expect(wrapper.text()).not.toContain('LOADING')
    })

    it('Passes page, pageSize, and totalCount to the Pagination element', async () => {
        const body: PagedResult<MaintenanceRequest> = {
            items: [],
            page: 3,
            pageSize: 20,
            totalCount: 42
        }

        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue(body)
        })

        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(RequestsView)
        await flushPromises()

        const pagination = wrapper.findComponent({ name: 'Pagination'})

        expect(pagination.exists()).toBe(true)
        expect(pagination.props('page')).toBe(3)
        expect(pagination.props('pageSize')).toBe(20)
        expect(pagination.props('totalCount')).toBe(42)
    })

    it('Shows loading state while a fetch is in flight', async () => {
        let resolveFetch: (value: any) => void 
        const fetchMock = vi.fn().mockImplementation(
            () => 
                new Promise((resolve) => {
                    resolveFetch = resolve
                }),
        )
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(RequestsView)
        await Promise.resolve()

        expect(fetchMock).toHaveBeenCalledWith('/api/MaintenanceRequest?page=1&pageSize=20')
        expect(wrapper.text()).toContain('LOADING')

        resolveFetch!({
            ok: true,
            json: vi.fn().mockResolvedValue({
                items: [],
                page: 1,
                pageSize: 20,
                totalCount: 0
            })
        })
        await flushPromises()

        expect(wrapper.text()).not.toContain('LOADING')
    }) 

    it('When second load is in flight, Pagination busy = true, then false afterward', async () => {
        const emptyPage = (page: number): PagedResult<MaintenanceRequest> => ({ items: [], page, pageSize: 20, totalCount: 40})

        let resolveSecond: (value: any) => void 

        const fetchMock = vi 
            .fn()
            .mockResolvedValueOnce({ok: true, json: vi.fn().mockResolvedValue(emptyPage(1))})
            .mockImplementationOnce(() => new Promise((resolve) => {resolveSecond = resolve}))
        
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(RequestsView)
        await flushPromises()

        const pagination = wrapper.findComponent(Pagination)
        expect(pagination.props('busy')).toBe(false)

        pagination.vm.$emit('update:page', 2)
        await flushPromises()

        expect(fetchMock).toHaveBeenLastCalledWith('/api/MaintenanceRequest?page=2&pageSize=20')
        expect(pagination.props('busy')).toBe(true)

        resolveSecond!({ok: true, json: vi.fn().mockResolvedValue(emptyPage(2))})
        await flushPromises()

        expect(pagination.props('busy')).toBe(false)
        expect(pagination.props('page')).toBe(2)
        

    })
})