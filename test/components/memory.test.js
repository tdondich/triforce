import { mount } from '@vue/test-utils'
import memory from '../../src/components/memory'

let wrapper = null;

describe('memory', () => {
    beforeEach(() => {
        wrapper = mount(memory, {
            propsData: {
                title: 'Test Memory',
                size: 32
            }
        })
    })
    /**
     * Disabled exception handling tests due to performance reasons
     */
    /*
    test('it should throw exception when accessing out of bounds', () => {
       expect(() => {
            wrapper.vm.get(33)
        }).toThrow('Address exceeds memory size');
    })
    test('it should throw an exception when writing out of bounds', () => {
       expect(() => {
            wrapper.vm.set(33, 'invalid')
        }).toThrow('Address exceeds memory size');
    })
    */

    test('it should properly set memory value', () => {
        wrapper.vm.set(31, 0x01);
        expect(wrapper.vm.get(31)).toBe(0x01)
    })
    test('it should return a range of values', () => {
        wrapper.vm.set(5, 0x01);
        wrapper.vm.set(6, 0x02);
        wrapper.vm.set(7, 0x03);
        wrapper.vm.set(8, 0x04);
        wrapper.vm.set(9, 0x05);
        let value = wrapper.vm.getRange(5,5);
        expect(value).toBeInstanceOf(Uint8Array);
        expect(wrapper.vm.getRange(5,5)).toEqual(Uint8Array.from([0x01, 0x02, 0x03, 0x04, 0x05]))
    })
    /**
     * Temp remove checks for exceptions due to performance reasons
     */
    /*
    test('it should throw exception when fetching a range out of bounds', () => {
        expect(() => {
            wrapper.vm.getRange(5,30);
        }).toThrow('Address range exceeds memory size')
    })
    */
    test('it should reset properly', () => {
        for(let i = 0; i < 32; i++) {
            wrapper.vm.set(i, i);
        }
        // Call reset
        wrapper.vm.reset();
        for(let i =0; i < 32; i++) {
            expect(wrapper.vm.get(i)).toBe(0x00);
        }
    })
    test('it should fill a range with values', () => {
        wrapper.vm.fill(0x42, 5, 10);
        for(let i = 5; i <= 10; i++) {
            expect(wrapper.vm.get(i)).toBe(0x42);
        }
    })
})