'use strict'

var moment = require('moment');
var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user');
var Follow = require('../models/follow');
var Message = require('../models/message');

function probando(req, res){
    res.status(200).send({
        message: "hola que tal",
    });
}

module.exports = {
    probando,
}