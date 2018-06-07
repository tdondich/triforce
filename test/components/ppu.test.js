var Vue = require('vue/dist/vue')

window.Vue = Vue

require('../../static/js/databus')
require('../../static/js/memory')
require('../../static/js/nesppu')
require('../../static/js/util')


let wrapper = null;

let nesConsole = {
    frameNotCompleted: true
}

describe('ppu', () => {
    beforeEach(() => {

        nesConsole = new Vue({
            data: {
                frameNotCompleted: true
            },
            template: `
            <div>
                <memory ref="mem" size="65536"></memory>
                <databus ref="ppumainbus" :sections="[
                    {
                      ref: 'mem',
                      min: 0x0000,
                      max: 0xFFFF,
                      size: 65536 
                    }
                ]"></databus>
                <ppu ref="ppu" :console="this"></ppu>
            </div>`
        }).$mount();

        wrapper = nesConsole.$refs.ppu;
        
  })

    it('it should have no vblank on start', () => {
        expect(wrapper.registers[0x02] & 0b10000000).toBe(0b00000000)
    })
    it('the renderingEnabled check should return false when background/sprite rendering is disabled', () => {
        wrapper.registers[0x01] = 0b00000000;
        expect(wrapper.renderingEnabled).toBe(false)
    })
    it('the renderedEnabled check should return true when either background or sprite or both is enabled', () => {
        // First set sprites
        wrapper.set(0x0001, 0b00010000);

        expect(wrapper.renderingEnabled).toBe(true)
        // Reset to only background enabled
        wrapper.set(0x0001, 0b00001000);
        expect(wrapper.renderingEnabled).toBe(true)
        // Reset to both bg and sprite enabled
        wrapper.set(0x0001, 0b00011000);
        expect(wrapper.renderingEnabled).toBe(true)
    })
    it('should have odd and even frames toggled for each frame', () => {
        // Get the first initial value
        let expected = true
        for (let i = 0; i < 20; i++) {
            do {
                wrapper.tick()
            } while (nesConsole.frameNotCompleted)
            expect(wrapper.odd).toBe(expected)
            expected = !expected
            nesConsole.frameNotCompleted = true
        }
    })
    it('it should have 89342 cycles when rendering is disabled per frame', () => {
        // Reset the ppu
        wrapper.cycle = 0;
        wrapper.scanline = 0;
        nesConsole.frameNotCompleted = true

        let count = 0;
        // Throw away the first vblank, because we're counting cycles between vblanks
        do {
            wrapper.tick();
        } while(nesConsole.frameNotCompleted);
        nesConsole.frameNotCompleted = true;
        do {
            wrapper.tick();
            count++;
        } while (nesConsole.frameNotCompleted);
        expect(count).toBe(89342);
    })
    it('should clear VBlank after 6820 (or 6819 if odd) cycles from being set', () => {
        // Run until vblank is set
        // Enable rendering
        wrapper.registers[0x01] = 0b00011000;
        // PERFORM A ODD FRAME
        do {
            wrapper.tick();
        } while ((wrapper.registers[0x0002] & 0b10000000) != 0b10000000)
        let count = 0;
        // FOLLOWING FRAME WILL BE EVEN
        do {
            wrapper.tick();
            count = count + 1;
        } while ((wrapper.registers[0x0002] & 0b10000000) == 0b10000000)
        // This checks for even
        expect(count).toBe(6820)

        // Run until vblank is set
        // RUN AN ODD FRAME
        do {
            wrapper.tick();
        } while ((wrapper.registers[0x0002] & 0b10000000) != 0b10000000)
        // do it again to force to go to odd frame
        // THIS WILL BE EVEN
        do {
            wrapper.tick();
        } while ((wrapper.registers[0x0002] & 0b10000000) != 0b10000000)
        count = 1;
        // THIS FRAME WILL BE ODD
        do {
            wrapper.tick();
            count = count + 1;
        } while ((wrapper.registers[0x0002] & 0b10000000) == 0b10000000)
        // This checks for odd frames
        expect(count).toBe(6819)
    })
    it('should fire off an nmi on the CPU when setting nmi and during vblank', () => {
        // Mock the cpu nmi call
        wrapper.cpu = {
            nmi: 0
        }
        // Render until we hit a VBlank
        do {
            wrapper.tick();
        } while ((wrapper.registers[0x0002] & 0b10000000) != 0b10000000)
        wrapper.set(0x0000, 0b10000000);
        expect(wrapper.cpu.nmi).toBe(1)
    })
    it('should not fire another nmi when setting bit after its already been set at start of vblank', () => {
        // Enable NMI from start
        wrapper.set(0x0000, 0b10000000);
        wrapper.cpu = {
            nmi: 0
        }
        // Render until we hit a VBlank
        do {
            wrapper.tick();
        } while ((wrapper.registers[0x0002] & 0b10000000) != 0b10000000)
        // Call again, setting the NMI flag
        wrapper.set(0x0000, 0b10000000);
        // ensure the nmi was fired only once
        expect(wrapper.cpu.nmi).toBe(1)
    })
    it('should appropriately set bits 11 and 10 of internal t register when setting nametable address via ppuctrl', () => {
        expect(wrapper.t).toBe(0x00);
        // Set only bit 0
        wrapper.set(0x0000, 0b1);
        expect(wrapper.t).toBe(0b1 << 10);
        // Now reset
        wrapper.set(0x0000, 0b00);
        expect(wrapper.t).toBe(0x00);
        // Set bit 1
        wrapper.set(0x0000, 0b10);
        expect(wrapper.t).toBe(0b1 << 11);
         // Now reset
        wrapper.set(0x0000, 0b00);
        expect(wrapper.t).toBe(0x00);
        // Now set both
         wrapper.set(0x0000, 0b11);
        expect(wrapper.t).toBe(0b11 << 10);
    })
    it('should reset write toggle when reading PPUSTATUS', () => {
        wrapper.w = true;
        wrapper.cpu = {
            inDebug: false
        }
        // Now read
        wrapper.get(0x0002);
        expect(wrapper.w).toBe(false)
    })
    it('should set t,x,w registers properly when writing to 2005', () => {
        wrapper.t = 0x00;
        wrapper.w = false;
        wrapper.set(0x0005, 0b10101010);
        expect(wrapper.x).toBe(0b010);
        expect(wrapper.w).toBe(true);
        expect(wrapper.t).toBe(0b10101);
        // Do the second write test
        wrapper.set(0x0005, 0b10101011);
        // expect that the x value does NOT change from previous
        expect(wrapper.x).toBe(0b010);
        expect(wrapper.w).toBe(false);
        expect(wrapper.t).toBe(0b011001010110101);
    })
    it('should property set t registers when writing to 2006', () => {
        wrapper.t = 0x00;
        wrapper.w = false;
        wrapper.set(0x0006, 0b10101010);
        expect(wrapper.w).toBe(true);
        expect(wrapper.t).toBe(0b010101000000000);
        // Now do second write test
        wrapper.set(0x0006, 0b10101010);
        expect(wrapper.w).toBe(false);
        expect(wrapper.t).toBe(0b010101010101010);
        expect(wrapper.v).toBe(wrapper.t);
    })
    it('should maintain fine y and coarse y through visible scanlines', () => {
        // Enable rendering via enabling sprites
        wrapper.set(0x0001, 0b00010000);
        // We're already at scanline 0 and cycle 0
        do {
            wrapper.tick();
            // Grab value of v
            let v = wrapper.v;
            // Now get out fine Y, bits 14 and 15
            let fineY = v >>> 12;
            expect(fineY).toBe(0);
            let coarseY = (v & 0b000001111100000) >>> 5;
            expect(coarseY).toBe(0);
        } while (wrapper.scanline == 0 && wrapper.cycle <= 255);
        // Scanline should now be 1, so fine Y should also be 1
        do {
            wrapper.tick();
            // Grab value of v
            let v = wrapper.v;
            // Now get out fine Y, bits 12,13,14
            let fineY = v >>> 12;
            expect(fineY).toBe(0x01);
            let coarseY = (v & 0b000001111100000) >>> 5;
            expect(coarseY).toBe(0);
        } while (wrapper.scanline == 1 && wrapper.cycle <= 255);
        do { 
            wrapper.tick()
        } while(wrapper.scanline < 8);
        // Now, see if coarse y is 1 and fine y is back to 0
        // Grab value of v
        let v = wrapper.v;
        // Now get out fine Y, bits 12,13,14
        let fineY = v >>> 12;
        expect(fineY).toBe(0x00);
        let coarseY = (v & 0b000001111100000) >>> 5;
        expect(coarseY).toBe(1);
        do { 
            wrapper.tick()
        } while(wrapper.scanline != 0);
         // Now, see if coarse y is is set to 0 and fine y is back to 0
        // Grab value of v
        v = wrapper.v;
        // Now get out fine Y, bits 12,13,14
        fineY = v >>> 12;
        expect(fineY).toBe(0x00);
        coarseY = (v & 0b000001111100000) >>> 5;
        expect(coarseY).toBe(0);
    })
    it("should manage coarse x in v register throughout visible scanline 0", () => {
        // Enable rendering via enabling sprites
        wrapper.set(0x0001, 0b00010000);
        do {
            wrapper.tick();
            let v = wrapper.v;
            let coarseX = (v & 0b000000000011111);
            expect(coarseX).toBe(0x00);
        } while(wrapper.cycle < 7);
        // Do 1 more tick, and see if it rolls over
        wrapper.tick();
        let v = wrapper.v;
        let coarseX = (v & 0b000000000011111);
        expect(coarseX).toBe(0x01);
        do {
            wrapper.tick();
        } while(wrapper.scanline == 0);
        v = wrapper.v;
        coarseX = (v & 0b000000000011111);
        expect(coarseX).toBe(0x00);
    })
    it("should have $2000 as the nametable byte address when at pixel 0,0", () => {
        // Enable rendering via enabling sprites
        wrapper.set(0x0001, 0b00010000);

        nesConsole.frameNotCompleted = true
        do {
            wrapper.tick();
        } while (nesConsole.frameNotCompleted);
        // Do another iteration of screen and then grab it again
        nesConsole.frameNotCompleted = true
        do {
            wrapper.tick();
        } while (nesConsole.frameNotCompleted);

    })
})
