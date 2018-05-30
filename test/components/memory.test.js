var Vue = require('vue/dist/vue')

window.Vue = Vue

require('../../static/js/memory')

let wrapper = null;

describe('memory', () => {
    beforeEach(() => {
        wrapper = new Vue.options.components.memory({
            propsData: {
                title: 'Test Memory',
                size: 32
            }
        }).$mount();
    })

    test('it should properly set memory value', () => {
        wrapper.set(31, 0x01);
        expect(wrapper.get(31)).toBe(0x01)
    })
    test('it should return a range of values', () => {
        wrapper.set(5, 0x01);
        wrapper.set(6, 0x02);
        wrapper.set(7, 0x03);
        wrapper.set(8, 0x04);
        wrapper.set(9, 0x05);
        let value = wrapper.getRange(5,5);
        expect(value).toBeInstanceOf(Uint8Array);
        expect(wrapper.getRange(5,5)).toEqual(Uint8Array.from([0x01, 0x02, 0x03, 0x04, 0x05]))
    })

    test('it should reset properly', () => {
        for(let i = 0; i < 32; i++) {
            wrapper.set(i, i);
        }
        // Call reset
        wrapper.reset();
        for(let i =0; i < 32; i++) {
            expect(wrapper.get(i)).toBe(0x00);
        }
    })
    test('it should fill a range with values', () => {
        wrapper.fill(0x42, 5, 10);
        for(let i = 5; i <= 10; i++) {
            expect(wrapper.get(i)).toBe(0x42);
        }
    })
})