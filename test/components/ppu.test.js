import { mount } from '@vue/test-utils'
import ppu from '../../src/components/ppu'
import memory from '../../src/components/memory'

let wrapper = null;
let mainbus = null;

let console = {

}

describe('memory', () => {
    beforeEach(() => {
        mainbus = mount(memory, {
            propsData: {
                title: 'PPU Main Bus',
                size: 65536
            }
        })

        console.$refs = {
            ppumainbus: mainbus.vm
        }


        wrapper = mount(ppu, {
            propsData: {
                console
            }
        })
    })

    test('it should have no vblank on start', () => {
        expect(wrapper.vm.registers[0x02] & 0b10000000).toBe(0b00000000)
    })
    test('the renderingEnabled check should return false when background/sprite rendering is disabled', () => {
        wrapper.vm.registers[0x01] = 0b00000000;
        expect(wrapper.vm.renderingEnabled()).toBe(false)
    })
    test('it should have 89342 cycles when rendering is disabled per frame', () => {
        // Reset the ppu
        wrapper.vm.cycle = 0;
        wrapper.vm.scanline = -1;
        let count = 0;
        do {
            wrapper.vm.tick();
            count++;
        } while(!wrapper.vm.console.frameComplete);
        expect(count).toBe(89342);

    })
})

