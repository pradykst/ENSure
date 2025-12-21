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
export {
  getPackedForbiddenCountries
};
//# sourceMappingURL=forbiddenCountries.js.map