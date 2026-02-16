// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import { BountyEscrow } from "../src/BountyEscrow.sol";

contract DeployEscrow is Script {
    function run() external returns (BountyEscrow escrow) {
        address usdc = vm.envAddress("USDC_ADDRESS");
        address treasury = vm.envAddress("TREASURY_ADDRESS");

        vm.startBroadcast();
        escrow = new BountyEscrow(usdc, treasury);
        vm.stopBroadcast();
    }
}
