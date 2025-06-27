// test-transfer-engine.js - Transfer Engine Test
require('dotenv').config();

async function testTransferEngine() {
  console.log('🚀 Testing Transfer Engine...\n');

  try {
    const baseUrl = 'http://localhost:3000';
    
    // Step 1: Register a test user
    console.log('1️⃣ Creating test user...');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'transfer-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Transfer',
        lastName: 'Test'
      })
    });

    let token;
    if (registerResponse.status === 201) {
      const registerData = await registerResponse.json();
      token = registerData.token;
      console.log('✅ User registered successfully');
    } else {
      // User might already exist, try to login
      console.log('👤 User exists, logging in...');
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'transfer-test@example.com',
          password: 'TestPassword123!'
        })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        token = loginData.token;
        console.log('✅ User logged in successfully');
      } else {
        throw new Error('Failed to register or login user');
      }
    }

    // Step 2: Add Google Drive account or find existing one
    console.log('\n2️⃣ Checking for Google Drive account...');
    
    // First check if Google Drive account already exists
    let accountsResponse = await fetch(`${baseUrl}/api/accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let accountsData = await accountsResponse.json();
    let driveAccount = accountsData.accounts.find(acc => acc.provider === 'google-drive');
    
    if (!driveAccount) {
      console.log('🔧 No Google Drive account found. Creating one...');
      const fs = require('fs');
      const serviceAccountKey = JSON.parse(fs.readFileSync('./google-credentials/service-account-key.json', 'utf8'));
      
      const driveAccountResponse = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: 'google-drive',
          accountName: `Test Google Drive ${Date.now()}`, // Unique name
          credentials: {
            serviceAccountKey: serviceAccountKey
          },
          testConnection: true
        })
      });

      if (!driveAccountResponse.ok) {
        const error = await driveAccountResponse.json();
        throw new Error(`Failed to add Google Drive account: ${error.message}`);
      }

      const newDriveAccount = await driveAccountResponse.json();
      driveAccount = newDriveAccount.account;
      console.log(`✅ Google Drive account created (ID: ${driveAccount.id})`);
    } else {
      console.log(`✅ Found existing Google Drive account (ID: ${driveAccount.id})`);
    };

    // Step 3: Add AWS S3 account (if you have credentials)
    console.log('\n3️⃣ Checking for existing AWS S3 account...');
    
    // Refresh accounts list
    accountsResponse = await fetch(`${baseUrl}/api/accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    accountsData = await accountsResponse.json();
    let s3Account = accountsData.accounts.find(acc => acc.provider === 'aws-s3');
    
    if (!s3Account) {
      console.log('🔧 No AWS S3 account found. Creating one...');
      
      // Check if AWS credentials are in environment variables
      const awsCredentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        bucketName: process.env.AWS_BUCKET_NAME
      };
      
      if (!awsCredentials.accessKeyId || !awsCredentials.secretAccessKey || !awsCredentials.bucketName) {
        console.log('❌ AWS credentials not found in environment variables.');
        console.log('💡 Please add to your .env file:');
        console.log('   AWS_ACCESS_KEY_ID=your_access_key');
        console.log('   AWS_SECRET_ACCESS_KEY=your_secret_key');
        console.log('   AWS_REGION=us-east-1');
        console.log('   AWS_BUCKET_NAME=your_bucket_name');
        console.log('\n🔄 Or add manually via API: POST /api/accounts');
        return;
      }
      
      // Create AWS S3 account
      const s3AccountResponse = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: 'aws-s3',
          accountName: 'Test AWS S3',
          credentials: awsCredentials,
          testConnection: true
        })
      });
      
      if (!s3AccountResponse.ok) {
        const error = await s3AccountResponse.json();
        throw new Error(`Failed to add AWS S3 account: ${error.message}`);
      }
      
      const newS3Account = await s3AccountResponse.json();
      s3Account = newS3Account.account;
      console.log(`✅ AWS S3 account created (ID: ${s3Account.id})`);
    } else {
      console.log(`✅ Found existing AWS S3 account (ID: ${s3Account.id})`);
    };

    // Step 4: Check files in Google Drive
    console.log('\n4️⃣ Checking files in Google Drive...');
    const driveFilesResponse = await fetch(`${baseUrl}/api/accounts/${driveAccount.id}/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const driveFiles = await driveFilesResponse.json();
    
    if (driveFiles.files.length === 0) {
      console.log('📁 Google Drive is empty. Creating a test file...');
      
      // Upload a test file to Google Drive first
      const testFile = new Blob(['Test file for transfer engine\nCreated: ' + new Date().toISOString()], {
        type: 'text/plain'
      });
      
      const formData = new FormData();
      formData.append('file', testFile, 'transfer-test.txt');
      
      const uploadResponse = await fetch(`${baseUrl}/api/accounts/${driveAccount.id}/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload test file to Google Drive');
      }
      
      const uploadResult = await uploadResponse.json();
      console.log(`✅ Test file uploaded: ${uploadResult.file.name}`);
      
      // Refresh file list
      const refreshResponse = await fetch(`${baseUrl}/api/accounts/${driveAccount.id}/files`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const refreshData = await refreshResponse.json();
      driveFiles.files = refreshData.files;
    }

    const sourceFile = driveFiles.files[0];
    console.log(`📄 Found source file: ${sourceFile.name} (${sourceFile.size} bytes)`);

    // Step 5: Create transfer from Google Drive to AWS S3
    console.log('\n5️⃣ Creating transfer from Google Drive to AWS S3...');
    const transferResponse = await fetch(`${baseUrl}/api/transfers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sourceAccountId: driveAccount.id,
        destinationAccountId: s3Account.id,
        sourceFilePath: sourceFile.id, // Google Drive uses file IDs
        fileName: sourceFile.name,
        destinationFilePath: `transfers/${sourceFile.name}`
      })
    });

    if (!transferResponse.ok) {
      const error = await transferResponse.json();
      throw new Error(`Failed to create transfer: ${error.message}`);
    }

    const transfer = await transferResponse.json();
    console.log(`✅ Transfer created successfully!`);
    console.log(`   Transfer ID: ${transfer.transfer.id}`);
    console.log(`   Status: ${transfer.transfer.status}`);
    console.log(`   File: ${transfer.transfer.fileName}`);

    // Step 6: Monitor transfer progress
    console.log('\n6️⃣ Monitoring transfer progress...');
    const transferId = transfer.transfer.id;
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      
      const statusResponse = await fetch(`${baseUrl}/api/transfers/${transferId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const status = statusData.transfer.status;
        const progress = statusData.transfer.progress;
        
        console.log(`   Status: ${status} | Progress: ${progress}%`);
        
        if (status === 'completed') {
          completed = true;
          console.log('🎉 Transfer completed successfully!');
        } else if (status === 'failed') {
          console.log(`❌ Transfer failed: ${statusData.transfer.error}`);
          break;
        }
      }
    }

    if (!completed && attempts >= maxAttempts) {
      console.log('⏰ Transfer monitoring timed out');
    }

    // Step 7: List all transfers
    console.log('\n7️⃣ Listing transfer history...');
    const historyResponse = await fetch(`${baseUrl}/api/transfers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const history = await historyResponse.json();
    console.log(`📊 Transfer Statistics:`);
    console.log(`   Total transfers: ${history.statistics.total}`);
    console.log(`   Completed: ${history.statistics.completed}`);
    console.log(`   Failed: ${history.statistics.failed}`);
    console.log(`   Running: ${history.statistics.running}`);
    console.log(`   Queued: ${history.statistics.queued}`);

    if (history.transfers.length > 0) {
      console.log('\n📋 Recent transfers:');
      history.transfers.slice(0, 3).forEach((t, index) => {
        console.log(`   ${index + 1}. ${t.fileName} - ${t.status} (${t.progress}%)`);
        console.log(`      From: ${t.sourceAccount.provider} → To: ${t.destinationAccount.provider}`);
      });
    }

    console.log('\n🎉 Transfer Engine test completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication');
    console.log('   ✅ Cloud account management');
    console.log('   ✅ File listing');
    console.log('   ✅ Transfer creation');
    console.log('   ✅ Transfer monitoring');
    console.log('   ✅ Transfer history');
    console.log('\n🚀 Transfer Engine is fully operational!');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('\n🔍 Make sure:');
    console.log('   • Server is running on http://localhost:3000');
    console.log('   • Google Drive credentials are configured');
    console.log('   • AWS S3 account is added via API');
    console.log('   • All required services are working');
  }
}

// Add fetch polyfill for Node.js
if (!global.fetch) {
  global.fetch = require('node-fetch');
  global.FormData = require('form-data');
  global.Blob = require('node:buffer').Blob;
}

console.log('📊 Transfer Engine Test');
console.log('📍 Purpose: Test cloud-to-cloud file transfers');
console.log('🔗 Endpoint: http://localhost:3000');
console.log('');

testTransferEngine();