var express = require('express')
const AWS = require('aws-sdk')
AWS.config.update({region: process.env.REGION || 'us-east-1'});
const { v4: uuidv4 } = require('uuid');
const fallbackTable = "MVPCDKStack-TodoF45EDE0F-BB0AIXQJVB9T"
var router = express.Router()

router.use(express.json())

// Get all todos
function getHandler(req, res) {
    const dynamoDB = new AWS.DynamoDB()
    dynamoDB.scan({TableName: process.env.TABLE_NAME || fallbackTable}, function(err, data){
        if(err) {
            //console.log(err)
            res.status(400).end()
            return
        }
        //console.log(data)
        res.json(data)
    })
}

// Post a todo, generate id
function postHandler(req, res) {
    const dynamoDB = new AWS.DynamoDB()
    const uid = uuidv4()
    const {text} = req.body
    if(!text){
        res.status(400).end()
        return 
    }
    dynamoDB.putItem({Item: {"id": {S: uid}, "text": {S: text}}, TableName: process.env.TABLE_NAME || fallbackTable}, function(err, data){
        if(err) {
            //console.log(err)
            res.status(500).end()
            return
        }
        //console.log("data", data)
        res.json({id: uid, text})
    })
}
// Delete a todo, by id
function deleteHandler(req, res){
    const dynamoDB = new AWS.DynamoDB()
    const {id} = req.body
    dynamoDB.deleteItem({Key: {"id": {S: id}}, TableName: process.env.TABLE_NAME || fallbackTable}, function(err, data) {
        if(err) {
            //console.log(err)
            res.status(400).end(JSON.stringify(err))
            return
        }
        //console.log("data", data)
        res.status(204).end()
    })
}

router.get('/', getHandler)

router.post('/', postHandler)

router.delete('/', deleteHandler)

module.exports = router