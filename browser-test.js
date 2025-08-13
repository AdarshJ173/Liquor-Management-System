// Browser Console Test Script for Stock Management Features
// Copy and paste this into your browser's developer console on the Stock Management page

console.log('🧪 Starting Stock Management UI Tests...');

// Test 1: Check if all required functions exist
function testFunctionExistence() {
    console.log('\n🔍 Test 1: Checking function availability...');
    
    const requiredFunctions = [
        'showCustomDialog',
        'showRestockModal', 
        'removeStockPartial',
        'removeStockCompletely',
        'restockItem',
        'executeProtectedAction'
    ];
    
    const missingFunctions = [];
    
    requiredFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} - Available`);
        } else {
            console.log(`❌ ${funcName} - Missing`);
            missingFunctions.push(funcName);
        }
    });
    
    if (missingFunctions.length === 0) {
        console.log('✅ All required functions are available!');
        return true;
    } else {
        console.log(`❌ Missing functions: ${missingFunctions.join(', ')}`);
        return false;
    }
}

// Test 2: Check if all required DOM elements exist
function testDOMElements() {
    console.log('\n🔍 Test 2: Checking DOM elements...');
    
    const requiredElements = [
        'customDialog',
        'restockModal', 
        'passwordModal',
        'stockGrid',
        'stockEntriesList',
        'totalStockValue'
    ];
    
    const missingElements = [];
    
    requiredElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`✅ #${elementId} - Found`);
        } else {
            console.log(`❌ #${elementId} - Missing`);
            missingElements.push(elementId);
        }
    });
    
    if (missingElements.length === 0) {
        console.log('✅ All required DOM elements exist!');
        return true;
    } else {
        console.log(`❌ Missing elements: ${missingElements.join(', ')}`);
        return false;
    }
}

// Test 3: Test Custom Dialog functionality
async function testCustomDialogs() {
    console.log('\n🔍 Test 3: Testing custom dialogs...');
    
    try {
        // Test simple confirmation dialog
        console.log('Testing confirmation dialog (will auto-resolve in 2 seconds)...');
        
        // Auto-close dialog after 2 seconds for testing
        setTimeout(() => {
            const confirmBtn = document.getElementById('dialogConfirm');
            if (confirmBtn) confirmBtn.click();
        }, 2000);
        
        const confirmResult = await showCustomDialog(
            '🧪 Test Confirmation',
            'This is a test confirmation dialog. It will close automatically.',
            false
        );
        
        console.log('✅ Confirmation dialog result:', confirmResult);
        
        // Test input dialog
        console.log('Testing input dialog (will auto-resolve in 2 seconds)...');
        
        // Auto-fill and close dialog
        setTimeout(() => {
            const inputField = document.getElementById('dialogInputField');
            const confirmBtn = document.getElementById('dialogConfirm');
            if (inputField && confirmBtn) {
                inputField.value = '5';
                confirmBtn.click();
            }
        }, 2000);
        
        const inputResult = await showCustomDialog(
            '🧪 Test Input',
            'Enter a test quantity:',
            true,
            {
                label: 'Test Quantity:',
                value: 1,
                min: 1,
                max: 10,
                help: 'This is a test input'
            }
        );
        
        console.log('✅ Input dialog result:', inputResult);
        
        return true;
    } catch (error) {
        console.log('❌ Dialog test failed:', error.message);
        return false;
    }
}

// Test 4: Test Restock Modal
async function testRestockModal() {
    console.log('\n🔍 Test 4: Testing restock modal...');
    
    try {
        console.log('Opening restock modal (will auto-resolve in 2 seconds)...');
        
        // Auto-fill and submit restock modal
        setTimeout(() => {
            const quantityInput = document.getElementById('restockQuantity');
            const priceInput = document.getElementById('restockPrice');
            const confirmBtn = document.getElementById('restockConfirm');
            
            if (quantityInput && priceInput && confirmBtn) {
                quantityInput.value = '10';
                priceInput.value = '2000';
                confirmBtn.click();
            }
        }, 2000);
        
        const restockResult = await showRestockModal(
            'test-brand-id',
            'Test Brand',
            'Test Type',
            1500
        );
        
        console.log('✅ Restock modal result:', restockResult);
        return true;
    } catch (error) {
        console.log('❌ Restock modal test failed:', error.message);
        return false;
    }
}

