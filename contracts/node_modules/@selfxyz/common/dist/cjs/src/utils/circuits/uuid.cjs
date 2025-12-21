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

// src/utils/circuits/uuid.ts
var uuid_exports = {};
__export(uuid_exports, {
  bigIntToHex: () => bigIntToHex,
  castFromScope: () => castFromScope,
  castFromUUID: () => castFromUUID,
  castToAddress: () => castToAddress,
  castToScope: () => castToScope,
  castToUUID: () => castToUUID,
  castToUserIdentifier: () => castToUserIdentifier,
  hexToUUID: () => hexToUUID,
  stringToAsciiBigIntArray: () => stringToAsciiBigIntArray,
  validateUserId: () => validateUserId
});
module.exports = __toCommonJS(uuid_exports);
function hexToBigInt(hex) {
  return BigInt(`0x${hex}`);
}
function checkBigInt(bigInt) {
  const max253BitValue = BigInt(2n ** 253n - 1n);
  if (bigInt > max253BitValue) {
    throw new Error("Input should be < 2^253 - 1");
  }
}
function uuidToBigInt(uuid) {
  const hexString = uuid.replace(/-/g, "");
  const bigInt = hexToBigInt(hexString);
  return bigInt;
}
function bigIntToHex(bigInt) {
  return bigInt.toString(16).padStart(32, "0");
}
function castFromScope(scope) {
  checkStringLength(scope);
  return stringToBigInt(scope).toString();
}
function castFromUUID(uuid) {
  const bigInt = uuidToBigInt(uuid);
  checkBigInt(bigInt);
  return bigInt.toString();
}
function castToAddress(bigInt) {
  return `0x${bigInt.toString(16).padStart(40, "0")}`;
}
function castToScope(num) {
  const str = num.toString().slice(1);
  const charCodes = str.match(/.{1,3}/g) || [];
  return String.fromCharCode(...charCodes.map((code) => parseInt(code, 10)));
}
function castToUUID(bigInt) {
  const hex = bigIntToHex(bigInt);
  return hexToUUID(hex);
}
function checkStringLength(str) {
  if (str.length > 25) {
    throw new Error("Input string must not exceed 25 characters");
  }
}
function stringToBigInt(str) {
  return BigInt(
    "1" + Array.from(str).map((char) => char.charCodeAt(0).toString().padStart(3, "0")).join("")
  );
}
function castToUserIdentifier(bigInt, user_identifier_type) {
  switch (user_identifier_type) {
    case "hex":
      return castToAddress(bigInt);
    case "uuid":
      return castToUUID(bigInt);
  }
}
function hexToUUID(hex) {
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function stringToAsciiBigIntArray(str) {
  const asciiBigIntArray = [];
  for (let i = 0; i < str.length; i++) {
    asciiBigIntArray.push(BigInt(str.charCodeAt(i)));
  }
  return asciiBigIntArray;
}
function validateUserId(userId, type) {
  switch (type) {
    case "hex":
      return /^[0-9A-Fa-f]+$/.test(userId);
    case "uuid":
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId
      );
    default:
      return false;
  }
}
//# sourceMappingURL=uuid.cjs.map