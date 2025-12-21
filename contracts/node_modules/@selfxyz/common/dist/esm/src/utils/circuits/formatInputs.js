// src/constants/constants.ts
var MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

// src/utils/circuits/formatInputs.ts
function formatCountriesList(countries) {
  if (countries.length > MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH) {
    throw new Error(
      `Countries list must be inferior or equals to ${MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH}`
    );
  }
  for (const country of countries) {
    if (!country || country.length !== 3) {
      throw new Error(
        `Invalid country code: "${country}". Country codes must be exactly 3 characters long.`
      );
    }
  }
  const paddedCountries = countries.concat(
    Array(MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH - countries.length).fill("")
  );
  const result = paddedCountries.flatMap((country) => {
    const chars = country.padEnd(3, "\0").split("").map((char) => char.charCodeAt(0));
    return chars;
  });
  return result;
}
function reverseBytes(input) {
  const hex = input.slice(2);
  const bytes = hex.match(/.{2}/g) || [];
  const reversedBytes = bytes.reverse();
  return "0x" + reversedBytes.join("");
}
function reverseCountryBytes(input) {
  const hex = input.slice(2);
  const groups = hex.match(/.{6}/g) || [];
  const reversedGroups = groups.reverse();
  const remainderLength = hex.length % 6;
  let remainder = "";
  if (remainderLength > 0) {
    remainder = hex.slice(hex.length - remainderLength);
  }
  return "0x" + reversedGroups.join("") + remainder;
}
export {
  formatCountriesList,
  reverseBytes,
  reverseCountryBytes
};
//# sourceMappingURL=formatInputs.js.map