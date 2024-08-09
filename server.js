const express = require('express');
const app = express();
const PORT = 1337;
require('dotenv').config()

//Variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SK
const stripe = require('stripe')(STRIPE_SECRET_KEY)
const DOMAIN = 'http://localhost:1337'

//middleware
app.use(express.static('public'));

//routes
app.post('/create-checkout-session/:product', async (req, res) => {
    const { product } = req.params
    let mode, price_ID, line_items, quantity_type


    if (product === 'sub') {
        price_ID = 'price_1MfByvBFgNlxkXGn6Cgrn3iF'
        mode = 'subscription'
        line_items = [
            {
                price: price_ID,
            }
        ]
        quantity_type = 'subscription'
    } else if (product === 'pre') {
        price_ID = 'price_1MfBxpBFgNlxkXGnTdv95Yfd'
        mode = 'payment'
        line_items = [
            {
                price: price_ID,
                quantity: 1
            }
        ]
        quantity_type = 10
    } else {
        return res.sendStatus(403)
    }
app.listen(PORT, () => {
    console.log(`Server has started on port: ${PORT}`);
});

