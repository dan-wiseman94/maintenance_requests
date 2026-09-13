import { describe, it, expect, vi, afterEach } from 'vitest'

import { mount, flushPromises } from '@vue/test-utils'
import Table from '@/components/Table.vue'

describe('Table', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    })

    it('Shows No data available when empty', () => {
        const wrapper = mount(Table, {
            props: {
                headers: [{key: 'One', label: 'one'}, {key: 'Two', label: 'one'}],
                items: []
            }
        });
        expect(wrapper.text()).toContain('No data available.');
    })
    it('renders 1 <th> per header, with label text', () => {
        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'location', label: 'Location' }, { key: 'maintenanceType', label: 'Maintenance Type' }],
                items: []
            }
        })

        const headers = wrapper.findAll('th')
        expect(headers).toHaveLength(4)
        expect(headers.map(th => th.text())).toEqual(['Location ▲▼', 'Maintenance Type ▲▼',  "Edit", "Delete",])
    })
    it('Renders one body row per item', () => {
        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'location', label: 'Location' }, { key: 'maintenanceType', label: 'Maintenance Type' }],
                items: [{
                    id: 1,
                    location: 'Here',
                    maintenanceType: 'Something',
                    createdAt: '2024-01-15T10:30:00Z',
                    createdBy: 'Alex Morgan'
                },
                {
                    id: 2,
                    location: 'There',
                    maintenanceType: 'Something Else',
                    createdAt: '2024-02-15T10:30:00Z',
                    createdBy: 'Not Alex Morgan'
                },
                ]
            }
        })

        const rows = wrapper.findAll('tbody tr')
        expect(rows).toHaveLength(2)

        const cellText = rows.map(row => row.findAll('td').map(td => td.text()))
        expect(cellText).toEqual([
            ['Here', 'Something', 'Edit ✎', 'X'],
            ['There', 'Something Else', 'Edit ✎', 'X'],
        ])
    })

    it('emits update:sort ascending when an unsorted column is clicked', async () => {
        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'location', label: 'Location' }, { key: 'maintenanceType', label: 'Maintenance Type' }],
                items: [],
                type: 'MaintenanceRequest',
                sort: { key: 'location', desc: false },
            }
        })

        await wrapper.findAll('th button')[1]!.trigger('click')

        expect(wrapper.emitted('update:sort')).toEqual([[{ key: 'maintenanceType', desc: false }]])
    })
    it('emits update:sort with flipped direction when the active column is clicked', async () => {
        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'location', label: 'Location' }],
                items: [],
                type: 'MaintenanceRequest',
                sort: { key: 'location', desc: false },
            }
        })

        await wrapper.find('th button').trigger('click')

        expect(wrapper.emitted('update:sort')).toEqual([[{ key: 'location', desc: true }]])
    })
    it('marks only the active column with aria-sort', () => {
        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'location', label: 'Location' }, { key: 'maintenanceType', label: 'Maintenance Type' }],
                items: [],
                type: 'MaintenanceRequest',
                sort: { key: 'maintenanceType', desc: true },
            }
        })

        const buttons = wrapper.findAll('th button')
        expect(buttons[0]!.attributes('aria-sort')).toBe('none')
        expect(buttons[1]!.attributes('aria-sort')).toBe('descending')
    })

    it('swaps the edit icon to save on click, and back once the save succeeds', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'location', label: 'Location' }],
                items: [{ id: 1, location: 'Here' }, { id: 2, location: 'There' }],
                type: 'MaintenanceRequest',
            }
        })

        const editButtons = wrapper.findAll('tbody button[aria-label]')
        expect(editButtons.map(b => b.attributes('aria-label'))).toEqual(['Edit', 'Edit'])

        await editButtons[0]!.trigger('click')
        expect(editButtons[0]!.attributes('aria-label')).toBe('Save')
        expect(editButtons[0]!.text()).toBe('Save Changes \u{1F4BE}')
        expect(editButtons[1]!.attributes('aria-label')).toBe('Edit')

        await editButtons[0]!.trigger('click')
        await flushPromises()
        expect(editButtons[0]!.attributes('aria-label')).toBe('Edit')
        expect(editButtons[0]!.text()).toBe('Edit \u270E')
    })

    it('PUTs the edited draft on save and emits updated', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'firstName', label: 'First Name' }, { key: 'address', label: 'Address' }],
                items: [{ id: 1, firstName: 'Alice', address: '1 Main St', userRole: 'Tenant' }],
                type: 'User',
            }
        })

        const editButton = wrapper.find('tbody button[aria-label="Edit"]')
        await editButton.trigger('click')

        const inputs = wrapper.findAll('tbody input')
        expect(inputs).toHaveLength(2)
        await inputs[1]!.setValue('99 New Rd')

        await wrapper.find('tbody button[aria-label="Save"]').trigger('click')
        await flushPromises()

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]!
        expect(url).toBe('/api/User/1')
        expect(init.method).toBe('PUT')
        expect(JSON.parse(init.body)).toEqual({ id: 1, firstName: 'Alice', address: '99 New Rd', userRole: 'Tenant' })

        expect(wrapper.emitted('updated')).toEqual([[1]])
        expect(wrapper.find('tbody input').exists()).toBe(false)
        // the parent's item is untouched until it reloads
        expect(wrapper.props('items')[0]!.address).toBe('1 Main St')
    })
    it('stays in edit mode and does not emit when the save fails', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 })
        vi.stubGlobal('fetch', fetchMock)

        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'address', label: 'Address' }],
                items: [{ id: 1, address: '1 Main St' }],
                type: 'User',
            }
        })

        await wrapper.find('tbody button[aria-label="Edit"]').trigger('click')
        await wrapper.find('tbody input').setValue('typed but unsaved')
        await wrapper.find('tbody button[aria-label="Save"]').trigger('click')
        await flushPromises()

        expect(wrapper.emitted('updated')).toBeUndefined()
        const input = wrapper.find('tbody input')
        expect(input.exists()).toBe(true)
        expect((input.element as HTMLInputElement).value).toBe('typed but unsaved')
    })
    it('renders read-only columns as text while editing', async () => {
        const wrapper = mount(Table, {
            props: {
                headers: [{ key: 'location', label: 'Location' }, { key: 'createdAt', label: 'Created At', editable: false }],
                items: [{ id: 1, location: 'Here', createdAt: '2024-01-15' }],
                type: 'MaintenanceRequest',
            }
        })

        await wrapper.find('tbody button[aria-label="Edit"]').trigger('click')

        const cells = wrapper.findAll('tbody td')
        expect(cells[0]!.find('input').exists()).toBe(true)
        expect(cells[1]!.find('input').exists()).toBe(false)
        expect(cells[1]!.text()).toBe('2024-01-15')
    })
})
