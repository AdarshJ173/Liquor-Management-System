// Test script for the new custom dialog and stock management functions
// Run this in the browser console to test the new functionality

console.log('=== Testing Custom Dialog and Stock Management Functions ===');

// Test Custom Dialog (Simple confirmation)
async function testSimpleDialog() {
    console.log('Testing simple confirmation dialog...');
    const result = await showCustomDialog(
        '🗑️ Delete Stock Item',
        'Are you sure you want to completely delete "Test Brand - Test Type" from your inventory?\n\nThis action cannot be undone.',
        false
    );
    console.log('Simple dialog result:', result);
}

// Test Custom Dialog (With input)
async function testInputDialog() {
    console.log('Testing input dialog...');
    const result = await showCustomDialog(
        '📉 Remove Some Stock',
        'How many bottles of "Test Brand - Test Type" would you like to remove?',
        true,
        {
            label: 'Quantity to Remove:',
            value: 1,
            min: 1,
            max: 10,
            help: 'Available: 10 bottles'
        }
    );
    console.log('Input dialog result:', result);
}

// Test Restock Modal
async function testRestockModal() {
    console.log('Testing restock modal...');
    const result = await showRestockModal('test-id', 'Test Brand', 'Test Type', 250);
    console.log('Restock modal result:', result);
}

// Export test functions to global scope
window.testSimpleDialog = testSimpleDialog;
window.testInputDialog = testInputDialog;
window.testRestockModal = testRestockModal;

console.log('Test functions loaded. You can now run:');
console.log('- testSimpleDialog()');
console.log('- testInputDialog()');
console.log('- testRestockModal()');

// Show instructions
console.log('\n=== Instructions ===');
console.log('1. Make sure your Convex backend is running: npx convex dev');
console.log('2. Load the application in your browser');
console.log('3. Go to the Stock page');
console.log('4. Try the new buttons:');
console.log('   - 🔄 Restock (for out-of-stock items)');
console.log('   - 📉 Remove Some (for items with stock)');
console.log('   - 🗑️ Delete All (for any items)');
console.log('5. Test owner password protection for removal operations');

console.log('\n=== Features Implemented ===');
console.log('✅ Custom dialog for partial stock removal with quantity input');
console.log('✅ Custom dialog for complete stock deletion with confirmation');
console.log('✅ Restock modal for out-of-stock items with quantity and price inputs');
console.log('✅ Proper validation for all inputs');
console.log('✅ Owner password protection for sensitive operations');
console.log('✅ Updated stock management buttons based on stock status');
console.log('✅ Integration with existing backend mutations');
console.log('✅ Automatic refresh of stock data after operations');
