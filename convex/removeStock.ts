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

    // For complete deletion, allow removing all stock if quantity is very high
    const isCompleteRemoval = quantity >= 99999;
    
    if (!isCompleteRemoval && brand.quantity < quantity) {
      throw new Error(`Not enough stock. Available: ${brand.quantity}, Requested: ${quantity}`);
    }

    const newQuantity = isCompleteRemoval ? 0 : Math.max(0, brand.quantity - quantity);
    await db.patch(brandId, {
      quantity: newQuantity,
      updatedAt: Date.now(),
    });

    const actualRemoved = brand.quantity - newQuantity;
    const message = isCompleteRemoval 
      ? `Completely removed ${brand.name} ${brand.type} from inventory (removed ${actualRemoved} bottles)`
      : `Removed ${actualRemoved} bottles of ${brand.name} ${brand.type}. Remaining: ${newQuantity}`;
      
    return {
      success: true,
      message,
    };
  },
});
