# Triforce
8-Bit Nintendo Emulator Written in Javascript + VueJS

## Why would you do this?
I don't understand the question

## What's the details?
This codebase attempts to be CPU cycle accurate emulation of the original 8-bit Nintendo gaming console.  There are independent VueJS components that emulate various aspects of the system.

### CPU (cpu2a03.js)
All documented opcodes for the Ricoh 2A03 CPU are emulated correctly. Even attempts to emulate some of the documented glitches. there are toggles to allow step by step execution as well as logging of CPU operations.  This fully passes the nestest.nes test rom.

Opcodes are grouped together and defined in their own file (such as opcodes/adc.js).

### Databus (databus.js)
This component simulates a memory bus that provides memory addresses and maps those addresses to the memory i/o methods of connected components.  For example, $0000-$07FF will connect to a memory component.  This databus also provides memory mirroring through specifying connected devices memory addresses but their actual sizes.  Memory mirroring happens internally.

This component also renders a memory inspector which allows you to visually see the memory addresses and their values.  It also provides the ability to directly modify values in memory or fill in ranges of memory with values.

### Memory (memory.js)
This stores values for a static size of memory.  Not much really to talk about here. Generic memory i/o methods.

### CHR Memory (chr.js)
This component provides memory that represents CHR memory.  The difference between this and the basic memory component is that it has the ability to preview the contents of this CHR memory with rendering.

### Nametable (nametable.js)
Provides memory access to nametable memory but also visually provides rendering of the contents of the nametables for visual debugging purposes.

### Rom Loader (rom-loader.js)
Provides a UI to load a ROM and then copy it's contents to the required mapper.

### Mapper-0 (mappers/mapper-0.js)
Provides Mapper 0 support (think first-gen NES games).  Very basic mapper that does no memory switching.

### Joypads (joypads.js)
Provides support for utilizing keyboard or gamepad input and mapping it to both inputs, supporting 2 player games.  Visually renders debugging of joypad presses and releases.

### PPU (Picture Processing Unit) (nesppu.js)
The devil. Emulators the video of the NES.  Utilizes an HTML5 Canvas object for rendering.  Supports palette loading and scrolling. Attempts to emulate the PPU cycles accurately accordingly to https://wiki.nesdev.com/w/index.php/PPU_rendering

### APU (Audio PRocessing Unit) (apu.js)
Work in progress.  Attempts to use browser synthesizer support to simulate NES audio.


## To run
1. Download/clone
1. run npm install
1. run npm run serve

## ROM Loading
So far, only NROMs will load into memory correctly (They're the easiest).
1. Copy test ROM image to the public/roms directory
1. In the ROM Cartidge loader, just type the name of the rom. You don't need to include the .nes extension.

## Where can I find ROMs to play?
I'm not a pirate. I use test ROMs and community ROMs to play with.

## What's not working?
1. Audio is still a major work in progress
1. Slight video palette glitches on scrolling
1. Major discrepency in performance between Chrome and other browsers.  I can't believe this. Chrome is way slower. Firefox runs at native near 60fps.
