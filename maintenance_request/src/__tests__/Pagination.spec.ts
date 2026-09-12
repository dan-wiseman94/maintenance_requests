import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import Pagination from '../components/Pagination.vue'

import { makePagedMaintenanceRequests } from './fixtures/maintenanceRequests'

describe('Pagination', () => {
    it('Displays Page X of Y where Y is ceil(totalCount / pageSize)', async () => {
        // Pagination is a pure props component: it never fetches. The fixture
        // is only used to get page/pageSize/totalCount that match the API shape.
        const { page, pageSize, totalCount } = makePagedMaintenanceRequests(1, 20)

        const wrapper = await render(Pagination, {
            props: { page, pageSize, totalCount },
        })

        await expect.element(wrapper.getByText('Page 1 of 5')).toBeInTheDocument()
    })

    it('totalPages never below 1', async () => {
        const wrapper = await render(Pagination, {
            props: {page: 1, pageSize: 20, totalCount: 0}
        })

        await expect.element(wrapper.getByText('Page 1 of 1')).toBeInTheDocument()
    })

    it ('Clicking Next emits update:page with page + 1', async () => {
        const onUpdatePage = vi.fn()
        const wrapper = await render(Pagination, {
            props: {
                page: 1,
                pageSize: 20,
                totalCount: 40,
                'onUpdate:page': onUpdatePage,
            },
        })

        await wrapper.getByRole('button', { name: /next/i }).click()

        expect(onUpdatePage).toHaveBeenCalledWith(2)
    })

    it('Clicking Previous emites update:page with page - 1', async () => {
        const onUpdatePage = vi.fn()
        const wrapper = await render(Pagination, {
            props: {
                page: 2,
                pageSize: 20,
                totalCount: 40,
                'onUpdate:page': onUpdatePage
            }
        })
        await wrapper.getByRole('button', { name: /previous/i}).click()

        expect(onUpdatePage).toHaveBeenCalledWith(1);
    })
    it('On page 1, clicking Previous emits nothing and button is disabled', async () => {
         const onUpdatePage = vi.fn()
        const wrapper = await render(Pagination, {
            props: {
                page: 1,
                pageSize: 20,
                totalCount: 40,
                'onUpdate:page': onUpdatePage
            }
        })
        const button =  wrapper.getByRole('button', { name: /previous/i});
        await button.click();
        expect(onUpdatePage).not.toHaveBeenCalled()
        expect(button).toHaveClass('disabled')
    })

    it('Clicking Next on last page emits nothing', async () => {
        const onUpdatePage = vi.fn()
        const wrapper = await render(Pagination, {
            props: {
            page: 2,
            pageSize: 20,
            totalCount: 40,
            'onUpdate:page': onUpdatePage
            },
        })
        const button =  wrapper.getByRole('button', { name: /next/i});
        await button.click();
        expect(onUpdatePage).not.toHaveBeenCalled();
        expect(button).toHaveClass('disabled')
    })

    it('Nothing happens when Busy is true', async () => {
        const onUpdatePage = vi.fn()
        const wrapper = await render(Pagination, {
            props: {
            page: 1,
            pageSize: 20,
            totalCount: 40,
            'onUpdate:page': onUpdatePage,
            busy: true
            },
           
        })
        const nextButton =  wrapper.getByRole('button', { name: /next/i});
        await nextButton.click();
        expect(onUpdatePage).not.toHaveBeenCalled();
        expect(nextButton).toHaveClass('disabled')

        const prevButton =  wrapper.getByRole('button', { name: /previous/i});
        await prevButton.click();
        expect(onUpdatePage).not.toHaveBeenCalled();
        expect(prevButton).toHaveClass('disabled')
        
    })
});
