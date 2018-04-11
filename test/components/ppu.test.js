import { mount } from '@vue/test-utils'
import ppu from '../../src/components/ppu'
import memory from '../../src/components/memory'

let wrapper = null;
let mainbus = null;

let console = {
    frameComplete: false
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

    it('it should have no vblank on start', () => {
        expect(wrapper.vm.registers[0x02] & 0b10000000).toBe(0b00000000)
    })
    it('the renderingEnabled check should return false when background/sprite rendering is disabled', () => {
        wrapper.vm.registers[0x01] = 0b00000000;
        expect(wrapper.vm.renderingEnabled()).toBe(false)
    })
    it('the renderedEnabled check should return true when either background or sprite or both is enabled', () => {
        // First set background
        wrapper.vm.registers[0x01] = 0b00010000;
        expect(wrapper.vm.renderingEnabled()).toBe(true)
        // Reset to only sprite enabled
        wrapper.vm.registers[0x01] = 0b00001000;
        expect(wrapper.vm.renderingEnabled()).toBe(true)
        // Reset to both bg and sprite enabled
        wrapper.vm.registers[0x01] = 0b00011000;
        expect(wrapper.vm.renderingEnabled()).toBe(true)
    })
    it('should have odd and even frames toggled for each frame', () => {
        // Get the first initial value
        let expected = false
        for(let i = 0; i < 20; i++) {
            do {
                wrapper.vm.tick()
            } while(!console.frameComplete)
            expect(wrapper.vm.odd).toBe(expected)
            expected = !expected
            console.frameComplete = false
        }
    })
    it('it should have 89342 cycles when rendering is disabled per frame', () => {
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

