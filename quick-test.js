// Quick Google Drive Integration Test
// Save as: quick-test.js

require('dotenv').config();
const GoogleDriveProvider = require('./src/services/cloud-providers/google-drive-provider');
const fs = require('fs');

async function quickTest() {
  console.log('🚀 Quick Google Drive Test Starting...\n');

  try {
    // Load service account credentials from file
    const serviceAccountPath = './google-credentials/service-account-key.json';
    
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('Service account file not found at: ' + serviceAccountPath);
    }

    const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log('✅ Service account file loaded');
    console.log(`   Project: ${serviceAccountKey.project_id}`);
    console.log(`   Email: ${serviceAccountKey.client_email}\n`);

    // Create credentials object in the format expected by GoogleDriveProvider
    const credentials = {
      serviceAccountKey: serviceAccountKey
    };

    // Create Google Drive provider instance
    console.log('🔧 Creating Google Drive provider...');
    const driveProvider = new GoogleDriveProvider(credentials);

    // Test authentication
    console.log('🔐 Testing authentication...');
    const authResult = await driveProvider.authenticate();
    
    console.log('✅ Authentication successful!');
    console.log(`   User: ${authResult.user}`);
    if (authResult.storage) {
      console.log(`   Storage usage: ${authResult.storage.usage || 'N/A'}`);
      console.log(`   Storage limit: ${authResult.storage.limit || 'N/A'}`);
    }

    // Test basic file listing
    console.log('\n📁 Testing file listing...');
    const filesResult = await driveProvider.listFiles('root', { limit: 10 });
    
    console.log(`✅ File listing successful!`);
    console.log(`   Found ${filesResult.files.length} files in root`);
    console.log(`   Has more: ${filesResult.hasMore}`);
    
    if (filesResult.files.length > 0) {
      console.log('\n📄 First few files:');
      filesResult.files.slice(0, 5).forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name} (${file.type}) - ${file.size} bytes`);
        if (file.webViewLink) {
          console.log(`      Link: ${file.webViewLink}`);
        }
      });
    } else {
      console.log('   (Drive appears to be empty - this is normal for new service accounts)');
    }

    // Test creating a simple test file
    console.log('\n📤 Testing file upload...');
    const testContent = `Test file created by Cloud Transfer App\nTimestamp: ${new Date().toISOString()}\nThis file can be safely deleted.`;
    const testBuffer = Buffer.from(testContent, 'utf8');
    const fileName = `cloud-transfer-test-${Date.now()}.txt`;
    
    const uploadResult = await driveProvider.uploadFile(testBuffer, fileName, {
      contentType: 'text/plain'
    });
    
    console.log('✅ File upload successful!');
    console.log(`   File name: ${uploadResult.file.name}`);
    console.log(`   File ID: ${uploadResult.file.id}`);
    console.log(`   Size: ${uploadResult.file.size} bytes`);
    if (uploadResult.file.webViewLink) {
      console.log(`   View link: ${uploadResult.file.webViewLink}`);
    }

    // Test downloading the file back
    console.log('\n📥 Testing file download...');
    const downloadResult = await driveProvider.downloadFile(uploadResult.file.id);
    console.log('✅ File download successful!');
    console.log(`   Downloaded file: ${downloadResult.fileInfo.name}`);

    // Clean up - delete the test file
    console.log('\n🧹 Cleaning up test file...');
    await driveProvider.deleteFile(uploadResult.file.id);
    console.log('✅ Test file deleted successfully');

    console.log('\n🎉 ALL TESTS PASSED! Google Drive integration is working perfectly!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Service account authentication');
    console.log('   ✅ File listing');
    console.log('   ✅ File upload');
    console.log('   ✅ File download');
    console.log('   ✅ File deletion');
    console.log('\n🚀 Ready to proceed with Transfer Engine (CLO-16)!');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('\n🔍 Troubleshooting tips:');
    
    if (error.message.includes('authentication')) {
      console.log('   • Check if Google Drive API is enabled in Google Cloud Console');
      console.log('   • Verify service account has proper permissions');
      console.log('   • Ensure service account key is valid and not expired');
    } else if (error.message.includes('private_key')) {
      console.log('   • Check if private key format is correct in service account JSON');
      console.log('   • Ensure no extra characters or formatting issues');
    } else if (error.message.includes('ENOENT')) {
      console.log('   • Check if service account file exists at the specified path');
      console.log('   • Verify file permissions');
    } else {
      console.log('   • Check network connectivity');
      console.log('   • Verify Google Drive API quotas');
      console.log('   • Check service account permissions');
    }
    
    console.log('\n💡 If issues persist, check the Google Cloud Console:');
    console.log('   1. Go to https://console.cloud.google.com/');
    console.log('   2. Select your project: cloud-transfer-app-464111');
    console.log('   3. Check APIs & Services > Enabled APIs');
    console.log('   4. Ensure Google Drive API is enabled');
    console.log('   5. Check IAM & Admin > Service Accounts');
    
    process.exit(1);
  }
}

// Show project info
console.log('📊 Project Information:');
console.log('   Name: Cloud Transfer App');
console.log('   Location: C:\\Users\\ShashwatAdhau\\Documents\\cloud-transfer-app');
console.log('   Testing: Google Drive Integration');
console.log('   Purpose: Verify CLO-15 status\n');

quickTest();