const express = require('express')
const { generateApiKey } = require('generate-api-key')
const { db } = require('./firebase')
const app = express()
const PORT = 1337
require('dotenv').config()

//Variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SK
const stripe = require('stripe')(STRIPE_SECRET_KEY)
const DOMAIN = 'http://localhost:1337'

//middleware
app.use(express.static('public'))

//routes
app.get('/api', async (req, res) => {
    //receive API key
    const { api_key } = req.query
    if (!api_key) { return res.sendStatus(403) }
    let paid_status, type
    const doc = await db.collection('api_keys').doc(api_key).get()
    if (!doc.exists) {
        res.status(403).send({ 'status': "API Key is invalid" })
    } else {
        const { status, type, stripeCustomerId } = doc.data()
        if (status === 'subscription' ) {
            paid_status = true
            const customer = await stripe.customers.retrieve(
                stripeCustomerId,
                { expand: ['subscriptions'] }
            )
            console.log(customer)

            let subscriptionId = customer?.subscriptions?.data?.[0]?.id
            console.log(subscriptionId)
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const itemId = subscription?.items?.data[0].id

            const record = stripe.subscriptionItems.createUsageRecord(
                itemId, {
                
                timestamp: 'now',
                action: 'increment'
            }
            )
            console.log('record created')
        } else if (status > 0 ) {
            paid_status = true
            const data = {
                status: status - 1 
            }
            const dbRes = await db.collection('api_keys').doc(api_key).set(data, { merge: true })
        }

    }
    if (paid_status) {
        res.status(200).send({ "message": "You can do it I believe in you! Don't give up yet!" })
    } else {
        res.sendStatus(403)
    }
});
app.get('/check_status', async (req, res) => {
    const { api_key } = req.query
    const doc = await db.collection('api_keys').doc(api_key).get()
    if (!doc.exists) {
        res.status(400).send({ 'status': "API Key does not exist" })
    } else {
        const { status } = doc.data()
        res.status(200).send({ 'status': status })
    }
})
app.get('/delete', async (req, res) => {
    const { api_key } = req.query
    const doc = await db.collection('api_keys').doc(api_key).get()
    if (!doc.exists) {
        res.status(400).send({ 'status': "API Key does not exist" })
    } else {
        const { stripeCustomerId } = doc.data()
        
        try {
            const customer = await stripe.customers.retrieve(
                stripeCustomerId,
                { expand: ['subscriptions'] }
            )
            console.log(customer);
            let subscriptionId = customer?.subscriptions?.data?.[0]?.id;
            stripe.subscriptions.del(subscriptionId)

            const data = {
                status: null 
            }
            const dbRes = await db.collection('api_keys').doc(api_key).set(data, { merge: true })
        } catch (err) {
            console.log(err.msg)
            return res.sendStatus(500)
        }
        res.sendStatus(200)
    }
});

app.post('/create-checkout-session/:product', async (req, res) => {
    const { product } = req.params;
    let mode, price_ID, line_items, quantity_type;

    if (product === 'sub') {
        price_ID = 'price_1Po4slDGX23YpF2sdJJcwujE'
        mode = 'subscription'
        line_items = [
             {
                price: price_ID,
                quantity: 1,
            }
        ]
        quantity_type = 'subscription'
    } else if (product === 'pre') {
        price_ID = 'price_1Po4v3DGX23YpF2stcGqe2oP';
        mode = 'payment';
        line_items = [
            {
                price: price_ID,
                quantity: 1
            }
        ];
        quantity_type = 10;//paymment
    } else {
        return res.sendStatus(403);
    }

    const newAPIKey = generateApiKey({
        method: 'string',
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_~' // Exclude slashes
    });

    const customer = await stripe.customers.create({
        metadata: {
            APIkey: newAPIKey
        }
    });

    const stripeCustomerId = customer.id;
    const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        metadata: {
            APIkey: newAPIKey,
            payment_type: product
        },
        line_items: line_items,
        mode: mode,
        success_url: `${DOMAIN}/success.html?api_key=${newAPIKey}`,
        cancel_url: `${DOMAIN}/cancel.html`,
    });
    try {
        // Create Firebase record
        const data = {
            APIkey: newAPIKey,
            payment_type: product,
            stripeCustomerId,
            status: quantity_type // subscription or 8
        };
    
        console.log('Saving the following data to Firestore:', data);
    
        const dbRes = await db.collection('api_keys').doc(newAPIKey).set(data, { merge: true });
    
        console.log('Firestore response:', dbRes);
    
        // Redirect to session URL (e.g., Stripe checkout session)
        res.redirect(303, session.url);
    } catch (err) {
        console.error('Error saving data to Firestore:', err.message);
        res.status(500).send('Failed to create API key record');
    }
    
});

app.listen(PORT, () => console.log(`Server has started on port: ${PORT}`))
