var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/passports/format.ts
var format_exports = {};
__export(format_exports, {
  formatAndConcatenateDataHashes: () => formatAndConcatenateDataHashes,
  formatDG1Attribute: () => formatDG1Attribute,
  formatDg2Hash: () => formatDg2Hash,
  formatMrz: () => formatMrz,
  formatName: () => formatName,
  generateSignedAttr: () => generateSignedAttr
});
module.exports = __toCommonJS(format_exports);

// src/utils/bytes.ts
function toUnsignedByte(signedByte) {
  return signedByte < 0 ? signedByte + 256 : signedByte;
}

// src/utils/passports/format.ts
function formatAndConcatenateDataHashes(dataHashes, dg1HashOffset) {
  const concat = [];
  const startingSequence = Array.from(
    { length: dg1HashOffset },
    () => Math.floor(Math.random() * 256) - 128
  );
  concat.push(...startingSequence);
  for (const dataHash of dataHashes) {
    concat.push(...[0, 0, 0, 0, 0, 0, 0]);
    concat.push(...dataHash[1]);
  }
  return concat;
}
function formatDG1Attribute(index, value) {
  const max_length = index[1] - index[0] + 1;
  if (value.length > max_length) {
    throw new Error(
      `Value is too long for index ${index[0]}-${index[1]} value: ${value} value.length: ${value.length} maxLength: ${max_length}`
    );
  }
  return value.padEnd(max_length, "<");
}
function formatDg2Hash(dg2Hash) {
  const unsignedBytesDg2Hash = dg2Hash.map((x) => toUnsignedByte(x));
  while (unsignedBytesDg2Hash.length < 64) {
    unsignedBytesDg2Hash.push(0);
  }
  return unsignedBytesDg2Hash;
}
function formatMrz(mrz) {
  const mrzCharcodes = [...mrz].map((char) => char.charCodeAt(0));
  if (mrz.length === 88) {
    mrzCharcodes.unshift(88);
    mrzCharcodes.unshift(95, 31);
    mrzCharcodes.unshift(91);
    mrzCharcodes.unshift(97);
  } else if (mrz.length === 90) {
    mrzCharcodes.unshift(90);
    mrzCharcodes.unshift(95, 31);
    mrzCharcodes.unshift(93);
    mrzCharcodes.unshift(97);
  } else {
    throw new Error(`Unsupported MRZ length: ${mrz.length}. Expected 88 or 90 characters.`);
  }
  return mrzCharcodes;
}
function formatName(firstName, lastName, targetLength) {
  const formattedLastName = lastName.toUpperCase().split(" ").join("<");
  const formattedFirstName = firstName.toUpperCase().split(" ").join("<");
  let result = `${formattedLastName}<<${formattedFirstName}`;
  if (result.length < targetLength) {
    result = result.padEnd(targetLength, "<");
  } else if (result.length > targetLength) {
    result = result.substring(0, targetLength);
  }
  return result;
}
function generateSignedAttr(messageDigest) {
  const constructedEContent = [];
  constructedEContent.push(...[49, 102]);
  constructedEContent.push(...[48, 21, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 3]);
  constructedEContent.push(...[49, 8, 6, 6, 103, -127, 8, 1, 1, 1]);
  constructedEContent.push(...[48, 28, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 5]);
  constructedEContent.push(...[49, 15, 23, 13, 49, 57, 49, 50, 49, 54, 49, 55, 50, 50, 51, 56, 90]);
  constructedEContent.push(...[48, 47, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 4]);
  constructedEContent.push(...[49, 34, 4, 32]);
  constructedEContent.push(...messageDigest);
  return constructedEContent;
}
//# sourceMappingURL=format.cjs.map