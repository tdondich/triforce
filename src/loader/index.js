import Mapper0 from './mappers/mapper-0'
import axios from 'axios'
import Vue from 'vue'

/**
Builds a String from a DataView (backed by an ArrayBuffer)
 */
function getStringFromDataView(
    view,
    offset = 0,
    length = view.byteLength - offset
) {
    let value = new String();
    for (let count = 0; count < length; count++) {
        value = value + String.fromCharCode(view.getInt8(offset + count));
    }
    return value;
}

function copyToMemory(source, offset, length, target, address, bus = "prg") {
    for (let count = 0; count < length; count++) {
        target.set(address + count, source[offset + count], bus);
    }
}


function Loader() {
    // Instance variables
    this.romName = 'color_test';
    this.loadError = false;
    this.loadSuccess = false;
    this.data = null;

    // Other items

    this.mapper = new Mapper0();

    // Fake it til you make it
    let eventBus = new Vue();
    this.$on = eventBus.$on.bind(eventBus);
    this.$emit = eventBus.$emit.bind(eventBus);
}


// Computed characteristics of the rom after being loaded
// See: http://wiki.nesdev.com/w/index.php/INES
Loader.prototype.prgRomSize = function () {
    return this.data[4];
};
Loader.prototype.chrRomSize = function () {
    return this.data[5];
};
Loader.prototype.prgRamSize = function () {
    // Default to 1 if value is 0 for backwards compatibility
    return this.data[8] == 0 ? 1 : this.data[8];
};
Loader.prototype.mirroring = function () {
    return (this.data[6] & 0b00000001) == 0b00000001
        ? "vertical"
        : "horizontal";
};
Loader.prototype.batteryBacked = function () {
    return (this.data[6] & 0b00000010) == 0b00000010;
};
Loader.prototype.trainerExists = function () {
    return (this.data[6] & 0b00000100) == 0b00000100;
};
Loader.prototype.ignoreMirroring = function () {
    return (this.data[6] & 0b00001000) == 0b00001000;
};
Loader.prototype.mappingNumber = function () {
    // Combine the nibbles of byte 6 and 7
    let lower = this.data[6] >>> 4;
    let upper = this.data[7] & 0b11110000;
    let mapping = upper | lower;
    return mapping;
};
Loader.prototype.vsSystem = function () {
    return (this.data[8] & 0b00000001) == 0b00000001;
},
    Loader.prototype.playChoice10 = function () {
        return (this.data[8] & 0b00000010) == 0b00000010;
    };
Loader.prototype.nes2Format = function () {
    return (this.data[8] & 0b00000100) == 0b00000100;
};
Loader.prototype.tvFormat = function () {
    return (this.data[9] & 0b00000001) == 0b00000001 ? "pal" : "ntsc";
};

Loader.prototype.setRom = function (rom) {
    this.romName = rom;
};
// Our getters and setters will pass through to our mapper
Loader.prototype.get = function (address, bus = "prg") {
    return this.mapper.get(address, bus);
};
Loader.prototype.getRange = function (address, length, bus = "prg") {
    return this.mapper.getRange(address, length, bus);
};

Loader.prototype.set = function (address, value, bus = "prg") {
    return this.mapper.set(address, value, bus);
};
Loader.prototype.load = function () {
    this.loadError = this.loadSuccess = false;
    axios
        .get("/roms/" + this.romName + ".nes", {
            responseType: "arraybuffer"
        })
        .then(response => {
            // The response.data property is the arraybuffer of our binary data
            // We assume this is a iNES file.
            // See: http://wiki.nesdev.com/w/index.php/INES

            // Fetch header from iNES file
            let header = new DataView(response.data, 0, 16);
            if (getStringFromDataView(header, 0, 3) != "NES") {
                this.loadError = "Invalid rom file provided";
                return;
            }
            // Now assign to our data
            this.data = new Uint8Array(response.data);
            this.transfer();

            // Emit a message that states the ROM is loaded
            this.$emit('loaded');
            this.loadSuccess = "Loaded " + this.romName + " ROM";
        })
        .catch(error => {
            alert(error);
        });
};
// Transfer copies contents into the mapper
Loader.prototype.transfer = function () {
    // Right now, we're only handling mapping 0 aka NROM
    // Copy over trainer, if it exists
    if (this.trainerExists()) {
        // Copy the source data to the target address in memory
        copyToMemory(this.data, 16, 512, this.mapper, 0x7000, "prg");
        copyToMemory(
            this.data,
            16 + 512,
            this.prgRomSize() * 16384,
            this.mapper,
            0x3fe0,
            "prg"
        );
        // Now copy over CHR data
        copyToMemory(
            this.data,
            16 + 512 + this.prgRomSize() * 16384,
            this.chrRomSize() * 8192,
            this.mapper,
            0x0000,
            "chr"
        );
    } else {
        // Copy to 0x8000 prgRomSize * 16384 from offset 16
        copyToMemory(
            this.data,
            16,
            this.prgRomSize() * 16384,
            this.mapper,
            0x3fe0,
            "prg"
        );
        if (this.prgRomSize() == 1 && this.mappingNumber() == 0) {
            // Mirror the prg rom to 0xc000
            copyToMemory(this.data, 16, 16384, this.mapper, 0x7fe0, "prg");
        }
        // Now copy over CHR data
        copyToMemory(
            this.data,
            16 + this.prgRomSize() * 16384,
            this.chrRomSize() * 8192,
            this.mapper,
            0x0000,
            "chr"
        );
    }
}

export default Loader