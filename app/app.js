var express = require('express')
var app = express()

var router = require('./routes/todo')
// respond with "hello world" when a GET request is made to the homepage

app.use(express.static('public'))

app.use('/api/todo', router)

module.exports = app
