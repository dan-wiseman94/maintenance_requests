import { describe, it, expect, vi, afterEach } from 'vitest'

import { mount } from '@vue/test-utils'
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
        expect(headers).toHaveLength(2)
        expect(headers.map(th => th.text())).toEqual(['Location', 'Maintenance Type'])
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
            ['Here', 'Something'],
            ['There', 'Something Else'],
        ])
    })
})