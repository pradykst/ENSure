// src/utils/hash.ts
import { ethers } from "ethers";
import { sha1 } from "js-sha1";
import { sha224, sha256 } from "js-sha256";
import { sha384, sha512 } from "js-sha512";
import * as forge from "node-forge";
import {
  poseidon1,
  poseidon2,
  poseidon3,
  poseidon4,
  poseidon5,
  poseidon6,
  poseidon7,
  poseidon8,
  poseidon9,
  poseidon10,
  poseidon11,
  poseidon12,
  poseidon13,
  poseidon14,
  poseidon15,
  poseidon16
} from "poseidon-lite";

// src/utils/bytes.ts
function hexToSignedBytes(hexString) {
  const bytes = [];
  for (let i = 0; i < hexString.length - 1; i += 2) {
    const byte = parseInt(hexString.substr(i, 2), 16);
    bytes.push(byte >= 128 ? byte - 256 : byte);
  }
  return bytes;
}

// src/utils/hash.ts
function getHashLen(hashFunction) {
  switch (hashFunction) {
    case "sha1":
      return 20;
    case "sha224":
      return 28;
    case "sha256":
      return 32;
    case "sha384":
      return 48;
    case "sha512":
      return 64;
    default:
      console.log(`${hashFunction} not found in getHashLen`);
      return 32;
  }
}
function hash(hashFunction, bytesArray, format = "bytes") {
  const unsignedBytesArray = bytesArray.map((byte) => byte & 255);
  let hashResult;
  switch (hashFunction) {
    case "sha1":
      hashResult = sha1(unsignedBytesArray);
      break;
    case "sha224":
      hashResult = sha224(unsignedBytesArray);
      break;
    case "sha256":
      hashResult = sha256(unsignedBytesArray);
      break;
    case "sha384":
      hashResult = sha384(unsignedBytesArray);
      break;
    case "sha512":
      hashResult = sha512(unsignedBytesArray);
      break;
    default:
      console.log("\x1B[31m%s\x1B[0m", `${hashFunction} not found in hash`);
      hashResult = sha256(unsignedBytesArray);
  }
  if (format === "hex") {
    return hashResult;
  }
  if (format === "bytes") {
    return hexToSignedBytes(hashResult);
  }
  const actualForgeUtil = forge.util ? forge.util : forge.default.util;
  if (format === "binary") {
    return actualForgeUtil.binary.raw.encode(new Uint8Array(hexToSignedBytes(hashResult)));
  }
  throw new Error(`Invalid format: ${format}`);
}
export {
  getHashLen,
  hash
};
//# sourceMappingURL=sha.js.map