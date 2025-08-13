import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    items: v.array(v.object({
      brandId: v.id("brands"),
      quantity: v.number(),
    })),
    paymentMethod: v.string(),
    customerName: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
  },
  handler: async ({ db }, { items, paymentMethod, customerName, customerPhone }) => {
    if (items.length === 0) {
      throw new Error("Cart cannot be empty");
    }

    const now = Date.now();
    let totalAmount = 0;
    const processedItems = [];
    const stockUpdates = [];

    // Validate all items first and calculate totals
    for (const item of items) {
      const brand = await db.get(item.brandId);
      if (!brand) {
        throw new Error(`Brand not found for item`);
      }

      if (brand.quantity < item.quantity) {
        throw new Error(`Not enough stock for ${brand.name} ${brand.type}. Available: ${brand.quantity}, Requested: ${item.quantity}`);
      }

      const itemTotal = item.quantity * brand.price;
      totalAmount += itemTotal;

      processedItems.push({
        brandId: item.brandId,
        brandName: brand.name,
        brandType: brand.type,
        quantity: item.quantity,
        pricePerBottle: brand.price,
        itemTotal: itemTotal,
      });

      stockUpdates.push({
        brandId: item.brandId,
        newQuantity: brand.quantity - item.quantity,
      });
    }

    // Create the multi-item transaction
    const transactionId = await db.insert("transactions", {
      items: processedItems,
      totalAmount,
      paymentMethod,
      customerName,
      customerPhone,
      createdAt: now,
      transactionType: "multi",
    });

    // Update all brand stocks
    for (const update of stockUpdates) {
      await db.patch(update.brandId, {
        quantity: update.newQuantity,
        updatedAt: now,
      });
    }

    // Create summary message
    const itemsSummary = processedItems.map(item => 
      `${item.quantity} x ${item.brandName} ${item.brandType} = ₹${item.itemTotal}`
    ).join(", ");

    return {
      success: true,
      transactionId,
      totalAmount,
      itemCount: processedItems.length,
      message: `Multi-item sale recorded: ${itemsSummary}. Total: ₹${totalAmount}`,
      items: processedItems,
    };
  },
});
