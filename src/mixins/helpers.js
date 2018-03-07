// Format a value as visual hex
function fh(value) {
    let output =  value.toString(16);
    output = output.padStart(output.length <= 2 ? 2 : 4, '0').toUpperCase();
    return output;
}

// Convert an unsigned byte integer to a signed integer
function unsignedByteToSignedByte(b)   
{
    return b > 127 ? b - 256 : b;
}

export {
    fh,
    unsignedByteToSignedByte
}