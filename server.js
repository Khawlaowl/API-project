const express = require('express');
const app = express();
const PORT = 1337;

//middleware
app.use(express.static('public'));

//routes

app.listen(PORT, () => {
    console.log(`Server has started on port: ${PORT}`);
});

