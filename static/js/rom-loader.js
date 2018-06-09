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


Vue.component('rom-loader', {

    data: function () {
        return {
            loadError: false,
            loadSuccess: false,
            data: null,
            romName: "color_test"
        };
    },
    computed: {
      // Computed characteristics of the rom after being loaded
      // See: http://wiki.nesdev.com/w/index.php/INES
      prgRomSize() {
        return this.data[4];
      },
      chrRomSize() {
        return this.data[5];
      },
      prgRamSize() {
        // Default to 1 if value is 0 for backwards compatibility
        return this.data[8] == 0 ? 1 : this.data[8];
      },
      mirroring() {
        return (this.data[6] & 0b00000001) == 0b00000001
          ? "vertical"
          : "horizontal";
      },
      batteryBacked() {
        return (this.data[6] & 0b00000010) == 0b00000010;
      },
      trainerExists() {
        return (this.data[6] & 0b00000100) == 0b00000100;
      },
      ignoreMirroring() {
        return (this.data[6] & 0b00001000) == 0b00001000;
      },
      mappingNumber() {
        // Combine the nibbles of byte 6 and 7
        let lower = this.data[6] >>> 4;
        let upper = this.data[7] & 0b11110000;
        let mapping = upper | lower;
        return mapping;
      },
      vsSystem() {
        return (this.data[8] & 0b00000001) == 0b00000001;
      },
      playChoice10() {
        return (this.data[8] & 0b00000010) == 0b00000010;
      },
      nes2Format() {
        return (this.data[8] & 0b00000100) == 0b00000100;
      },
      tvFormat() {
        return (this.data[9] & 0b00000001) == 0b00000001 ? "pal" : "ntsc";
      }
    },
    methods: {
      resolveRead(address, bus = "prg") {
        return this.$refs.mapper.resolveRead(address, bus);
      },
      resolveWrite(address, bus = "prg") {
        return this.$refs.mapper.resolveWrite(address, bus);
      },
      // Our getters and setters will pass through to our mapper
      get(address, bus = "prg") {
        return this.$refs.mapper.get(address, bus);
      },
      getRange(address, length, bus = "prg") {
        return this.$refs.mapper.getRange(address, length, bus);
     },
  
      set(address, value, bus = "prg") {
        return this.$refs.mapper.set(address, value, bus);
      },
      load() {
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
            // Modify nametable databus to do appropriate mirroring
            this.$parent.$refs.nametablebus.setMirroring(this.mirroring);

            // Tell the console to turn on
            setTimeout(this.$parent.power, 1000);
            this.loadSuccess = "Loaded " + this.romName + " ROM";
          })
          .catch(error => {
            console.log(error);
          });
      },
      // Transfer copies contents into the mapper
      transfer() {
        // Right now, we're only handling mapping 0 aka NROM
        // Copy over trainer, if it exists
        if (this.trainerExists) {
          // Copy the source data to the target address in memory
          copyToMemory(this.data, 16, 512, this.$refs.mapper, 0x7000, "prg");
          copyToMemory(
            this.data,
            16 + 512,
            this.prgRomSize * 16384,
            this.$refs.mapper,
            0x3fe0,
            "prg"
          );
          // Now copy over CHR data
          copyToMemory(
            this.data,
            16 + 512 + this.prgRomSize * 16384,
            this.chrRomSize * 8192,
            this.$refs.mapper,
            0x0000,
            "chr"
          );
        } else {
          // Copy to 0x8000 prgRomSize * 16384 from offset 16
          copyToMemory(
            this.data,
            16,
            this.prgRomSize * 16384,
            this.$refs.mapper,
            0x3fe0,
            "prg"
          );
          if (this.prgRomSize == 1 && this.mappingNumber == 0) {
            // Mirror the prg rom to 0xc000
            copyToMemory(this.data, 16, 16384, this.$refs.mapper, 0x7fe0, "prg");
          }
          // Now copy over CHR data
          copyToMemory(
            this.data,
            16 + this.prgRomSize * 16384,
            this.chrRomSize * 8192,
            this.$refs.mapper,
            0x0000,
            "chr"
          );
        }
      },
    },
    template: `
       <div class="row">
        <div class="col-sm-12">
            <div class="alert alert-danger" v-if="loadError">
                {{loadError}}
            </div>
            <div class="alert alert-success" v-if="loadSuccess">
                {{loadSuccess}}
            </div>
            <p>
                <input v-model="romName">
                <button @click="load">Load ROM</button>
            </p>
            <table class="table table-dark table-sm" v-if="loadSuccess">
                <thead>
                    <tr>
                        <th>PRG ROM Size</th>
                        <th>CHR ROM Size</th>
                        <th>PRG RAM Size</th>
                        <th>Mirroring</th>
                        <th>Battery Backed</th>
                        <th>Trainer Exists</th>
                        <th>Ignore Mirroring</th>
                        <th>Mapping Number</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{{prgRomSize}}</td>
                        <td>{{chrRomSize}}</td>
                        <td>{{prgRamSize}}</td>
                        <td>{{mirroring}}</td>
                        <td>{{batteryBacked}}</td>
                        <td>{{trainerExists}}</td>
                        <td>{{ignoreMirroring}}</td>
                        <td>{{mappingNumber}}</td>
                    </tr>
                </tbody>
            </table>

            <mapper-0 ref="mapper" />

        </div>
    </div>
    `

});