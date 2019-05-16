import Memory from "../../memory";
import Databus from '../../databus'

function Mapper0() {
    this.prgram = new Memory(8192);
    this.prgrom1 = new Memory(16384);
    this.prgrom2 = new Memory(16384);
    this.expansion = new Memory(8160);
    this.chrmem = new Memory(8192);

    this.prg = new Databus(49120, [
        {
            ref: this.expansion,
            min: 0x0000,
            max: 0x1FDF,
            size: 8160,
        },
        {
            ref: this.prgram,
            min: 0x1FE0,
            max: 0x3FDF,
            size: 8192,
        },
        {
            ref: this.prgrom1,
            min: 0x3FE0,
            max: 0x7FDF,
            size: 16384
        },
        {
            ref: this.prgrom2,
            min: 0x7FE0,
            max: 0xBFDF,
            size: 16384
        }
    ])

    this.chr = new Databus(8192, [
        {
            ref: this.chrmem,
            min: 0x0000,
            max: 0x1FFF,
            size: 8192
        }
    ]);
}

Mapper0.prototype.get = function (address, bus = "prg") {
    // Pass it on to one of our data buses
    return this[bus].get(address, bus);
}
Mapper0.prototype.getRange = function (address, length, bus = "prg") {
    return this[bus].getRange(address, length);
}
Mapper0.prototype.set = function (address, value, bus = "prg") {

    // Pass it on to one of our data buses
    return this[bus].set(address, value, bus);
}

export default Mapper0
