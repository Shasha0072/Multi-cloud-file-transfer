// Google Drive Integration Test Script
// Place this file as: test-google-drive.js in your project root

require('dotenv').config();
const Database = require('./src/services/database');
const EncryptionService = require('./src/services/encryption');
const GoogleDriveProvider = require('./src/services/cloud-providers/google-drive-provider');

async function testGoogleDriveIntegration() {
  console.log('🔄 Testing Google Drive Integration...\n');

  try {
    // 1. Check if there are any Google Drive accounts in database
    console.log('1️⃣ Checking for Google Drive accounts in database...');
    
    // Note: You'll need to replace USER_ID with actual user ID from your database
    // You can find this by running: SELECT id FROM users LIMIT 1;
    const userId = 1; // Replace with actual user ID
    
    const accounts = await Database.getCloudAccountsByUser(userId);
    const googleDriveAccounts = accounts.filter(account => account.provider === 'google-drive');
    
    if (googleDriveAccounts.length === 0) {
      console.log('❌ No Google Drive accounts found in database');
      console.log('💡 You need to add a Google Drive account first via the API');
      console.log('\n📋 Example POST request to /api/accounts:');
      console.log(JSON.stringify({
        "provider": "google-drive",
        "accountName": "My Google Drive",
        "credentials": {
          "serviceAccountKey": "YOUR_SERVICE_ACCOUNT_JSON_AS_STRING_OR_OBJECT"
        }
      }, null, 2));
      return;
    }

    console.log(`✅ Found ${googleDriveAccounts.length} Google Drive account(s)`);
    
    // 2. Test each Google Drive account
    for (const account of googleDriveAccounts) {
      console.log(`\n2️⃣ Testing account: ${account.account_name}`);
      
      try {
        // Decrypt credentials
        const credentials = EncryptionService.decryptCredentials(account.encrypted_credentials);
        console.log('✅ Credentials decrypted successfully');
        
        // Create Google Drive provider
        const driveProvider = new GoogleDriveProvider(credentials);
        
        // Test authentication
        console.log('🔐 Testing authentication...');
        const authResult = await driveProvider.authenticate();
        console.log('✅ Authentication successful!');
        console.log(`   User: ${authResult.user}`);
        console.log(`   Storage used: ${authResult.storage?.usage || 'N/A'}`);
        console.log(`   Storage limit: ${authResult.storage?.limit || 'N/A'}`);
        
        // Test file listing
        console.log('\n📁 Testing file listing...');
        const filesResult = await driveProvider.listFiles('root', { limit: 5 });
        console.log(`✅ Found ${filesResult.files.length} files in root folder`);
        
        if (filesResult.files.length > 0) {
          console.log('\n📄 Sample files:');
          filesResult.files.slice(0, 3).forEach((file, index) => {
            console.log(`   ${index + 1}. ${file.name} (${file.type}) - ${file.size} bytes`);
          });
          
          // Test getting file info for first file
          const firstFile = filesResult.files[0];
          console.log(`\n🔍 Getting detailed info for: ${firstFile.name}`);
          const fileInfo = await driveProvider.getFileInfo(firstFile.id);
          console.log(`✅ File info retrieved successfully`);
          console.log(`   Created: ${fileInfo.file.createdTime}`);
          console.log(`   Modified: ${fileInfo.file.lastModified}`);
          console.log(`   MIME type: ${fileInfo.file.mimeType}`);
        }
        
        // Test creating a folder
        console.log('\n📂 Testing folder creation...');
        const testFolderName = `Test Folder ${Date.now()}`;
        const folderResult = await driveProvider.createFolder(testFolderName);
        console.log(`✅ Folder created successfully: ${folderResult.folder.name}`);
        console.log(`   Folder ID: ${folderResult.folder.id}`);
        
        // Test uploading a small file
        console.log('\n📤 Testing file upload...');
        const testContent = `Test file created at ${new Date().toISOString()}`;
        const testBuffer = Buffer.from(testContent, 'utf8');
        const uploadResult = await driveProvider.uploadFile(
          testBuffer, 
          `test-file-${Date.now()}.txt`,
          { 
            contentType: 'text/plain',
            parentId: folderResult.folder.id 
          }
        );
        console.log(`✅ File uploaded successfully: ${uploadResult.file.name}`);
        console.log(`   File ID: ${uploadResult.file.id}`);
        console.log(`   View link: ${uploadResult.file.webViewLink}`);
        
        // Test downloading the file
        console.log('\n📥 Testing file download...');
        const downloadResult = await driveProvider.downloadFile(uploadResult.file.id);
        console.log(`✅ File download successful`);
        console.log(`   File info: ${downloadResult.fileInfo.name}`);
        
        // Clean up - delete test file and folder
        console.log('\n🧹 Cleaning up test files...');
        await driveProvider.deleteFile(uploadResult.file.id);
        console.log(`✅ Test file deleted`);
        
        await driveProvider.deleteFile(folderResult.folder.id);
        console.log(`✅ Test folder deleted`);
        
        console.log(`\n🎉 Google Drive integration test PASSED for ${account.account_name}!`);
        
      } catch (error) {
        console.log(`❌ Test FAILED for ${account.account_name}:`);
        console.log(`   Error: ${error.message}`);
        
        // Try to identify the issue
        if (error.message.includes('authentication')) {
          console.log('💡 This looks like an authentication issue. Check:');
          console.log('   - Service account key is valid');
          console.log('   - Google Drive API is enabled');
          console.log('   - Service account has necessary permissions');
        } else if (error.message.includes('initialize')) {
          console.log('💡 This looks like a setup issue. Check:');
          console.log('   - Service account JSON format');
          console.log('   - Environment variables');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Database connection or general error:');
    console.log(`   Error: ${error.message}`);
  } finally {
    // Close database connection
    Database.close();
  }
}

// Helper function to show how to add Google Drive account via API
function showApiExample() {
  console.log('\n📚 How to add Google Drive account via API:');
  console.log('\n1. First, register and login to get JWT token');
  console.log('2. Then POST to /api/accounts with this structure:');
  
  const exampleRequest = {
    method: 'POST',
    url: 'http://localhost:3000/api/accounts',
    headers: {
      'Authorization': 'Bearer YOUR_JWT_TOKEN',
      'Content-Type': 'application/json'
    },
    body: {
      "provider": "google-drive",
      "accountName": "My Google Drive Account",
      "credentials": {
        "serviceAccountKey": {
          "type": "service_account",
          "project_id": "your-project-id",
          "private_key_id": "key-id",
          "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
          "client_email": "service-account@your-project.iam.gserviceaccount.com",
          "client_id": "client-id",
          "auth_uri": "https://accounts.google.com/o/oauth2/auth",
          "token_uri": "https://oauth2.googleapis.com/token",
          "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
          "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/service-account%40your-project.iam.gserviceaccount.com"
        }
      },
      "testConnection": true
    }
  };
  
  console.log(JSON.stringify(exampleRequest, null, 2));
}

// Run the test
if (require.main === module) {
  testGoogleDriveIntegration()
    .then(() => {
      console.log('\n✅ Test completed');
    })
    .catch((error) => {
      console.log('\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testGoogleDriveIntegration, showApiExample };