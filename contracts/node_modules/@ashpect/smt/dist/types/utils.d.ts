/**
 * Converts a hexadecimal number to a binary number.
 * @param n A hexadecimal number.
 * @returns The relative binary number.
 */
export declare function hexToBin(n: string): string;
/**
 * Returns the binary representation of a key. For each key it is possible
 * to obtain an array of 256 padded bits.
 * @param key The key of a tree entry.
 * @returns The relative array of bits.
 */
export declare function keyToPath(key: string | bigint): number[];
/**
 * Returns the index of the last non-zero element of an array.
 * If there are only zero elements the function returns -1.
 * @param array An array of hexadecimal or big numbers.
 * @returns The index of the last non-zero element.
 */
export declare function getIndexOfLastNonZeroElement(array: any[]): number;
/**
 * Returns the first common elements of two arrays.
 * @param array1 The first array.
 * @param array2 The second array.
 * @returns The array of the first common elements.
 */
export declare function getFirstCommonElements(array1: any[], array2: any[]): any[];
/**
 * Checks if a number is a hexadecimal number.
 * @param n A hexadecimal number.
 * @returns True if the number is a hexadecimal, false otherwise.
 */
export declare function checkHex(n: string): boolean;
