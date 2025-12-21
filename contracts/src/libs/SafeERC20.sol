// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

library SafeERC20 {
    function safeTransfer(address token, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, value));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "SAFE_TRANSFER_FAIL");
    }

    function safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, value));
        require(ok && (data.length == 0 || abi.decode(data, (bool))), "SAFE_TF_FROM_FAIL");
    }
}
