const express = require('express');
const router = express.Router();
const { getPool } = require('../db/database');

// GET all items
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET a single item by ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM items WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// CREATE a new item
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO items (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    
    const [newItem] = await pool.query('SELECT * FROM items WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newItem[0]);
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// UPDATE an existing item
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const itemId = req.params.id;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const pool = getPool();
    // Check if item exists
    const [existing] = await pool.query('SELECT * FROM items WHERE id = ?', [itemId]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    await pool.query(
      'UPDATE items SET name = ?, description = ? WHERE id = ?',
      [name, description || '', itemId]
    );
    
    const [updatedItem] = await pool.query('SELECT * FROM items WHERE id = ?', [itemId]);
    
    res.json(updatedItem[0]);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE an item
router.delete('/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    
    const pool = getPool();
    // Check if item exists
    const [existing] = await pool.query('SELECT * FROM items WHERE id = ?', [itemId]);
    
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    await pool.query('DELETE FROM items WHERE id = ?', [itemId]);
    
    res.json({ message: 'Item deleted successfully', id: itemId });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;