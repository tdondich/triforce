// Format a value as visual hex
function fh(value) {
    return value.toString(16).padStart(2, '0').toUpperCase();
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