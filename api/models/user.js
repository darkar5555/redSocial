'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var uniqueValidator = require('mongoose-unique-validator');

var UserSchema = Schema({
    name: String,
    surname: String,
    nick: {type:String, unique: true, required: [true, 'El nick debe ser unico y necesario']},
    email: {type:String, unique: true, required: [true, 'El email debe ser unico y necesario']},
    password: String,
    role: String,
    image: String

});

UserSchema.plugin(uniqueValidator, {message: '{PATH} debe ser unico'});

module.exports = mongoose.model('User', UserSchema);