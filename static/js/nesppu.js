Vue.component('ppu', {
  props: ["console"],
  data: function() {
    return {
      //empty
    };
  },
  created() {
    this.registers = new Uint8Array(8);

    // Create our OAM array
    this.oam = new Uint8Array(256);

    // There are 341 cycles in each scanline, except for odd and renderEnabled
    this.cycle = 0;
    // There are 262 scanlines, starting with 0, they refrence 261 as -1 as well in the following link
    // See: https://wiki.nesdev.com/w/index.php/PPU_rendering
    this.scanline = 0;
    // Toggle even/odd frame
    this.odd = true;
    // Our background tile shift registers. They act as 16-bit registers that get read from bit 0 and then zero fill right shift
    this.backgroundTileFirstShiftRegister = 0;
    this.backgroundTileSecondShiftRegister = 0;
    // The attribute "latch"
    this.attributeTableByte = null;

    // INTERNAL REGISTERS: https://wiki.nesdev.com/w/index.php/PPU_scrolling
    // The current VRAM address
    this.v = 0x0000;
    // The pointer to the nametable tile that is for the top-left of the screen
    this.t = 0x0000;
    // Fine x-scroll, set by PPUSCROLL
    this.x = 0;
    // First/second write toggle
    this.w = false;

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
      let v = this.v;
      // Get the base nametable address
      // We need to find out which pixel we're at.  Each byte is a 8x8 pixel tile representation

      // Base will be 0 - 3
      // See: http://wiki.nesdev.com/w/index.php/PPU_registers#PPUCTRL

      // Grab tile data for where we are pointing
      let backgroundTileIndex = this.vram.read[0x2000 | (v & 0x0FFF)]();

      if((0x2000 | (v & 0x0FFF)) == 0x2061) {
        console.log("VALUE TO READ: " + backgroundTileIndex.toString(16));
      }

      // This ors against the base pattern table address for background
      // And adds fine-y from v
      let base = ((backgroundTileIndex << 4) | this.basePatternTableAddress) + (v >>> 12);

      // Load it into our register
      // We get the copy of the tile data, and then we load it into the high 8 bits of our shift registers
      this.backgroundTileFirstShiftRegister =
        (this.backgroundTileFirstShiftRegister & 0xff00) |
        this.vram.read[base]();
      this.backgroundTileSecondShiftRegister =
        this.backgroundTileSecondShiftRegister |
        this.vram.read[base + 8]();

      // Now get attribute byte
      //address = baseAddress + 0x3c0;
      let address = 0x23c0 | (v & 0x0c00) | ((v >> 4) & 0x38) | ((v >> 2) & 0x07);

      // Shift top 8 bits to the right
      this.attributeTableByte = (this.attributeTableByte >>> 8) | (this.vram.read[address]() << 8);

    };

    this.tick = () => {
      // Setting up local vars to avoid property lookup costs
      let scanline = this.scanline;
      let cycle = this.cycle;
      let renderingEnabled = this.renderingEnabled;

      if (scanline <= 239) {
        if (cycle <= 256 && cycle > 0) {
          this.renderPixel(cycle - 1, scanline);
        }
        switch (cycle) {
          case 0:
            // Set the cache data for this frame
            this.universalBackgroundColor = colors[this.vram.get(0x3f00)];

           ++this.cycle;
            return;
          case 8:
          case 16:
          case 24:
          case 32:
          case 40:
          case 48:
          case 56:
          case 64:
          case 72:
          case 80:
          case 88:
          case 96:
          case 104:
          case 112:
          case 120:
          case 128:
          case 136:
          case 144:
          case 152:
          case 160:
          case 168:
          case 176:
          case 184:
          case 192:
          case 200:
          case 208:
          case 216:
          case 224:
          case 232:
          case 240:
          case 248:
            this.shiftBackgroundRegisters();
            // increase hori(v)
            if(renderingEnabled) {
              if ((this.v & 0x001F) == 31) { // if coarse X == 31
                this.v &= ~0x001F          // coarse X = 0
                this.v ^= 0x0400           // switch horizontal nametable
              } else {
                this.v += 1                // increment coarse X
              }
            }
            ++this.cycle;
            return;
          case 256:
            // inc vert(v)
            // Increase vert(v) but only if rendering is enabled
            if (renderingEnabled) {
              // See: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
              if ((this.v & 0x7000) != 0x7000) {
                // if fine Y < 7
                this.v += 0x1000; // increment fine Y
              } else {
                this.v &= ~0x7000; // fine Y = 0
                let y = (this.v & 0x03e0) >> 5; // let y = coarse Y
                if (y == 29) {
                  y = 0; // coarse Y = 0
                  this.v ^= 0x0800; // switch vertical nametable
                } else if (y == 31) {
                  y = 0; // coarse Y = 0, nametable not switched
                } else {
                  y += 1; // increment coarse Y
                }
                this.v = (this.v & ~0x03e0) | (y << 5); // put coarse Y back into v
              }
            }
            // Build the scanline sprite cache for this scanline by reading OAM data and compiling
            // cache which is like secondary OAM
            this.buildScanlineSpriteCache(scanline);
 
            ++this.cycle;
            return;
          case 257:
            // hori(v) = hori(t)
            // copy over hortizontal information from t to v
            // See: https://wiki.nesdev.com/w/index.php/PPU_scrolling
            if(renderingEnabled) {
              this.v = (this.v & 0b111101111100000) | (this.t & 0b000010000011111);
            }
            ++this.cycle;
            return;
         case 328:
            this.shiftBackgroundRegisters();
            // increase hori(v)
            if(renderingEnabled) {
              if ((this.v & 0x001F) == 31) { // if coarse X == 31
                this.v &= ~0x001F          // coarse X = 0
                this.v ^= 0x0400           // switch horizontal nametable
              } else {
                this.v += 1                // increment coarse X
              }
            }
            ++this.cycle;
            return;
          case 336:
            // Since there was no rendering, we need to make sure to shift background registers
            this.backgroundTileFirstShiftRegister =
            this.backgroundTileFirstShiftRegister << 8;
            this.backgroundTileSecondShiftRegister =
            this.backgroundTileSecondShiftRegister << 8;
            this.shiftBackgroundRegisters();
            // increase hori(v)
            if(renderingEnabled) {
              if ((this.v & 0x001F) == 31) { // if coarse X == 31
                this.v &= ~0x001F          // coarse X = 0
                this.v ^= 0x0400           // switch horizontal nametable
              } else {
                this.v += 1                // increment coarse X
              }
            }
 
            ++this.cycle;
            return;
        }
    } else if(scanline == 261) {
        switch (cycle) {
          case 0:
            // Clearing VBlank and sprite 0
            this.registers[0x02] = this.registers[0x02] & 0b00111111;
            ++this.cycle;
            return;
          case 8:
          case 16:
          case 24:
          case 32:
          case 40:
          case 48:
          case 56:
          case 64:
          case 72:
          case 80:
          case 88:
          case 96:
          case 104:
          case 112:
          case 120:
          case 128:
          case 136:
          case 144:
          case 152:
          case 160:
          case 168:
          case 176:
          case 184:
          case 192:
          case 200:
          case 208:
          case 216:
          case 224:
          case 232:
          case 240:
          case 248:
            this.shiftBackgroundRegisters();
            // increase hori(v)
            if(renderingEnabled) {
              if ((this.v & 0x001F) == 31) { // if coarse X == 31
                this.v &= ~0x001F          // coarse X = 0
                this.v ^= 0x0400           // switch horizontal nametable
              } else {
                this.v += 1                // increment coarse X
              }
            }
            ++this.cycle;
            return;
          case 256:
            // inc vert(v)
            // Increase vert(v) but only if rendering is enabled
            if (renderingEnabled) {
              // See: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
              if ((this.v & 0x7000) != 0x7000) {
                // if fine Y < 7
                this.v += 0x1000; // increment fine Y
              } else {
                this.v &= ~0x7000; // fine Y = 0
                let y = (this.v & 0x03e0) >> 5; // let y = coarse Y
                if (y == 29) {
                  y = 0; // coarse Y = 0
                  this.v ^= 0x0800; // switch vertical nametable
                } else if (y == 31) {
                  y = 0; // coarse Y = 0, nametable not switched
                } else {
                  y += 1; // increment coarse Y
                }
                this.v = (this.v & ~0x03e0) | (y << 5); // put coarse Y back into v
              }
            }
            // Build the scanline sprite cache for this scanline by reading OAM data and compiling
            // cache which is like secondary OAM
            this.buildScanlineSpriteCache(scanline);
 
            ++this.cycle;
            return;
          case 257:
            // hori(v) = hori(t)
            // copy over hortizontal information from t to v
            // See: https://wiki.nesdev.com/w/index.php/PPU_scrolling
            if(renderingEnabled) {
              this.v = (this.v & 0b111101111100000) | (this.t & 0b000010000011111);
            }
            ++this.cycle;
            return;
          case 304:
            // vert(v) = vert(t)
            // This would normally be done on cycles 280 to 304, but we do it on the last
            if(renderingEnabled) {
              this.v =
                (this.v & 0b000010000011111) | (this.t & 0b111101111100000);
            }
            ++this.cycle;
            return;
          case 328:
            this.shiftBackgroundRegisters();
            // increase hori(v)
            if(renderingEnabled) {
              if ((this.v & 0x001F) == 31) { // if coarse X == 31
                this.v &= ~0x001F          // coarse X = 0
                this.v ^= 0x0400           // switch horizontal nametable
              } else {
                this.v += 1                // increment coarse X
              }
            }
            ++this.cycle;
            return;
          case 336:
            // Since there was no rendering, we need to make sure to shift background registers
            this.backgroundTileFirstShiftRegister =
            this.backgroundTileFirstShiftRegister << 8;
            this.backgroundTileSecondShiftRegister =
            this.backgroundTileSecondShiftRegister << 8;
            this.shiftBackgroundRegisters();
            if(renderingEnabled) {
              // increase hori(v)
              if ((this.v & 0x001F) == 31) { // if coarse X == 31
                this.v &= ~0x001F          // coarse X = 0
                this.v ^= 0x0400           // switch horizontal nametable
              } else {
                this.v += 1                // increment coarse X
              }
            }
            ++this.cycle;
            return;
        }
      }

      if (scanline === 241 && cycle === 1) {
        // Fire off Vblank
        this.registers[0x02] |= 0b10000000;
        this.$parent.frameNotCompleted = false;

        // And fire VBlank NMI if PPUCTRL bit 7 is set
        if (this.NMIEnabled) {
          this.cpu.nmi = 1;
        }
        ++this.cycle;
        return;
      }

      /**
       * This code is thanks to ahak from twitch.  Thanks!
       */
      if (
        (++this.cycle == 340 && this.odd && renderingEnabled) ||
        this.cycle == 341
      ) {
        this.cycle = 0;
        if (++this.scanline == 262) {
          this.scanline = 0;
          this.odd = !this.odd;
          return;
        }
      }
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
    crunchV(v) {
      let fineY = v >>> 12;
      let nameTableSelect = (v & 0xfff) >> 10;
      let coarseY = (v & 0x3ff) >> 5;
      let coarseX = v & 0x1f;
      return (
        "fineY: " +
        fineY +
        " ntS: " +
        nameTableSelect.toString(16) +
        " coarseY: " +
        coarseY.toString(16) +
        " coarseX: " +
        coarseX.toString(16)
      );
    },
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
    baseNameTableAddress() {
      // Base will be 0 - 3
      // See: http://wiki.nesdev.com/w/index.php/PPU_registers#PPUCTRL
      let base = this.ppuctrl() & 0b00000011;
      return 0x2000 + base * 0x400;
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
    resolveWrite(address) {
      return (value) => {
        this.set(address, value);
      }
    },
    resolveRead(address) {
      return () => {
        return this.get(address);
      }
    },
    set(address, value) {
      if (address === 0x0002) {
        // Do not do anything.  PPUSTATUS is read only
        return;
      }
      let oldValue = this.registers[address];
      this.registers[address] = value;
      // Now, check if we wrote to PPUADDR, if so, let's shift it into our dataAddress
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

        let tempValue = (value << 10) & 0x7fff;
        this.t = (this.t & 0b111001111111111) | (tempValue & 0b000110000000000);

        // Set basePatternTableAddress
        this.basePatternTableAddress = (value & 0x10) === 0x10 ? 0x1000: 0x0000;

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
      } else if (address == 0x0005) {
        if (this.w === false) {
          // Set scroll
          let tempValue = (value >>> 3) & 0x7fff;
          this.t =
            (this.t & 0b111111111100000) | (tempValue & 0b000000000011111);
          this.x = value & 0b111;
          this.w = true;
        } else {
          // Copy over CBA
          let tempValue = (value << 12) & 0x7fff;
          this.t =
            (this.t & 0b000111111111111) | (tempValue & 0b111000000000000);
          // Now copy over HG
          tempValue = (value << 2) & 0x7fff;
          this.t =
            (this.t & 0b111110011111111) | (tempValue & 0b000001100000000);
          // Now copy over FED
          tempValue = (value << 4) & 0x7fff;
          this.t =
            (this.t & 0b111111100011111) | (tempValue & 0b000000011100000);
          this.w = false;
        }
      } else if (address === 0x0006) {
        this.v = this.v << 8;
        // Now, bring in the value to the left and mask it to a 16-bit address
        this.v = (this.v | value) & 0xffff;
        // Now modify the t internal register
        if (this.w === false) {
          let tempValue = value << 8;
          this.t =
            (this.t & 0b000000011111111) | (tempValue & 0b011111100000000);
          this.w = true;
        } else {
          this.v = this.t =
            (this.t & 0b111111100000000) | (value & 0b000000011111111);
          this.w = false;
        }
      } else if (address === 0x0007) {
        // If this is the case, then we write to the address requested by this.dataAddress as well
        // and then increment the address
        this.vram.set(this.v, value);
        let increase = (this.ppuctrl() & 0b00000100) === 0b00000100 ? 32 : 1;
        this.v = (this.v + increase) & 0xffff;
      }
    },
    get(address) {
      if (address === 0x0007) {
        // Then we actually want to return from the VRAM address requested
        let result = this.vram.get(this.v);
        if (!this.console.$refs.cpu.inDebug) {
          let increase = (this.ppuctrl() & 0b00000100) === 0b00000100 ? 32 : 1;
          this.v = (this.v + increase) & 0x7fff;
          // @todo Handle weird behavior if during render and we change, it should
          // do a coarse y and x increment.  See: https://wiki.nesdev.com/w/index.php/PPU_scrolling#Wrapping_around
        }
        return result;
      } else if (address === 0x0002) {
        // Reading of status
        let result = this.registers[address];
        if (!this.cpu.inDebug) {
          // This is reading the PPU status register so be sure to clear vblank.
          this.setVBlank(false);

          this.statusRegisterReadFlag = !this.statusRegisterReadFlag;
          // Reset address latch used by PPUADDR and PPUSCROLL
          // See: https://wiki.nesdev.com/w/index.php/PPU_registers#Notes
          this.v = 0x00;
          // Reset the w write toggle
          this.w = false;
        }
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
      this.oam[address] = value;
    },
    // See: http://wiki.nesdev.com/w/index.php/PPU_power_up_state
    reset() {
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
      //let value = ((this.backgroundTileSecondShiftRegister & 0x8000) >>> 14);
      let value =
        ((this.backgroundTileSecondShiftRegister & 0x8000) >>> 14) +
        ((this.backgroundTileFirstShiftRegister & 0x8000) >>> 15);
      //console.log(value);
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
            backgroundColorIndex
          ) {
            this.setSprite0Hit(true);
          }
          colorIndex = activeSpritePixelInformation.colorIndex;
          palette = activeSpritePixelInformation.palette;
        } else {
          colorIndex = backgroundColorIndex;
          // @todo Find proper palette number for background attribute byte and x/y offset
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
    <div class="ppu">
    <canvas id="screen" class="screen" width="256" height="240"></canvas>

  </div>
  `

});