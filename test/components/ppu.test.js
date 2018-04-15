import { mount } from '@vue/test-utils'
import ppu from '../../src/components/ppu'
import memory from '../../src/components/memory'

let wrapper = null;
let mainbus = null;

let nesConsole = {
    frameNotCompleted: false
}

describe('ppu', () => {
    beforeEach(() => {
        nesConsole = {
            frameNotCompleted: true
        }

        mainbus = mount(memory, {
            propsData: {
                title: 'PPU Main Bus',
                size: 65536
            }
        })

        nesConsole.$refs = {
            ppumainbus: mainbus.vm
        }


        wrapper = mount(ppu, {
            propsData: {
                console: nesConsole
            }
        })
    })

    it('it should have no vblank on start', () => {
        expect(wrapper.vm.registers[0x02] & 0b10000000).toBe(0b00000000)
    })
    it('the renderingEnabled check should return false when background/sprite rendering is disabled', () => {
        wrapper.vm.registers[0x01] = 0b00000000;
        expect(wrapper.vm.renderingEnabled).toBe(false)
    })
    it('the renderedEnabled check should return true when either background or sprite or both is enabled', () => {
        // First set sprites
        wrapper.vm.set(0x0001, 0b00010000);

        expect(wrapper.vm.renderingEnabled).toBe(true)
        // Reset to only background enabled
        wrapper.vm.set(0x0001, 0b00001000);
        expect(wrapper.vm.renderingEnabled).toBe(true)
        // Reset to both bg and sprite enabled
        wrapper.vm.set(0x0001, 0b00011000);
        expect(wrapper.vm.renderingEnabled).toBe(true)
    })
    it('should have odd and even frames toggled for each frame', () => {
        // Get the first initial value
        let expected = false
        for (let i = 0; i < 20; i++) {
            do {
                wrapper.vm.tick()
            } while (nesConsole.frameNotCompleted)
            expect(wrapper.vm.odd).toBe(expected)
            expected = !expected
            nesConsole.frameNotCompleted = true
        }
    })
    it('it should have 89342 cycles when rendering is disabled per frame', () => {
        // Reset the ppu
        wrapper.vm.cycle = 0;
        wrapper.vm.scanline = 0;
        nesConsole.frameNotCompleted = true

        let count = 0;
        do {
            wrapper.vm.tick();
            count++;
        } while (nesConsole.frameNotCompleted);
        expect(count).toBe(89342);
    })
    it('should clear VBlank after 6820 (or 6819 if odd) cycles from being set', () => {
        // Run until vblank is set
        // Enable rendering
        wrapper.vm.registers[0x01] = 0b00011000;
        // PERFORM A ODD FRAME
        do {
            wrapper.vm.tick();
        } while ((wrapper.vm.registers[0x0002] & 0b10000000) != 0b10000000)
        let count = 1;
        // FOLLOWING FRAME WILL BE EVEN
        do {
            wrapper.vm.tick();
            count = count + 1;
        } while ((wrapper.vm.registers[0x0002] & 0b10000000) == 0b10000000)
        // This checks for even
        expect(count).toBe(6820)

        // Run until vblank is set
        // RUN AN ODD FRAME
        do {
            wrapper.vm.tick();
        } while ((wrapper.vm.registers[0x0002] & 0b10000000) != 0b10000000)
        // do it again to force to go to odd frame
        // THIS WILL BE EVEN
        do {
            wrapper.vm.tick();
        } while ((wrapper.vm.registers[0x0002] & 0b10000000) != 0b10000000)
        count = 1;
        // THIS FRAME WILL BE ODD
        do {
            wrapper.vm.tick();
            count = count + 1;
        } while ((wrapper.vm.registers[0x0002] & 0b10000000) == 0b10000000)
        // This checks for odd frames
        expect(count).toBe(6819)
    })
    it('should fire off an nmi on the CPU when setting nmi and during vblank', () => {
        // Mock the cpu nmi call
        wrapper.vm.cpu = {
            nmi: 0
        }
        // Render until we hit a VBlank
        do {
            wrapper.vm.tick();
        } while ((wrapper.vm.registers[0x0002] & 0b10000000) != 0b10000000)
        wrapper.vm.set(0x0000, 0b10000000);
        expect(wrapper.vm.cpu.nmi).toBe(1)
    })
    it('should not fire another nmi when setting bit after its already been set at start of vblank', () => {
        // Enable NMI from start
        wrapper.vm.set(0x0000, 0b10000000);
        wrapper.vm.cpu = {
            nmi: 0
        }
        // Render until we hit a VBlank
        do {
            wrapper.vm.tick();
        } while ((wrapper.vm.registers[0x0002] & 0b10000000) != 0b10000000)
        // Call again, setting the NMI flag
        wrapper.vm.set(0x0000, 0b10000000);
        // ensure the nmi was fired only once
        expect(wrapper.vm.cpu.nmi).toBe(1)
    })
})

