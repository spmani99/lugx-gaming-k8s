const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = require('./db');
const { Order, OrderItem } = require('./models/Order');
const { authenticateAPIKey } = require('./middleware/apiAuth');

const app = express();
const port = process.env.PORT || 3002;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'],
  credentials: true
}));

app.use(express.json());

// Sync DB
sequelize.sync().then(() => {
  console.log('🛒 Order Service Database Synced');
}).catch(console.error);

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LUGX Gaming API - Order Service',
    authentication: 'API Key required',
    version: '1.0.0'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Create a new order (Frontend access)
app.post('/orders', authenticateAPIKey, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { 
      customerName, 
      customerEmail, 
      billingAddress, 
      items 
    } = req.body;

    console.log('Received order data:', req.body);

    // Validate required fields
    if (!customerName || !customerEmail) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'Customer name and email are required' 
      });
    }

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        error: 'Items array is required and must not be empty' 
      });
    }

    // Calculate total amount
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const { gameId, gameName, price, quantity } = item;
      
      if (!gameId || !gameName || !price || !quantity) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Each item must have gameId, gameName, price, and quantity' 
        });
      }

      if (quantity <= 0 || price <= 0) {
        await transaction.rollback();
        return res.status(400).json({ 
          success: false,
          error: 'Quantity and price must be positive numbers' 
        });
      }

      const itemTotal = parseFloat(price) * parseInt(quantity);
      totalAmount += itemTotal;
      
      validatedItems.push({
        gameId: parseInt(gameId),
        gameName: gameName.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity)
      });
    }

    // Create order
    const order = await Order.create({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      billingAddress,
      totalAmount: totalAmount.toFixed(2),
      paymentStatus: 'pending'
    }, { transaction });

    console.log('Order created:', order.id);

    // Create order items
    const orderItems = validatedItems.map(item => ({
      gameId: item.gameId,
      gameName: item.gameName,
      gamePrice: item.price,  // Map 'price' to 'gamePrice'
      quantity: item.quantity,
      subtotal: (item.price * item.quantity).toFixed(2),  // Calculate subtotal
      orderId: order.id
    }));

    await OrderItem.bulkCreate(orderItems, { transaction });
    console.log('Order items created for order:', order.id);

    // Commit transaction
    await transaction.commit();

    // Fetch complete order with items
    const completeOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        order: completeOrder
      },
      apiKeyInfo: {
        name: req.apiKeyInfo.name,
        type: req.apiKeyInfo.type
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error creating order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get all orders
app.get('/orders', authenticateAPIKey, async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      status,
      customerEmail,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    let whereClause = {};
    
    if (status) {
      whereClause.paymentStatus = status;
    }
    
    if (customerEmail) {
      whereClause.customerEmail = {
        [sequelize.Sequelize.Op.like]: `%${customerEmail}%`
      };
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [{
        model: OrderItem,
        as: 'items'
      }],
      limit: Math.min(parseInt(limit), 100),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    res.json({
      success: true,
      data: {
        orders: orders.rows,
        pagination: {
          total: orders.count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(orders.count / parseInt(limit))
        }
      },
      apiKeyInfo: {
        name: req.apiKeyInfo.name,
        type: req.apiKeyInfo.type
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get single order by ID
app.get('/orders/:id', authenticateAPIKey, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Update order status
app.put('/orders/:id', authenticateAPIKey, async (req, res) => {
  try {
    const { paymentStatus, billingAddress } = req.body;
    
    const order = await Order.findByPk(req.params.id);
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    const updateData = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (billingAddress) updateData.billingAddress = billingAddress;

    await order.update(updateData);

    const updatedOrder = await Order.findByPk(order.id, {
      include: [{
        model: OrderItem,
        as: 'items'
      }]
    });

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: { order: updatedOrder },
      updatedBy: {
        apiKey: req.apiKeyInfo.name,
        type: req.apiKeyInfo.type
      }
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Delete order
app.delete('/orders/:id', authenticateAPIKey, async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }

    // Delete order items first
    await OrderItem.destroy({
      where: { orderId: req.params.id },
      transaction
    });

    // Delete order
    await order.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Order deleted successfully',
      deletedBy: {
        apiKey: req.apiKeyInfo.name,
        type: req.apiKeyInfo.type
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Get order statistics
app.get('/stats/orders', authenticateAPIKey, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalOrders, totalRevenue, pendingOrders, completedOrders] = await Promise.all([
      Order.count({ where: { createdAt: { [sequelize.Sequelize.Op.gte]: since } } }),
      Order.sum('totalAmount', { where: { createdAt: { [sequelize.Sequelize.Op.gte]: since } } }),
      Order.count({ where: { paymentStatus: 'pending', createdAt: { [sequelize.Sequelize.Op.gte]: since } } }),
      Order.count({ where: { paymentStatus: 'completed', createdAt: { [sequelize.Sequelize.Op.gte]: since } } })
    ]);

    res.json({
      success: true,
      data: {
        period: `Last ${days} days`,
        statistics: {
          totalOrders: totalOrders || 0,
          totalRevenue: parseFloat(totalRevenue || 0).toFixed(2),
          pendingOrders: pendingOrders || 0,
          completedOrders: completedOrders || 0,
          conversionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) + '%' : '0%'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// 404 handler - Use without path parameter
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`🚀 Order Service with API Key Auth listening on port ${port}`);
});
