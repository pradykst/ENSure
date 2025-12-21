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

// src/utils/circuits/formatOutputs.ts
var formatOutputs_exports = {};
__export(formatOutputs_exports, {
  formatAndUnpackForbiddenCountriesList: () => formatAndUnpackForbiddenCountriesList,
  formatAndUnpackReveal: () => formatAndUnpackReveal,
  formatForbiddenCountriesListFromCircuitOutput: () => formatForbiddenCountriesListFromCircuitOutput,
  getAttributeFromUnpackedReveal: () => getAttributeFromUnpackedReveal,
  getOlderThanFromCircuitOutput: () => getOlderThanFromCircuitOutput,
  revealBitmapFromAttributes: () => revealBitmapFromAttributes,
  revealBitmapFromMapping: () => revealBitmapFromMapping,
  unpackReveal: () => unpackReveal
});
module.exports = __toCommonJS(formatOutputs_exports);

// src/constants/constants.ts
var attributeToPosition = {
  issuing_state: [2, 4],
  name: [5, 43],
  passport_number: [44, 52],
  nationality: [54, 56],
  date_of_birth: [57, 62],
  gender: [64, 64],
  expiry_date: [65, 70],
  older_than: [88, 89],
  ofac: [90, 90]
};
var attributeToPosition_ID = {
  issuing_state: [2, 4],
  name: [60, 89],
  passport_number: [5, 13],
  nationality: [45, 47],
  date_of_birth: [30, 35],
  gender: [37, 37],
  expiry_date: [38, 43],
  older_than: [90, 91],
  ofac: [92, 92]
};

// src/utils/circuits/formatOutputs.ts
function formatAndUnpackForbiddenCountriesList(forbiddenCountriesList_packed) {
  const forbiddenCountriesList_packed_formatted = [
    forbiddenCountriesList_packed["forbidden_countries_list_packed[0]"],
    forbiddenCountriesList_packed["forbidden_countries_list_packed[1]"],
    forbiddenCountriesList_packed["forbidden_countries_list_packed[2]"],
    forbiddenCountriesList_packed["forbidden_countries_list_packed[3]"]
  ];
  const trimmed = trimu0000(unpackReveal(forbiddenCountriesList_packed_formatted, "id"));
  const countries = [];
  for (let i = 0; i < trimmed.length; i += 3) {
    const countryCode = trimmed.slice(i, i + 3).join("");
    if (countryCode.length === 3) {
      countries.push(countryCode);
    }
  }
  return countries;
}
function trimu0000(unpackedReveal) {
  return unpackedReveal.filter((value) => value !== "\0");
}
function formatAndUnpackReveal(revealedData_packed, id_type) {
  const revealedData_packed_formatted_passport = [
    revealedData_packed["revealedData_packed[0]"],
    revealedData_packed["revealedData_packed[1]"],
    revealedData_packed["revealedData_packed[2]"]
  ];
  const revealedData_packed_formatted_id = [
    revealedData_packed["revealedData_packed[0]"],
    revealedData_packed["revealedData_packed[1]"],
    revealedData_packed["revealedData_packed[2]"],
    revealedData_packed["revealedData_packed[3]"]
  ];
  return unpackReveal(
    id_type === "passport" ? revealedData_packed_formatted_passport : revealedData_packed_formatted_id,
    id_type
  );
}
function formatForbiddenCountriesListFromCircuitOutput(forbiddenCountriesList) {
  const countryList1 = unpackReveal(forbiddenCountriesList, "id");
  const cleanedCountryList = countryList1.filter((value) => value !== "\0");
  const formattedCountryList = [];
  for (let i = 0; i < cleanedCountryList.length; i += 3) {
    const countryCode = cleanedCountryList.slice(i, i + 3).join("");
    if (countryCode.length === 3) {
      formattedCountryList.push(countryCode);
    }
  }
  return formattedCountryList;
}
function getAttributeFromUnpackedReveal(unpackedReveal, attribute, id_type) {
  const position = id_type === "passport" ? attributeToPosition[attribute] : attributeToPosition_ID[attribute];
  let attributeValue = "";
  for (let i = position[0]; i <= position[1]; i++) {
    if (unpackedReveal[i] !== "\0") {
      attributeValue += unpackedReveal[i];
    }
  }
  return attributeValue;
}
function getOlderThanFromCircuitOutput(olderThan) {
  const ageString = olderThan.map((code) => String.fromCharCode(parseInt(code))).join("");
  const age = parseInt(ageString, 10);
  return isNaN(age) ? 0 : age;
}
function revealBitmapFromAttributes(disclosureOptions, id_type) {
  const reveal_bitmap = Array(id_type === "passport" ? 88 : 90).fill("0");
  const att_to_position = id_type === "passport" ? attributeToPosition : attributeToPosition_ID;
  Object.entries(disclosureOptions).forEach(([attribute, { enabled }]) => {
    if (enabled && attribute in att_to_position) {
      const [start, end] = att_to_position[attribute];
      reveal_bitmap.fill("1", start, end + 1);
    }
  });
  return reveal_bitmap;
}
function revealBitmapFromMapping(attributeToReveal) {
  const reveal_bitmap = Array(90).fill("0");
  Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
    if (reveal !== "") {
      const [start, end] = attributeToPosition[attribute];
      reveal_bitmap.fill("1", start, end + 1);
    }
  });
  return reveal_bitmap;
}
function unpackReveal(revealedData_packed, id_type) {
  const packedArray = Array.isArray(revealedData_packed) ? revealedData_packed : [revealedData_packed];
  const bytesCount = id_type === "passport" ? [31, 31, 31] : [31, 31, 31, 31];
  const bytesArray = packedArray.flatMap((element, index) => {
    const bytes = bytesCount[index] || 31;
    const elementBigInt = BigInt(element);
    const byteMask = BigInt(255);
    const bytesOfElement = [...Array(bytes)].map((_, byteIndex) => {
      return elementBigInt >> BigInt(byteIndex) * BigInt(8) & byteMask;
    });
    return bytesOfElement;
  });
  return bytesArray.map((byte) => String.fromCharCode(Number(byte)));
}
//# sourceMappingURL=formatOutputs.cjs.map