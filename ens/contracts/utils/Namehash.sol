// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// minimal ENS namehash for "label.label.tld" style names
library Namehash {
    function namehash(string memory domain) internal pure returns (bytes32) {
        bytes memory s = bytes(domain);
        if (s.length == 0) return bytes32(0);

        bytes32 node = bytes32(0);
        uint256 i = s.length;

        while (i > 0) {
            uint256 j = i;
            while (j > 0 && s[j-1] != 0x2e) { j--; } // '.'
            bytes32 labelHash = keccak256(_slice(s, j, i - j));
            node = keccak256(abi.encodePacked(node, labelHash));
            if (j == 0) break;
            i = j - 1;
        }
        return node;
    }

    function _slice(bytes memory s, uint256 start, uint256 len) private pure returns (bytes memory out) {
        out = new bytes(len);
        for (uint256 k = 0; k < len; k++) out[k] = s[start + k];
    }
}
