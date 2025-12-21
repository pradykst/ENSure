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

// src/utils/arrays.ts
var arrays_exports = {};
__export(arrays_exports, {
  arraysAreEqual: () => arraysAreEqual,
  findSubarrayIndex: () => findSubarrayIndex
});
module.exports = __toCommonJS(arrays_exports);
function arraysAreEqual(array1, array2) {
  return array1.length === array2.length && array1.every((value, index) => value === array2[index]);
}
function findSubarrayIndex(arr, subArr) {
  if (!arr || !Array.isArray(arr) || !subArr || !Array.isArray(subArr)) {
    console.warn("Invalid input to findSubarrayIndex:", { arr, subArr });
    return -1;
  }
  if (subArr.length === 0) {
    return -1;
  }
  if (subArr.length > arr.length) {
    return -1;
  }
  return arr.findIndex((_, i) => subArr.every((val, j) => arr[i + j] === val));
}
//# sourceMappingURL=arrays.cjs.map