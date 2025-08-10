import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    brandId: v.id("brands"),
    quantity: v.number(),
    ownerPassword: v.string(),
  },
  handler: async ({ db }, { brandId, quantity, ownerPassword }) => {
    // Check owner password for sensitive operations
    if (ownerPassword !== process.env.CONVEX_OWNER_PASSWORD) {
      throw new Error("Unauthorized: Invalid owner password");
    }

    const brand = await db.get(brandId);
    if (!brand) {
      throw new Error("Brand not found");
    }

    if (brand.quantity < quantity) {
      throw new Error(`Not enough stock. Available: ${brand.quantity}, Requested: ${quantity}`);
    }

    const newQuantity = brand.quantity - quantity;
    await db.patch(brandId, {
      quantity: newQuantity,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Removed ${quantity} bottles of ${brand.name} ${brand.type}. Remaining: ${newQuantity}`,
    };
  },
});
