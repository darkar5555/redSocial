'use strict'

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PublicaitonSchema = Schema({
    text : String,
    file : String,
    created_at : String,
    user : { type: Schema.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Publication', PublicaitonSchema);