// Test 5: Check stock button functionality
function testStockButtons() {
    console.log('\n🔍 Test 5: Checking stock management buttons...');
    
    const stockItems = document.querySelectorAll('.stock-item');
    console.log(`Found ${stockItems.length} stock items on page`);
    
    let restockButtons = 0;
    let removePartialButtons = 0;
    let removeCompleteButtons = 0;
    
    stockItems.forEach((item, index) => {
        const buttons = item.querySelectorAll('button');
        buttons.forEach(button => {
            const text = button.textContent.trim();
            if (text.includes('Restock')) {
                restockButtons++;
                console.log(`✅ Item ${index + 1}: Found Restock button`);
            } else if (text.includes('Remove Some')) {
                removePartialButtons++;
                console.log(`✅ Item ${index + 1}: Found Remove Some button`);
            } else if (text.includes('Delete')) {
                removeCompleteButtons++;
                console.log(`✅ Item ${index + 1}: Found Delete button`);
            }
        });
    });
    
    console.log(`Summary: ${restockButtons} Restock, ${removePartialButtons} Remove Some, ${removeCompleteButtons} Delete buttons`);
    return true;
}

// Test 6: Test database connectivity
async function testDatabaseConnection() {
    console.log('\n🔍 Test 6: Testing database connectivity...');
    
    try {
        if (typeof convex !== 'undefined') {
            console.log('✅ Convex client is available');
            
            // Test a simple query
            const stocks = await convex.query('queries:getStockLevels');
            console.log(`✅ Database query successful: Found ${stocks.length} stock items`);
            
            return true;
        } else {
            console.log('❌ Convex client not available');
            return false;
        }
    } catch (error) {
        console.log('❌ Database connection test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Running comprehensive Stock Management UI tests...');
    console.log('============================================');
    
    const testResults = {
        functions: testFunctionExistence(),
        dom: testDOMElements(),
        buttons: testStockButtons(),
        database: await testDatabaseConnection(),
        dialogs: await testCustomDialogs(),
        restock: await testRestockModal()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    Object.entries(testResults).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${test.toUpperCase()}: ${status}`);
    });
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(Boolean).length;
    
    console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Stock management features are ready for use.');
        console.log('\n📝 Manual testing instructions:');
        console.log('1. Try clicking "📉 Remove Some" on items with stock');
        console.log('2. Try clicking "🔄 Restock" on out-of-stock items');
        console.log('3. Try clicking "🗑️ Delete" buttons (use password: liquor123admin)');
        console.log('4. Verify that stock updates reflect in the UI and sidebar');
    } else {
        console.log('⚠️  Some tests failed. Check the console output above for details.');
    }
    
    return testResults;
}

// Auto-run tests if this script is loaded
console.log('🎯 Test functions loaded. Run runAllTests() to start testing.');
console.log('📋 Available test functions:');
console.log('- runAllTests() - Run complete test suite');
console.log('- testFunctionExistence() - Check if functions exist');
console.log('- testDOMElements() - Check DOM elements');
console.log('- testCustomDialogs() - Test dialog functionality');
console.log('- testRestockModal() - Test restock modal');
console.log('- testStockButtons() - Check button availability');
console.log('- testDatabaseConnection() - Test database connectivity');

// Make functions available globally
window.runAllTests = runAllTests;
window.testFunctionExistence = testFunctionExistence;
window.testDOMElements = testDOMElements;
window.testCustomDialogs = testCustomDialogs;
window.testRestockModal = testRestockModal;
window.testStockButtons = testStockButtons;
window.testDatabaseConnection = testDatabaseConnection;
