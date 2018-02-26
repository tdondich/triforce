# vue-2a03-emu
Ricoh 2A03 CPU Emulator written in Vue.JS

## To run
1. Download/clone
1. run npm install
1. run npm run serve

## ROM Handling
So far, only NROMs will load into memory correctly (They're the easiest).
1. Copy rom to the public/roms directory
1. In the ROM Cartidge loader, just type the name of the rom. You don't need to include the .nes extension.
