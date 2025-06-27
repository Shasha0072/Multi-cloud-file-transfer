// src/routes/transfers.js - Transfer Management Routes
const TransferEngine = require('../services/transfer-engine/transfer-engine');

async function transferRoutes(fastify, options) {
  // Initialize transfer engine with database
  const transferEngine = new TransferEngine(fastify.db);
  
  // Add transfer engine to fastify instance
  fastify.decorate('transferEngine', transferEngine);

  // Input validation schemas
  const createTransferSchema = {
    body: {
      type: 'object',
      required: ['sourceAccountId', 'destinationAccountId', 'sourceFilePath', 'fileName'],
      properties: {
        sourceAccountId: { 
          type: 'integer',
          minimum: 1 
        },
        destinationAccountId: { 
          type: 'integer',
          minimum: 1 
        },
        sourceFilePath: { 
          type: 'string',
          minLength: 1 
        },
        destinationFilePath: { 
          type: 'string' 
        },
        fileName: { 
          type: 'string',
          minLength: 1 
        }
      },
      additionalProperties: false
    }
  };

  // Create new transfer
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: createTransferSchema
  }, async (request, reply) => {
    try {
      const { 
        sourceAccountId, 
        destinationAccountId, 
        sourceFilePath, 
        destinationFilePath, 
        fileName 
      } = request.body;

      // Validate that source and destination are different
      if (sourceAccountId === destinationAccountId) {
        return reply.code(400).send({
          error: 'Invalid transfer',
          message: 'Source and destination accounts must be different'
        });
      }

      // Create transfer with auto-generated destination path if not provided
      const finalDestinationPath = destinationFilePath || fileName;

      const result = await transferEngine.createTransfer({
        userId: request.user.id,
        sourceAccountId,
        destinationAccountId,
        sourceFilePath,
        destinationFilePath: finalDestinationPath,
        fileName
      });

      reply.code(201).send({
        success: true,
        message: 'Transfer created successfully',
        transfer: {
          id: result.transferId,
          status: result.status,
          fileName,
          sourceAccountId,
          destinationAccountId,
          sourceFilePath,
          destinationFilePath: finalDestinationPath
        }
      });

    } catch (error) {
      fastify.log.error('Error creating transfer:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          error: 'Account not found',
          message: error.message
        });
      }
      
      reply.code(500).send({
        error: 'Failed to create transfer',
        message: error.message || 'Unable to create transfer. Please try again.'
      });
    }
  });

  // List user's transfers
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { 
            type: 'integer', 
            minimum: 1, 
            maximum: 100, 
            default: 20 
          },
          offset: { 
            type: 'integer', 
            minimum: 0, 
            default: 0 
          },
          status: {
            type: 'string',
            enum: ['queued', 'running', 'completed', 'failed', 'cancelled']
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { limit = 20, offset = 0, status } = request.query;

      // Get transfers from database
      let transfers = await fastify.db.getTransfersByUser(request.user.id, limit, offset);
      
      // Filter by status if specified
      if (status) {
        transfers = transfers.filter(t => t.status === status);
      }

      // Get transfer statistics
      const stats = await fastify.db.getTransferStats(request.user.id);

      // Get queue status
      const queueStatus = transferEngine.getQueueStatus();

      reply.send({
        success: true,
        transfers: transfers.map(transfer => ({
          id: transfer.id,
          fileName: transfer.file_name,
          status: transfer.status,
          progress: transfer.progress,
          fileSize: transfer.file_size,
          transferredBytes: transfer.transferred_bytes,
          transferSpeed: transfer.transfer_speed,
          error: transfer.error_message,
          sourceAccount: {
            id: transfer.source_account_id,
            name: transfer.source_account_name,
            provider: transfer.source_provider
          },
          destinationAccount: {
            id: transfer.destination_account_id,
            name: transfer.dest_account_name,
            provider: transfer.dest_provider
          },
          sourceFilePath: transfer.source_path,
          destinationFilePath: transfer.destination_path,
          createdAt: transfer.created_at,
          startedAt: transfer.started_at,
          completedAt: transfer.completed_at
        })),
        pagination: {
          limit,
          offset,
          hasMore: transfers.length === limit
        },
        statistics: {
          total: stats.total_transfers || 0,
          completed: stats.completed || 0,
          failed: stats.failed || 0,
          running: stats.running || 0,
          queued: stats.queued || 0,
          totalBytesTransferred: stats.total_bytes_transferred || 0
        },
        queue: queueStatus
      });

    } catch (error) {
      fastify.log.error('Error fetching transfers:', error);
      reply.code(500).send({
        error: 'Failed to fetch transfers',
        message: 'Unable to retrieve transfer history.'
      });
    }
  });

  // Get specific transfer details
  fastify.get('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const transferId = parseInt(request.params.id);
      
      // Get transfer status (checks both active transfers and database)
      const transfer = await transferEngine.getTransferStatus(transferId, request.user.id);
      
      if (!transfer) {
        return reply.code(404).send({
          error: 'Transfer not found',
          message: 'Transfer not found or you do not have permission to access it.'
        });
      }

      reply.send({
        success: true,
        transfer
      });

    } catch (error) {
      fastify.log.error('Error fetching transfer:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          error: 'Transfer not found',
          message: error.message
        });
      }
      
      reply.code(500).send({
        error: 'Failed to fetch transfer',
        message: 'Unable to retrieve transfer details.'
      });
    }
  });

  // Cancel transfer
  fastify.put('/:id/cancel', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const transferId = parseInt(request.params.id);
      
      const result = await transferEngine.cancelTransfer(transferId, request.user.id);
      
      reply.send({
        success: true,
        message: result.message,
        transferId
      });

    } catch (error) {
      fastify.log.error('Error cancelling transfer:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          error: 'Transfer not found',
          message: error.message
        });
      }
      
      reply.code(500).send({
        error: 'Failed to cancel transfer',
        message: 'Unable to cancel transfer.'
      });
    }
  });

  // Retry failed transfer
  fastify.put('/:id/retry', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^[0-9]+$' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const transferId = parseInt(request.params.id);
      
      // Get transfer details
      const transfer = await fastify.db.getTransferById(transferId, request.user.id);
      
      if (!transfer) {
        return reply.code(404).send({
          error: 'Transfer not found',
          message: 'Transfer not found or you do not have permission to access it.'
        });
      }

      if (transfer.status !== 'failed') {
        return reply.code(400).send({
          error: 'Cannot retry transfer',
          message: 'Only failed transfers can be retried.'
        });
      }

      // Reset transfer status and create new transfer job
      const result = await transferEngine.createTransfer({
        userId: request.user.id,
        sourceAccountId: transfer.source_account_id,
        destinationAccountId: transfer.destination_account_id,
        sourceFilePath: transfer.source_path,
        destinationFilePath: transfer.destination_path,
        fileName: transfer.file_name
      });

      reply.send({
        success: true,
        message: 'Transfer retry initiated',
        newTransferId: result.transferId,
        originalTransferId: transferId
      });

    } catch (error) {
      fastify.log.error('Error retrying transfer:', error);
      reply.code(500).send({
        error: 'Failed to retry transfer',
        message: 'Unable to retry transfer.'
      });
    }
  });

  // Get transfer queue status
  fastify.get('/queue/status', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const queueStatus = transferEngine.getQueueStatus();
      
      reply.send({
        success: true,
        queue: queueStatus
      });

    } catch (error) {
      fastify.log.error('Error getting queue status:', error);
      reply.code(500).send({
        error: 'Failed to get queue status',
        message: 'Unable to retrieve queue information.'
      });
    }
  });
}

module.exports = transferRoutes;