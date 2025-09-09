const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying LandRegistry contract...");

  // Get the contract factory
  const LandRegistry = await ethers.getContractFactory("LandRegistry");

  // Deploy the contract
  const landRegistry = await LandRegistry.deploy();
  await landRegistry.deployed();

  console.log("LandRegistry deployed to:", landRegistry.address);
  console.log("Deployment transaction hash:", landRegistry.deployTransaction.hash);

  // Wait for a few confirmations
  console.log("Waiting for confirmations...");
  await landRegistry.deployTransaction.wait(2);

  console.log("Contract deployed successfully!");
  console.log("Contract address:", landRegistry.address);
  console.log("Add this to your .env file:");
  console.log(`CONTRACT_ADDRESS=${landRegistry.address}`);

  // Verify the deployer is an admin
  const [deployer] = await ethers.getSigners();
  const isAdmin = await landRegistry.admins(deployer.address);
  console.log("Deployer is admin:", isAdmin);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });