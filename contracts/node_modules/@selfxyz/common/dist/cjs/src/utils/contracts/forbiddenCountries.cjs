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

// src/utils/contracts/forbiddenCountries.ts
var forbiddenCountries_exports = {};
__export(forbiddenCountries_exports, {
  getPackedForbiddenCountries: () => getPackedForbiddenCountries
});
module.exports = __toCommonJS(forbiddenCountries_exports);

// src/constants/constants.ts
var MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

// src/utils/contracts/forbiddenCountries.ts
function getPackedForbiddenCountries(forbiddenCountriesList) {
  if (forbiddenCountriesList.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be less than or equal to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }
  const paddedCountries = [...forbiddenCountriesList];
  while (paddedCountries.length < MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    paddedCountries.push("");
  }
  const countryBytes = [];
  for (const country of paddedCountries) {
    const paddedCountry = country.padEnd(3, "\0");
    for (const char of paddedCountry) {
      countryBytes.push(char.charCodeAt(0));
    }
  }
  let hexString = "0x";
  for (let i = 0; i < countryBytes.length; i++) {
    hexString += countryBytes[i].toString(16).padStart(2, "0");
  }
  const hex = hexString.slice(2);
  const bytes = hex.match(/.{2}/g) || [];
  const reversedBytes = bytes.reverse();
  const reversedHex = "0x" + reversedBytes.join("");
  const result = [];
  let remaining = reversedHex.slice(2);
  const chunkSizeHex = 31 * 2;
  while (remaining.length > 0) {
    const chunk = remaining.slice(-chunkSizeHex);
    remaining = remaining.slice(0, -chunkSizeHex);
    const paddedChunk = chunk.padStart(64, "0");
    result.push("0x" + paddedChunk);
  }
  return result;
}
//# sourceMappingURL=forbiddenCountries.cjs.map