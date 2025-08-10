import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation({
  args: {
    transactionId: v.id("transactions"),
    ownerPassword: v.string(),
  },
  handler: async ({ db }, { transactionId, ownerPassword }) => {
    // Check owner password for sensitive operations
    if (ownerPassword !== process.env.CONVEX_OWNER_PASSWORD) {
      throw new Error("Unauthorized: Invalid owner password");
    }

    const transaction = await db.get(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Restore stock when deleting transaction
    const brand = await db.get(transaction.brandId);
    if (brand) {
      await db.patch(transaction.brandId, {
        quantity: brand.quantity + transaction.quantity,
        updatedAt: Date.now(),
      });
    }

    // Delete the transaction
    await db.delete(transactionId);

    return {
      success: true,
      message: `Transaction deleted and ${transaction.quantity} bottles of ${transaction.brandName} ${transaction.brandType} restored to stock`,
    };
  },
});
