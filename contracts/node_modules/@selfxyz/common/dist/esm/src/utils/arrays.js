// src/utils/arrays.ts
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
export {
  arraysAreEqual,
  findSubarrayIndex
};
//# sourceMappingURL=arrays.js.map