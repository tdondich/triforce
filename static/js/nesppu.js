Vue.component('ppu', {
  props: ["console"],
  data: function () {
    return {
      inDebug: false,
      fullscreen: false
    };
  },
  created() {
    window.addEventListener("keydown", (event) => {
      // Listen for escape
      if (event.keyCode == 27) {
        this.fullscreen = false;
      }
    });
    this.registers = new Uint8Array(8);

    // Create our OAM array
    this.oam = new Uint8Array(256);

    // There are 341 cycles in each scanline, except for odd and renderEnabled
    this.cycle = 0;
    // There are 262 scanlines, starting with 0, they refrence 261 as -1 as well in the following link
    // See: https://wiki.nesdev.com/w/index.php/PPU_rendering
    this.scanline = 0;
    // Toggle even/odd frame
    this.odd = true; // starting at first frame
    // Our background tile shift registers. They act as 16-bit registers that get read from bit 0 and then zero fill right shift
    this.backgroundTileFirstShiftRegister = 0;
    this.backgroundTileSecondShiftRegister = 0;
    // The attribute "latch"
    this.attributeTableByte = null;

    // PPUData read buffer (post-fetch)
    // See: http://wiki.nesdev.com/w/index.php/PPU_registers#The_PPUDATA_read_buffer_.28post-fetch.29
    this.readBuffer = 0x00;

    this.canvas = null;
    this.canvasCtx = null;

    // This feels so dirty, it's our frame cache, caching data for the existing frame
    this.universalBackgroundColor = 0;
    this.scanlineSpriteCache = [];
    this.backgroundAndSpriteRendering = false;
    this.leftSideBackgroundAndSpriteFlag = false;
    this.NMIEnabled = false;
    this.renderingEnabled = false;

    this.basePatternTableAddress = 0x1000;

    // Rendering optimizations aka hacks
    this.frameBuffer = null;

    // @todo This is debug helpers
    this.oldCycleCount = 0;
    this.oldScanline = 0;

    this.fetchTick = 0;

    /**
     * The following variables are for internal PPU registers related to scrolling(?)
     * https://wiki.nesdev.com/w/index.php/PPU_scrolling
     */
    // Current VRAM address (15 bits)
    // Note, we're blowing the V register out into separate registers for better handling without bitwise
    this.v_fineYScroll = 0x00;
    this.v_nametableSelect = 0x00;
    this.v_coarseYScroll = 0x00;
    this.v_coarseXScroll = 0x00;

    // Temporary VRAM address (15 bits); can also be thought of as the address of the top left onscreen tile.
    // Note, we're blowing the T register out into separate registers for better handling without bitwise
    this.t_fineYScroll = 0x00;
    this.t_nametableSelect = 0x00;
    this.t_coarseYScroll = 0x00;
    this.t_coarseXScroll = 0x00;

    // Fine X scroll (3 bits)
    this.x = 0;
    // First or second write toggle (1 bit) // Stored as a boolean
    this.w = false;

    // Creates a 15 bit variable that represents v, built from our V variables
    this.createVFromVariables = () => {
      return (this.v_fineYScroll << 12) + (this.v_nametableSelect << 10) + (this.v_coarseYScroll << 5) + this.v_coarseXScroll;
    }

    // Sets our variables from an address passed in
    this.setVariablesFromV = (address) => {
      this.v_fineYScroll = ((address >>> 12) & 0b111);
      this.v_nametableSelect = ((address >>> 10) & 0b11);
      this.v_coarseYScroll = ((address >>> 5) & 0b11111);
      this.v_coarseXScroll = (address & 0b11111);
    }

    this.previousCycleCount = () => {
      let value = this.oldCycleCount;
      this.oldCycleCount = this.cycle;
      return value;
    };

    this.previousScanline = () => {
      let value = this.oldScanline;
      this.oldScanline = this.scanline;
      return value;

    };

    this.render = () => {
      this.canvasCtx.putImageData(this.frameBuffer, 0, 0);
    };

    this.shiftBackgroundRegisters = () => {
      let v = this.createVFromVariables();
      // Get the base nametable address
      // We need to find out which pixel we're at.  Each byte is a 8x8 pixel tile representation

      // Base will be 0 - 3
      // See: http://wiki.nesdev.com/w/index.php/PPU_registers#PPUCTRL

      // Grab tile data for where we are pointing
      let backgroundTileIndex = this.vram.get(0x2000 | (v & 0x0FFF));

      // This ors against the base pattern table address for background
      // And adds fine-y from v
      let base = ((backgroundTileIndex << 4) | this.basePatternTableAddress) + (v >>> 12);

      // Load it into our register
      // We get the copy of the tile data, and then we load it into the high 8 bits of our shift registers
      this.backgroundTileFirstShiftRegister =
        (this.backgroundTileFirstShiftRegister & 0xff00) |
        this.vram.get(base);

      this.backgroundTileSecondShiftRegister =
        this.backgroundTileSecondShiftRegister |
        this.vram.get(base + 8);

      // Now get attribute byte
      //address = baseAddress + 0x3c0;
      let address = 0x23c0 | (v & 0x0c00) | ((v >> 4) & 0x38) | ((v >> 2) & 0x07);

      // Shift top 8 bits to the right
      this.attributeTableByte = (this.attributeTableByte >>> 8) | (this.vram.get(address) << 8);

    };

    // Increase horizontal on V register, basically going to next nametable byte
    this.increaseHoriV = function () {
      // increase hori(v)
      if (this.renderingEnabled) {
        if (this.v_coarseXScroll == 31) {
          this.v_coarseXScroll = 0;
          this.v_nametableSelect ^= 0b01;
        } else {
          this.v_coarseXScroll++;
        }
      }
    }

    this.increaseVertV = function () {
      // Increase vert(v) but only if rendering is enabled
      if (this.renderingEnabled) {
        // https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
        // Note, this is for Y increment
        if (this.v_fineYScroll < 7) {
          this.v_fineYScroll++;
        } else {
          this.v_fineYScroll = 0;
          let y = this.v_coarseYScroll;
          if (y == 29) {
            // Set coarse Y to 0
            // @todo - see if this is accurate, the pseudo code is only setting the local var
            // instead of the actual register.
            this.v_coarseYScroll = 0;
            // Switch the nametable
            this.v_nametableSelect ^= 0b1;
          } else if (y == 31) {
            this.v_coarseYScroll = 0;
            // Don't do the nametable switch
          } else {
            this.v_coarseYScroll++;
          }
        }
      }
    }

    this.copyHoriTtoHoriV = function () {
      // hori(v) = hori(t)
      // copy over hortizontal information from t to v
      // See: https://wiki.nesdev.com/w/index.php/PPU_scrolling
      if (this.renderingEnabled) {
        this.v_coarseXScroll = this.t_coarseXScroll;
        this.v_nametableSelect = (this.v_nametableSelect & 0b10) ^ (this.t_nametableSelect & 0b01);
      }
    }

    this.tick = function () {
      // Create local vars to reduce scope chain crawling
      let cycle = this.cycle;
      let scanline = this.scanline;

      if (scanline <= 239) {
        if (cycle <= 256 && cycle > 0) {
          this.renderPixel(cycle - 1, scanline);
        }
        if (!(cycle % 8)) {
          if (cycle == 0) {
            // Set the cache data for this frame
            this.universalBackgroundColor = colors[this.vram.get(0x3f00)];

            ++this.cycle;
            return;
          }
          if (cycle <= 248) {
            this.shiftBackgroundRegisters();
            this.increaseHoriV();
            ++this.cycle;
            return;
          } else if (cycle == 256) {
            // inc vert(v)
            this.increaseVertV();
            // Build the scanline sprite cache for this scanline by reading OAM data and compiling
            // cache which is like secondary OAM
            this.buildScanlineSpriteCache(scanline);

            ++this.cycle;
            return;
          } else if (cycle == 328) {
            this.shiftBackgroundRegisters();
            this.increaseHoriV();
            ++this.cycle;
            return;
          } else if (cycle == 336) {
            // Since there was no rendering, we need to make sure to shift background registers
            this.backgroundTileFirstShiftRegister =
              this.backgroundTileFirstShiftRegister << 8;
            this.backgroundTileSecondShiftRegister =
              this.backgroundTileSecondShiftRegister << 8;
            this.shiftBackgroundRegisters();

            this.increaseHoriV();
            ++this.cycle;
            return;
          }
        } else if (cycle == 257) {
          this.copyHoriTtoHoriV();
          ++this.cycle;
          return;
        }
      } else if (scanline == 241 && cycle == 1) {
        // Fire off Vblank
        this.registers[0x02] |= 0b10000000;
        this.$parent.frameNotCompleted = false;

        // And fire VBlank NMI if PPUCTRL bit 7 is set
        if (this.NMIEnabled) {
          this.cpu.nmi = 1;
        }
        ++this.cycle;
        return;
      } else if (scanline == 261) {
        // OLD
        //if (cycle >= 280 && cycle <= 304) {
        if (cycle == 304) {
          // vert(v) = vert(t)
          // This would normally be done on cycles 280 to 304, but we do it on the last
          if (this.renderingEnabled) {
            // Copy over fine y scroll
            this.v_fineYScroll = this.t_fineYScroll;
            this.v_nametableSelect = (this.v_nametableSelect & 0b01) ^ (this.t_nametableSelect & 0b10);
            this.v_coarseYScroll = this.t_coarseYScroll;
          }
          ++this.cycle;
          return;
        }
        if (!(cycle % 8)) {
          if (cycle == 0) {
            // No need to set universal background color, just pass this according to 
            // rendering chart
            ++this.cycle;
            return;
          }
          if (cycle <= 256) {
            this.shiftBackgroundRegisters();
            this.increaseHoriV();
            ++this.cycle;
            return;
          }
          if (cycle == 256) {
            this.increaseVertV();
            // Build the scanline sprite cache for this scanline by reading OAM data and compiling
            // cache which is like secondary OAM
            this.buildScanlineSpriteCache(scanline);

            ++this.cycle;
            return;
          } else if (cycle == 328) {
            this.shiftBackgroundRegisters();
            this.increaseHoriV();
            ++this.cycle;
            return;
          } else if (cycle == 336) {
            // Since there was no rendering, we need to make sure to shift background registers
            this.backgroundTileFirstShiftRegister =
              this.backgroundTileFirstShiftRegister << 8;
            this.backgroundTileSecondShiftRegister =
              this.backgroundTileSecondShiftRegister << 8;
            this.shiftBackgroundRegisters();

            this.increaseHoriV();
            ++this.cycle;
            return;
          }

        } // end if mod 8
        if (cycle == 1) {
          // Clearing VBlank and sprite 0
          this.registers[0x02] = this.registers[0x02] & 0b00111111;
          ++this.cycle;
          return;
        }
        if (cycle == 257) {
          this.copyHoriTtoHoriV();
          ++this.cycle;
          return;
        }

      }
      if (cycle == 339) {
        if (this.odd && this.renderingEnabled) {
          // It's an odd frame, so we will skip it
          // We only do this if rendering is enabled btw
          this.cycle = 0;
          this.scanline = scanline == 261 ? 0 : scanline + 1;
          if (this.scanline == 0) {
            this.odd = !this.odd;
          }
          return;
        }
        ++this.cycle;
        return;
      } else if (cycle == 340) {
        this.cycle = 0;
        this.scanline = scanline == 261 ? 0 : scanline + 1;
        if (this.scanline == 0) {
          this.odd = !this.odd;
        }
        return;
      }
      ++this.cycle;
    };
  },
  mounted() {
    this.vram = this.console.$refs.ppumainbus;
    this.cpu = this.console.$refs.cpu;

    this.canvas = this.$el.querySelector("#screen");
    this.canvasCtx = this.canvas.getContext("2d");
    this.canvasCtx.imageSmoothingEnabled = false;

    this.frameBuffer = this.canvasCtx.createImageData(256, 240);

    // Prefill frameBuffer.data with 255's to pre-populate alpha value
    this.frameBuffer.data.fill(255);
  },
  methods: {
    ppumainbus() {
      return this.vram;
    },
    ppuctrl() {
      return this.registers[0x0000];
    },
    ppumask() {
      return this.registers[0x0001];
    },
    ppustatus() {
      return this.registers[0x0002];
    },
    oamaddr() {
      return this.registers[0x0003];
    },
    oamdata() {
      return this.registers[0x0004];
    },
    ppuscroll() {
      return this.registers[0x0005];
    },
    ppuaddr() {
      return this.registers[0x0006];
    },
    ppudata() {
      return this.registers[0x0007];
    },
    baseAttributeTableAddress() {
      // Attribute table starts after the nametable
      let base = this.baseNameTableAddress() + 0x3c0;
      return base;
    },
    baseSpritePatternTableAddress() {
      // @todo check for sprite size, if 8x8 or 8x16
      let base = this.ppuctrl() & 0x08;
      return base === 0x08 ? 0x1000 : 0x0000;
    },
    // The following fill/set/get is for our registers, accessed by memory
    // Fill a memory range with a specific value
    fill(value = 0x00, start = 0, end = this.memory.length) {
      this.registers.fill(value, start, end);
    },
    set(address, value) {
      if (address === 0x0002) {
        // Do not do anything.  PPUSTATUS is read only
        return;
      }
      let oldValue = this.registers[address];
      this.registers[address] = value;
      // Now, check if we wrote to PPUADDR, if so, let's shift it into our dataAddress

      // This is 0x2000
      // https://wiki.nesdev.com/w/index.php/PPU_registers#Controller_.28.242000.29_.3E_write
      if (address === 0x0000) {
        // Check if nmi is set by checking bit 7
        this.NMIEnabled = (value & 0b10000000) === 0b10000000;
        // PPUCTRL write
        // Check to see if NMI is set while during vblank, if so, fire off an nmi immediately
        if (
          this.NMIEnabled &&
          (oldValue & 0b10000000) === 0b00000000 &&
          (this.ppustatus() & 0b10000000) === 0b10000000
        ) {
          // NMI set, fire off nmi
          this.cpu.nmi = 1;
        }
        // Set the t internal register, bits 10,11 to correspond to incoming bit 0,1
        // Setting nametable select
        this.t_nametableSelect = (value & 0b11);

        // Set basePatternTableAddress
        this.basePatternTableAddress = (value & 0x10) === 0x10 ? 0x1000 : 0x0000;

      } else if (address === 0x0001) {
        // Writing to MASK
        // So let's determine if backgroundAndSpriteRendering is enabled
        this.backgroundAndSpriteRendering = (value & 0b00011000) === 0b00011000;
        // This determines if BOTH background and sprite rendering is allowed in the leftmost 8 pixels
        // Used for sprite 0 checks
        this.leftSideBackgroundAndSpriteFlag =
          (value & 0b00000110) === 0b00000110;
        // Store if we should be rendering either sprite or background, so rendering should be enabled
        this.renderingEnabled = !((value & 0b00011000) === 0);
      } else if (address == 0x0004) {
        // OAMDATA Write
        // Write to OAMADDR the value
        this.oam[this.registers[0x0003]] = value;
        // Now increment OAMADDR
        this.registers[0x0003] = this.registers[0x0003] + 1;
      } else if (address == 0x0005) {
        // PPU Scrolling: $2005 first write (w is 0) 
        if (this.w === false) {
          // Set CoarseXScroll
          this.t_coarseXScroll = (value >>> 3);
          // Set fine X scroll
          this.x = value & 0b111;
          // Set write toggle to true
          this.w = true;
        } else {
          // PPU Scrolling: $2005 second write (w is 1)
          // Set t Fine Y Scroll
          this.t_fineYScroll = value & 0b111;
          // Set nametable select on t
          this.t_coarseYScroll = (value >>> 3);
          // Set write toggle back to false
          this.w = false;
        }
      } else if (address === 0x0006) {
        // 0x2006 : https://wiki.nesdev.com/w/index.php/PPU_registers#Address_.28.242006.29_.3E.3E_write_x2
        // PPU Address Register
        let tempAddress = this.createVFromVariables();
        tempAddress = tempAddress << 8;
        tempAddress = (tempAddress | value) & 0xFFFF;
        this.setVariablesFromV(tempAddress);

        // Now modify the t internal register
        if (this.w === false) {
          // $2006 first write (w is 0)
          this.t_fineYScroll = ((value >>> 4) & 0b11);
          this.t_nametableSelect = ((value & 0b1100) >>> 2);
          // @todo : CHECK THIS
          this.t_coarseYScroll = ((value & 0b11) << 3) | (this.t_coarseYScroll & 0b111);
          // Set write toggle to true
          this.w = true;
        } else {
          // $2006 second write (w is 1)
          // Set coarse X Scroll
          this.t_coarseXScroll = (value & 0b11111);
          // Set the lower 3 bits of coarse Y scroll
          this.t_coarseYScroll = ((this.t_coarseYScroll & 0b11000) | (value >>> 5));
          // Reset write toggle
          this.w = false;
          // Copy over T to V
          this.v_fineYScroll = this.t_fineYScroll;
          this.v_nametableSelect = this.t_nametableSelect;
          this.v_coarseXScroll = this.t_coarseXScroll;
          this.v_coarseYScroll = this.t_coarseYScroll;
        }
      } else if (address === 0x0007) {
        // If this is the case, then we write to the address requested by this.dataAddress as well
        // and then increment the address
        let address = this.createVFromVariables();
        this.vram.set(address, value);
        let increase = (this.ppuctrl() & 0b00000100) === 0b00000100 ? 32 : 1;
        address = (address + increase) & 0x7fff;
        this.setVariablesFromV(address);
      }
    },
    get(address) {
      if (address === 0x0004) {
        // We're supposed to READ from OAM addr, not from our own registers or memory
        // Reads do NOT increment OAMADDR.  See: https://wiki.nesdev.com/w/index.php/PPU_registers#OAM_data_.28.242004.29_.3C.3E_read.2Fwrite
        return this.oam[this.registers[0x0003]];
      }
      if (address === 0x0007) {
        // Then we actually want to return from the VRAM address requested, however, use the internal
        // read buffer if range is in 0 - $3EFF
        let address = this.createVFromVariables();

        let result = null;
        if (address <= 0x3EFF) {
          // Read from buffer
          result = this.readBuffer;
          // Update buffer
          this.readBuffer = this.vram.get(address);
        } else {
          // Read from vram
          result = this.vram.get(address);
          // When you update the buffer, you have to use the pseudo-mirrored nametable data
          // So, need to understand the delta address.  This would be the mirrored data in nametable 3
          let newAddress = address;
          newAddress = newAddress - 0x1000;
          this.readBuffer = this.vram.get(newAddress);
        }
        // @todo Another way to check if indebug?
        //if (!this.console.$refs.cpu.inDebug) {
          let increase = (this.ppuctrl() & 0b00000100) === 0b00000100 ? 32 : 1;
          address = (address + increase) & 0x7fff;
          this.setVariablesFromV(address);
          // @todo Handle weird behavior if during render and we change, it should
          // do a coarse y and x increment.  See: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
        //}
        return result;
      } else if (address === 0x0002) {
        // Reading of status
        let result = this.registers[address];
        // @todo Check another way if indebug
        //if (!this.cpu.inDebug) {
          // This is reading the PPU status register so be sure to clear vblank.
          this.setVBlank(false);

          this.statusRegisterReadFlag = !this.statusRegisterReadFlag;
          // Reset address latch used by PPUADDR and PPUSCROLL
          // See: https://wiki.nesdev.com/w/index.php/PPU_registers#Notes

          // Reset the w write toggle
          this.w = false;
        //}
        return result;
      }
      return this.registers[address];
    },
    setPPUCtrl(val) {
      this.registers[0x0000] = val & 0xff;
    },
    setPPUMask(val) {
      this.registers[0x0001] = val & 0xff;
    },
    setPPUStatus(val) {
      this.registers[0x0002] = val & 0xff;
    },
    setOAMAddr(val) {
      this.registers[0x0003] = val & 0xff;
    },
    setOAMData(val) {
      this.registers[0x0004] = val & 0xff;
    },
    setPPUScroll(val) {
      this.registers[0x0005] = val & 0xff;
    },
    setPPUAddress(val) {
      this.registers[0x0006] = val & 0xff;
    },
    setPPUData(val) {
      this.registers[0x0007] = val & 0xff;
    },
    setVBlank(val) {
      if (val) {
        this.setPPUStatus(this.ppustatus() | 0b10000000);
      } else {
        this.setPPUStatus(this.ppustatus() & 0b01111111);
      }
    },
    setSprite0Hit(val) {
      if (val) {
        this.setPPUStatus(this.ppustatus() | 0b01000000);
      } else {
        this.setPPUStatus(this.ppustatus() & 0b10111111);
      }
    },
    copyToOAM(address, value) {
      // Copy the info to the requested OAM address
      let offset = this.registers[0x0003];
      let target = offset + address;
      // Handle wrapping around memory bounds
      if (target > 255) {
        target = target - 256;
      }
      this.oam[target] = value;
    },
    // See: http://wiki.nesdev.com/w/index.php/PPU_power_up_state
    reset() {
      // Set our initial Palette data based on power_up_palette test rom
      let initialPalette = [0x09, 0x01, 0x00, 0x01, 0x00, 0x02, 0x02, 0x0D, 0x08, 0x10, 0x08, 0x24, 0x00, 0x00,
        0x04, 0x2C, 0x09, 0x01, 0x34, 0x03, 0x00, 0x04, 0x00, 0x14, 0x08, 0x3A, 0x00, 0x02, 0x00, 0x20, 0x2C, 0x08];
      let base = 0x3f00;
      let count = 0;
      while (base <= 0x3fff) {
        this.vram.set(base, initialPalette[count]);
        count++;
        if (count == initialPalette.length) {
          count = 0;
        }
        base++;
      }

      // We set our registers after ~29658 cpu clicks (which we run 3x faster)
      // Set VBlank flag
      this.frameComplete = false;
      // @todo Make sure writes to these registers aren't valid until after the needed
      // cpu clicks
      //this.setPPUStatus(0x80);

      this.setPPUStatus(0x00);

      this.setOAMAddr(0x00);
      this.setPPUAddress(0x00);
    },
    // Fetch first sprite pixel information that falls within an x,y coordinate, given the current
    // sprite size configuration

    buildScanlineSpriteCache(y) {
      // Reset
      this.scanlineSpriteCache = [];
      let matches = 0;

      for (let spriteNumber = 0; spriteNumber < 64; spriteNumber++) {
        // Base is the base address of the currently evaluated sprite
        let base = spriteNumber * 4;
        let spriteY = this.oam[base];

        // Assume 8x8 sprites for the time being
        // @todo Handle 8x16 sprite configuration
        if (spriteY === 0xef || spriteY === 0xff) {
          // Skip this sprite
          continue;
        }
        if (y >= spriteY && y < spriteY + 8) {
          let spriteX = this.oam[base + 3];

          // Note, we decrement spriteX to handle 0 indexed x coordinates
          // @todo, is this accurate?  Is the background shifted, or is sprite x shifted incorrectly?

          let attributeByte = this.oam[base + 2];
          // Desired pixel falls within the sprite bounds
          // Get desired palette
          let desiredPalette = (attributeByte & 0b00000011) + 4;
          // @ Note, handle attributes for flipping tile vert/horiz
          let tileIndex = this.oam[base + 1];

          let tileBase = tileIndex << 4;
          // Find the relative y position of the sprite
          let tileY =
            (attributeByte & 0b10000000) === 0b10000000
              ? 7 - (y - spriteY)
              : y - spriteY;

          tileBase = tileBase | this.baseSpritePatternTableAddress();
          // Get first plane
          let first = this.vram.get(tileBase + tileY);
          // Get second plane
          let second = this.vram.get(tileBase + tileY + 8);

          // Sprite belongs on this scanline
          this.scanlineSpriteCache[matches] = {
            oamAddress: base,
            spriteX: spriteX,
            tileIndex: tileIndex,
            first: first,
            second: second,
            palette: desiredPalette,
            priority:
              (attributeByte & 0b00100000) === 0b00100000
                ? PRIORITY_BACKGROUND
                : PRIORITY_FOREGROUND,
            flipHorizontal: (attributeByte & 0b01000000) === 0b01000000,
            flipVertical: (attributeByte & 0b10000000) === 0b10000000
          };
          matches = matches + 1;
          // We only cache the first 8 matching sprites on the scanline
          if (matches === 8) {
            return;
          }
        }
      }
    },

    fetchVisibleSpritePixelInformation(x) {
      let tileCacheCount = this.scanlineSpriteCache.length;
      for (
        let spriteNumber = 0;
        spriteNumber < tileCacheCount;
        spriteNumber++
      ) {
        // Destructuring the sprite info
        let {
          spriteX,
          oamAddress,
          palette,
          flipHorizontal,
          first,
          second
        } = this.scanlineSpriteCache[spriteNumber];
        if (x >= spriteX && x < spriteX + 8) {
          // This sprite falls within our X requested coordinate
          // Now pull the first/second byte for the tile for this scanline
          // Check for flipping horizontally
          let tileX = flipHorizontal ? x - spriteX : 7 - (x - spriteX);

          let colorIndex = 2;
          if (!isBitSet(first, tileX) && !isBitSet(second, tileX)) {
            // Color value is 0
            colorIndex = 0;
          } else if (isBitSet(first, tileX) && isBitSet(second, tileX)) {
            // color value is 3
            colorIndex = 3;
          } else if (isBitSet(first, tileX)) {
            // Color value is 1
            colorIndex = 1;
          }

          return {
            oamAddress: oamAddress,
            colorIndex: colorIndex,
            palette: palette
          };
        }
      }
      return null;
    },
    /**
     * Fetches the next color info from the background shift registers
     */
    fetchTilePixelColor() {
      let mask = 0x8000 >>> this.x;
      let value = 
        (
          (((this.backgroundTileSecondShiftRegister & mask) >>> (14 - this.x))) +
          (((this.backgroundTileFirstShiftRegister & mask) >>> (15 - this.x)))
      );
      // Now right shift both registers
      this.backgroundTileFirstShiftRegister =
        this.backgroundTileFirstShiftRegister << 1;
      this.backgroundTileSecondShiftRegister =
        this.backgroundTileSecondShiftRegister << 1;
      return value;

    },
    // Fetch the color hex code for the requested palette and colorIndex combo
    // See: mixins/colors.js
    fetchColor(palette, colorIndex) {
      // Base will point to our palette starting address
      // There are three bytes to a palette
      let base = 0x3f01 + palette * 4;

      return colors[this.vram.get(base + (colorIndex - 1))];
    },

    // Renders a requested pixel, utilizing the scanline tile cache for sprites
    renderPixel(x, y) {
      // The color for the specified pixel
      // By default, it will be the universal background color
      let color = this.universalBackgroundColor;

      // Sprite fetching
      let activeSpritePixelInformation = this.fetchVisibleSpritePixelInformation(
        x
      );

      // Fetch background tile info only if background rendering is enabled
      let backgroundColorIndex = 0;
      // This if checks for background tile rendering enabled
      if ((this.registers[0x01] & 0x08) === 0x08) {
        backgroundColorIndex = this.fetchTilePixelColor();
      }

      // Now do pixel evaluation
      let palette = null;
      let colorIndex = null;

      // Now do priority

      if (
        backgroundColorIndex != 0 ||
        (activeSpritePixelInformation &&
          activeSpritePixelInformation.colorIndex != 0)
      ) {
        // If we have an active sprite, do sprite detail
        if (
          activeSpritePixelInformation &&
          activeSpritePixelInformation.colorIndex
        ) {
          // Check for sprite 0
          if (
            activeSpritePixelInformation.oamAddress === 0x00 &&
            this.backgroundAndSpriteRendering &&
            // Check for left clipping
            (this.leftSideBackgroundAndSpriteFlag || x > 7) &&
            // End left clip check
            // Chek to ensure x is less than 255 (does not hit on the last right pixel)
            x < 255
            &&
            backgroundColorIndex
          ) {
            this.setSprite0Hit(true);
          }
          colorIndex = activeSpritePixelInformation.colorIndex;
          palette = activeSpritePixelInformation.palette;
        } else {
          colorIndex = backgroundColorIndex;
          // @todo Find proper palette number for background attribute byte and x/y offset

          // Perform shifting based on fine-x 

          //palette = 0;
          if (x % 32 < 16) {
            if (y % 32 < 16) {
              // top left
              palette = this.attributeTableByte & 0b00000011;
            } else {
              // bottom left
              palette = (this.attributeTableByte & 0b00110000) >>> 4;
            }
          } else {
            if (y % 32 < 16) {
              // top right
              palette = (this.attributeTableByte & 0b00001100) >>> 2;
            } else {
              // bottom right
              palette = (this.attributeTableByte & 0b11000000) >>> 6;
            }
          }
        }
        color = this.fetchColor(palette, colorIndex);
      }

      // Write to our framebuffer
      let base = (y * 256 + x) * 4;
      //R
      this.frameBuffer.data[base] = color[0];
      //G
      this.frameBuffer.data[base + 1] = color[1];
      // B
      this.frameBuffer.data[base + 2] = color[2];
    }
  },
  template: `
    <div class="row ppu">
    <div class="col-sm-12 col-md-6">
    <div class="screen-container" :class="{fullscreen: fullscreen}">
    <canvas id="screen" class="screen" width="256" height="240"></canvas>
    </div>
    <button @click="inDebug = !inDebug" class="btn">Toggle PPU Debug</button>
    <button @click="fullscreen = true" class="btn">Toggle Fullscreen</button>
    </div>
    <div class="col-sm-12 col-md-6">
    <table v-if="inDebug">
      <tr><th>Cycle</th><td>{{cycle}}</td></tr>
      <tr><th>Scanline</th><td>{{scanline}}</td></tr>
      <tr><th>Fine X</th><td>{{x}}</td></tr>
      <tr><th>V Raw</th><td>{{createVFromVariables().toString(2).padStart(16, '0')}}</td></tr>
      <tr><th>V-FineY Scroll</th><td>{{v_fineYScroll.toString(2).padStart(3, '0')}}</td></tr>
      <tr><th>V-Nametable Select</th><td>{{v_nametableSelect.toString(2).padStart(2, '0')}}</td></tr>
      <tr><th>V-Coarse Y Scroll</th><td>{{v_coarseYScroll.toString(2).padStart(5, '0')}}</td></tr>
      <tr><th>V-Coarse X Scroll</th><td>{{v_coarseXScroll.toString(2).padStart(5, '0')}}</td></tr>
    </table>
    </div>

  </div>
  `

});