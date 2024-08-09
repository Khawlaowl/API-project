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

app.listen(PORT, () => {
    console.log(`Server has started on port: ${PORT}`);
});

