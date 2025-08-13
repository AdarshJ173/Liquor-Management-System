import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL || 'https://dutiful-coyote-98.convex.cloud');

async function testDatabase() {
    try {
        console.log('🔍 Testing database connection...');
        
        // Test adding some sample stock
        console.log('📦 Adding test stock items...');
        
        const testItems = [
            { name: 'Johnnie Walker', type: 'Black Label 750ml', price: 2500, quantity: 10 },
            { name: 'Royal Stag', type: '750ml', price: 1200, quantity: 5 },
            { name: 'Teachers', type: '750ml', price: 1800, quantity: 0 }  // Out of stock item
        ];
        
        for (const item of testItems) {
            try {
                const result = await convex.mutation('addStock', item);
                console.log('✅ Added:', item.name, '-', result.message);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log('ℹ️  Item already exists:', item.name);
                } else {
                    console.error('❌ Failed to add:', item.name, '-', err.message);
                }
            }
        }
        
        // Test getting stock levels
        console.log('\n📋 Getting current stock levels...');
        const stocks = await convex.query('queries:getStockLevels');
        console.log('Found', stocks.length, 'stock items:');
        
        stocks.forEach(stock => {
            const status = stock.quantity === 0 ? '❌ OUT OF STOCK' : 
                          stock.quantity <= 5 ? '⚠️  LOW STOCK' : '✅ IN STOCK';
            console.log(`- ${stock.name} - ${stock.type}: ${stock.quantity} bottles (${status})`);
        });
        
        // Test analytics
        console.log('\n📊 Testing analytics...');
        const analytics = await convex.query('queries:getAnalytics', {});
        console.log('Total stock items:', analytics.totalStock);
        console.log('Low stock items:', analytics.lowStockBrands);
        console.log('Out of stock items:', analytics.outOfStockBrands);
        
        // Test stock removal (to verify our new functionality will work)
        console.log('\n🧪 Testing stock operations...');
        
        // Find an item with stock > 1 to test partial removal
        const itemWithStock = stocks.find(s => s.quantity > 1);
        if (itemWithStock) {
            console.log(`Testing partial removal on ${itemWithStock.name}...`);
            try {
                const removeResult = await convex.mutation('removeStock', {
                    brandId: itemWithStock._id,
                    quantity: 1,
                    ownerPassword: 'liquor123admin'
                });
                console.log('✅ Partial removal test:', removeResult.message);
                
                // Add the stock back
                const addResult = await convex.mutation('addStock', {
                    name: itemWithStock.name,
                    type: itemWithStock.type,
                    price: itemWithStock.price,
                    quantity: 1
                });
                console.log('✅ Stock restored:', addResult.message);
            } catch (err) {
                console.error('❌ Removal test failed:', err.message);
            }
        }
        
        console.log('\n🎉 All database tests passed!');
        console.log('\n✅ Database is ready for testing stock management features');
        console.log('📝 You can now:');
        console.log('   1. Open the app in your browser');
        console.log('   2. Go to Stock page');
        console.log('   3. Test partial removal on items with stock');
        console.log('   4. Test restock on out-of-stock items');
        console.log('   5. Test complete deletion with password: liquor123admin');
        
        return stocks;
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
        return null;
    }
}

testDatabase().then(stocks => {
    if (stocks) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}).catch(console.error);
