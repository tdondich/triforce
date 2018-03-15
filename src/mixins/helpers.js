// Format a value as visual hex
function fh(value, precision = 2) {
    let output =  value.toString(16);
    output = output.padStart(precision, '0').toUpperCase();
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
