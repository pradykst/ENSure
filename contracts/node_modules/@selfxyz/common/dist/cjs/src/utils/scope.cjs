var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/scope.ts
var scope_exports = {};
__export(scope_exports, {
  bigIntToString: () => bigIntToString,
  formatEndpoint: () => formatEndpoint,
  hashEndpointWithScope: () => hashEndpointWithScope,
  stringToBigInt: () => stringToBigInt
});
module.exports = __toCommonJS(scope_exports);
var import_poseidon_lite2 = require("poseidon-lite");

// src/utils/hash.ts
var import_ethers = require("ethers");
var import_js_sha1 = require("js-sha1");
var import_js_sha256 = require("js-sha256");
var import_js_sha512 = require("js-sha512");
var forge = __toESM(require("node-forge"), 1);
var import_poseidon_lite = require("poseidon-lite");
function flexiblePoseidon(inputs) {
  switch (inputs.length) {
    case 1:
      return (0, import_poseidon_lite.poseidon1)(inputs);
    case 2:
      return (0, import_poseidon_lite.poseidon2)(inputs);
    case 3:
      return (0, import_poseidon_lite.poseidon3)(inputs);
    case 4:
      return (0, import_poseidon_lite.poseidon4)(inputs);
    case 5:
      return (0, import_poseidon_lite.poseidon5)(inputs);
    case 6:
      return (0, import_poseidon_lite.poseidon6)(inputs);
    case 7:
      return (0, import_poseidon_lite.poseidon7)(inputs);
    case 8:
      return (0, import_poseidon_lite.poseidon8)(inputs);
    case 9:
      return (0, import_poseidon_lite.poseidon9)(inputs);
    case 10:
      return (0, import_poseidon_lite.poseidon10)(inputs);
    case 11:
      return (0, import_poseidon_lite.poseidon11)(inputs);
    case 12:
      return (0, import_poseidon_lite.poseidon12)(inputs);
    case 13:
      return (0, import_poseidon_lite.poseidon13)(inputs);
    case 14:
      return (0, import_poseidon_lite.poseidon14)(inputs);
    case 15:
      return (0, import_poseidon_lite.poseidon15)(inputs);
    case 16:
      return (0, import_poseidon_lite.poseidon16)(inputs);
    default:
      throw new Error(`Unsupported number of inputs: ${inputs.length}`);
  }
}

// src/utils/scope.ts
function bigIntToString(bigInt) {
  if (bigInt === 0n) return "";
  let result = "";
  let tempBigInt = bigInt;
  while (tempBigInt > 0n) {
    const charCode = Number(tempBigInt & 0xffn);
    result = String.fromCharCode(charCode) + result;
    tempBigInt = tempBigInt >> 8n;
  }
  return result;
}
function formatEndpoint(endpoint) {
  if (!endpoint) return "";
  return endpoint.replace(/^https?:\/\//, "").split("/")[0];
}
function hashEndpointWithScope(endpoint, scope) {
  const formattedEndpoint = formatEndpoint(endpoint);
  const endpointChunks = [];
  let remaining = formattedEndpoint;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, 31);
    endpointChunks.push(chunk);
    remaining = remaining.slice(31);
  }
  if (endpointChunks.length > 16) {
    throw new Error("Endpoint must be less than 496 characters");
  }
  const chunkedEndpointBigInts = endpointChunks.map(stringToBigInt);
  const endpointHash = flexiblePoseidon(chunkedEndpointBigInts);
  const scopeBigInt = stringToBigInt(scope);
  return (0, import_poseidon_lite2.poseidon2)([endpointHash, scopeBigInt]).toString();
}
function stringToBigInt(str) {
  if (!/^[\x00-\x7F]*$/.test(str)) {
    throw new Error("Input must contain only ASCII characters (0-127)");
  }
  let result = 0n;
  for (let i = 0; i < str.length; i++) {
    result = result << 8n | BigInt(str.charCodeAt(i));
  }
  const MAX_VALUE = (1n << 248n) - 1n;
  if (result > MAX_VALUE) {
    console.log(`str: ${str}, str.length: ${str.length}`);
    throw new Error("Resulting BigInt exceeds maximum size of 31 bytes");
  }
  return result;
}
//# sourceMappingURL=scope.cjs.map