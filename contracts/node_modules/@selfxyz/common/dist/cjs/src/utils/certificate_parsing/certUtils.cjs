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

// src/utils/certificate_parsing/certUtils.ts
var certUtils_exports = {};
__export(certUtils_exports, {
  getAuthorityKeyIdentifier: () => getAuthorityKeyIdentifier,
  getIssuerCountryCode: () => getIssuerCountryCode,
  getSubjectKeyIdentifier: () => getSubjectKeyIdentifier
});
module.exports = __toCommonJS(certUtils_exports);

// src/utils/certificate_parsing/utils.ts
var asn1js = __toESM(require("asn1js"), 1);
var import_js_sha256 = require("js-sha256");
var getAuthorityKeyIdentifier = (cert) => {
  const authorityKeyIdentifierExt = cert.extensions.find((ext) => ext.extnID === "2.5.29.35");
  if (authorityKeyIdentifierExt) {
    const extnValueHex = authorityKeyIdentifierExt.extnValue.valueBlock.valueHexView;
    const asn1 = asn1js.fromBER(extnValueHex);
    if (asn1.offset !== -1) {
      const constructedValue = asn1.result.valueBlock;
      if (constructedValue.value) {
        const keyIdentifierElement = constructedValue.value.find(
          (element) => element.idBlock.tagClass === 3 && element.idBlock.tagNumber === 0
        );
        if (keyIdentifierElement) {
          return Buffer.from(keyIdentifierElement.valueBlock.valueHexView).toString("hex");
        }
      }
    }
  } else {
    console.log("\x1B[31m%s\x1B[0m", "no authority key identifier found");
  }
  return "";
};
function getIssuerCountryCode(cert) {
  const issuerRDN = cert.issuer.typesAndValues;
  let issuerCountryCode = "";
  for (const rdn of issuerRDN) {
    if (rdn.type === "2.5.4.6") {
      issuerCountryCode = rdn.value.valueBlock.value;
      break;
    }
  }
  return issuerCountryCode.toUpperCase();
}
var getSubjectKeyIdentifier = (cert) => {
  const subjectKeyIdentifier = cert.extensions.find((ext) => ext.extnID === "2.5.29.14");
  if (subjectKeyIdentifier) {
    let skiValue = Buffer.from(subjectKeyIdentifier.extnValue.valueBlock.valueHexView).toString(
      "hex"
    );
    skiValue = skiValue.replace(/^(?:30(?:16|1E|22|32|42))?(?:04(?:08|14|1C|20|30|40))?/, "");
    return skiValue;
  } else {
    const hash = import_js_sha256.sha256.create();
    hash.update(cert.tbsView);
    return hash.hex();
  }
};
//# sourceMappingURL=certUtils.cjs.map