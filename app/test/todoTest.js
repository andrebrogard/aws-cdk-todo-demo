var AWS = require('aws-sdk-mock');
var fs = require('fs')
var app = require('../app')
const chaiHttp = require('chai-http')
const chai = require('chai')
const sinon = require('sinon')
var assert = require('chai').assert;
var expect = require('chai').expect;

const todoPath = '/api/todo'

require('mocha')

chai.should()
chai.use(chaiHttp)

// Completely mocks the aws-sdk to perform true unit tests.
// Restores AWS SDK after every test

afterEach(() => {
    AWS.restore()
})

// Simple tests to highlight this functionality
// Does this application pass the unit tests because of lack of tests? Yes.

describe('GET todos', () => {
    const sampleData = JSON.parse(fs.readFileSync('./test/data/scanSuccessful.txt').toString())

    it('should return status 200 when a correct reponse is recieved from db', () => {
        AWS.mock('DynamoDB', 'scan', sampleData)
        return chai.request(app)
        .get(todoPath)
        .then(res => {
           res.should.have.status(200)
        })
        .catch((err) => {
            throw err
        })
    })
    it('Should return the dynamodb response', () => {
        AWS.mock('DynamoDB', 'scan', sampleData)
        return chai.request(app)
        .get(todoPath)
        .then(res => {
            expect(res.body).to.be.deep.equal(sampleData)
        })
        .catch((err) => {
            throw err
        })
    })
    it('returns status code 400+ when dynamodb get fails', () => {
        AWS.mock('DynamoDB', 'scan', function(params, callback) {
            callback(new Error('Simulated error'), null);
        })
        return chai.request(app)
        .get(todoPath)
        .then(res => {
            expect(res.status >= 400).to.be.true
        })
        .catch((err) => {
            throw err
        })
    })
    
})
describe('POST todos', () => {
    const exampleRequestBody = {text: "This is a standard todo"}
    it('should return status code 200', () => {
        AWS.mock('DynamoDB', 'putItem', function (params, callback){
            callback(null, "successfully put item in database");
        })
        return chai.request(app)
        .post(todoPath)
        .send(exampleRequestBody)
        .then(res => {
           res.should.have.status(200)
        })
        .catch((err) => {
            throw err
        })
    })
    it('Should return the content of the created todo', () => {
        AWS.mock('DynamoDB', 'putItem', function (params, callback){
            callback(null, "successfully put item in database");
        })
        return chai.request(app)
        .post(todoPath)
        .send(exampleRequestBody)
        .then(res => {
            expect(res.body.text).to.be.equal(exampleRequestBody.text, 'no text member in text')
            expect(res.body.id).to.not.be.undefined
            expect(res.body.id).to.not.be.null
        })
        .catch((err) => {
            throw err
        })
    })
    it('needs to have a text field in request body', () => {
        AWS.mock('DynamoDB', 'putItem', function (params, callback){
            callback(null, "successfully put item in database");
        })
        return chai.request(app)
        .post(todoPath)
        .then(res => {
            expect(res.status >= 400).to.be.true
        })
        .catch((err) => {
            throw err
        })
    })
    it('should call putItem only once', () => {
        var putItemSpy = sinon.spy();
        AWS.mock('DynamoDB', 'putItem', function(params, callback){
            putItemSpy(params, callback)
            callback(null, 'success')
        })
        return chai.request(app)
        .post(todoPath)
        .send(exampleRequestBody)
        .then(res => {
            expect(putItemSpy.calledOnce).to.be.true
        })
        .catch((err) => {
            throw err
        })
    })
    it('should call putItem with id and text members of correct shape', () => {
        var putItemSpy = sinon.spy();
        AWS.mock('DynamoDB', 'putItem', function(params, callback){
            putItemSpy(params, callback)
            callback(null, 'success')
        })
        return chai.request(app)
        .post(todoPath)
        .send(exampleRequestBody)
        .then(res => {
            if(putItemSpy.notCalled){
                assert(false, 'not called')
            }
            const firstArgs = putItemSpy.args[0][0]
            const Item = firstArgs.Item
            if(!Item){
                assert(false, 'no Item argument')
            }
            Item.text.should.include.keys('S')
            Item.id.should.include.keys('S')
        })
        .catch((err) => {
            throw err
        })
    })

    it('returns status code 400+ when dynamodb putItems fails', () => {
        AWS.mock('DynamoDB', 'scan', function(params, callback) {
            callback(new Error('Simulated error'), null);
        })
        return chai.request(app)
        .post(todoPath)
        .then(res => {
            expect(res.status >= 400).to.be.true
        })
        .catch((err) => {
            throw err
        })
    })
})
describe('DELETE todos', () => {
    const exampleRequestBody = {id: "long-uuid-xyz"}
    it('should return status code 204', () => {
        AWS.mock('DynamoDB', 'deleteItem', function (params, callback){
            callback(null, "successfully deleted item in database");
        })
        return chai.request(app)
        .delete(todoPath)
        .send(exampleRequestBody)
        .then(res => {
           res.should.have.status(204)
        })
        .catch((err) => {
            throw err
        })
    })
    it('Should not return any content', () => {
        AWS.mock('DynamoDB', 'deleteItem', function (params, callback){
            callback(null, "successfully deleted item in database");
        })
        return chai.request(app)
        .delete(todoPath)
        .send(exampleRequestBody)
        .then(res => {
            expect(res.body).to.be.empty
        })
        .catch((err) => {
            throw err
        })
    })
    it('Should return a status code 400+ when deleteItem fails', () => {
        AWS.mock('DynamoDB', 'deleteItem', function (params, callback){
            callback(new Error("Simualted error"), null);
        })
        return chai.request(app)
        .delete(todoPath)
        .send(exampleRequestBody)
        .then(res => {
            expect(res.status >= 400).to.be.true
        })
        .catch((err) => {
            throw err
        })
    })
})

