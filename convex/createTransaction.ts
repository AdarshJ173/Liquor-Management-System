import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    brandId: v.id("brands"),
    quantity: v.number(),
    paymentMethod: v.string(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  },
  handler: async ({ db }, { brandId, quantity, paymentMethod, customerName, customerPhone }) => {
    const brand = await db.get(brandId);
    if (!brand) {
      throw new Error("Brand not found");
    }

    if (brand.quantity < quantity) {
      throw new Error(`Not enough stock. Available: ${brand.quantity}, Requested: ${quantity}`);
    }

    const totalAmount = quantity * brand.price;
    const now = Date.now();

    // Create transaction record
    const transactionId = await db.insert("transactions", {
      brandId,
      brandName: brand.name,
      brandType: brand.type,
      quantity,
      pricePerBottle: brand.price,
      totalAmount,
      paymentMethod,
      customerName,
      customerPhone,
      createdAt: now,
    });

    // Update brand stock
    await db.patch(brandId, {
      quantity: brand.quantity - quantity,
      updatedAt: now,
    });

    return {
      success: true,
      transactionId,
      totalAmount,
      message: `Sale recorded: ${quantity} x ${brand.name} ${brand.type} = ₹${totalAmount}`,
      remainingStock: brand.quantity - quantity,
    };
  },
});
