'use strict'

var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');
var Follow = require('../models/follow');
var Publication = require('../models/publication');
var jwt = require('../services/jwt');
var mongoosePaginate =  require('mongoose-pagination');
var fs = require('fs');
var path = require('path');


function home(req, res){
    res.status(200).json({
        message: "hola mundo"
    });
}

function pruebas(req, res){
    res.status(200).send({
        message: 'Accion de pruebas en el servidor de NodeJS'
    });
}

function saveUser(req, res){
    var params = req.body;
    var user = new User();

    if (params.name && params.surname && params.nick && params.email && params.password) {
        
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;
        bcrypt.hash(params.password, null, null, (err, hash)=>{
            user.password = hash;

            user.save((err, userStored)=>{
                if (err) {
                    return res.status(500).send({ message: 'Error al guardar el usuario', errors: err});
                }
                if (userStored) {
                    res.status(200).send({
                        user: userStored
                    });
                }
                else{
                    res.status(404).send({ message: 'No se ha registrado el usuario' });
                }
            });
        });
    }
    else{
        res.status(200).send({
            message: 'Envia todos los campos necesarios'
        });
    }
}

function loginUser(req, res){
    var params = req.body;
    var email = params.email;
    var password = params.password;

    User.findOne({email: email}, (err, user)=>{
        if (err) {
            return res.status(500).send({message: 'Error en la peticion'});
        }
        if (user) {
            bcrypt.compare(password, user.password, (err, check)=>{
                if (check) {
                    if (params.gettoken) {
                        console.log('entre aqui');
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });
                    }
                    else{
                        // Devolver datos del usuario
                        user.password = undefined;
                        return res.status(200).send({
                            user: user
                        });
                    }

                }
                else{
                   return res.status(404).send({message: 'El usuario no se ha podido identificar'}); 
                }
            });
        }
        else{
            return res.status(404).send({message: 'El usuario no se ha podido identificar!!'});
        }
    });

}

// Get datos de un usuario
function getUser(req, res){
    var userId = req.params.id;

    User.findById(userId, (err, user)=>{
        if (err) {
            return res.status(500).send({
                message: 'Error en la peticion'
            });
        }
        if (!user) {
            return res.status(404).send({
                message: 'El usuario no existe'
            });
        }
        followThisUser(req.user.sub, userId).then((value)=>{
            // console.log(value);
            return res.status(200).send({
                user: user,
                following: value.following,
                followed : value.followed
            });
        });

    

    });
}

async function followThisUser(identity_user_id, user_id){
    try {
        var following = await Follow.findOne({ user: identity_user_id, followed: user_id }).exec()
            .then((following) => {
                return following;
            })
            .catch((err) => {
                return handleError(err);
            });
        var followed = await Follow.findOne({ user: user_id, followed: identity_user_id }).exec()
            .then((followed) => {
                return followed;
            })
            .catch((err) => {
                return handleError(err);
            });
        return {
            following: following,
            followed: followed
        }
    } catch (e) {
        console.log(e);
    }
}

async function followUserIds(user_id){
    var following = await Follow.find({ "user": user_id }).select({ '_id': 0, '__uv': 0, 'user': 0 }).exec().then((follows) => {
        var follows_clean = [];
        follows.forEach((follow) => {
            follows_clean.push(follow.followed);
        });
        return follows_clean;
    }).catch((err) => {
        return handleerror(err);
    });
    var followed = await Follow.find({ "followed": user_id }).select({ '_id': 0, '__uv': 0, 'followed': 0 }).exec().then((follows) => {
        var follows_clean = [];
        follows.forEach((follow) => {
            follows_clean.push(follow.user);
        });
        return follows_clean;
    }).catch((err) => {
        return handleerror(err);
    });
    return {
        following: following,
        followed: followed
    }
}

// Devolver un listado de usuarios paginados
function getUsers(req, res){
    var identity_user_id = req.user.sub;
    var page = 1;
    if (req.params.page) {
        page = req.params.page;
    }
    var itemsPerPage = 5;
    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total)=>{
        if (err) {
            return res.status(500).send({
                message: 'Error en la peticion'
            });
        }
        if (!users) {
            return res.status(404).send({
                message: 'No hay usuarios disponibles'
            });
        }

        followUserIds(identity_user_id).then((value)=>{
            return res.status(200).send({
                users: users,
                users_following : value.following,
                users_followed : value.followed,
                total: total,
                pages: Math.ceil(total/itemsPerPage)
            });
        })

    });
}

function getCounters(req, res){
    var userId = req.user.sub;
    if (req.params.id) {
        userId = req.params.id;
    }
    getCountFollow(userId).then((value)=>{
        return res.status(200).send({
            following : value.following,
            followed : value.followed,
            publications : value.publications
        });
    });
}

async function getCountFollow(user_id) {
    var following = await Follow.countDocuments({ "user": user_id }).exec().then((count) => {
            // console.log(count);
            return count;
        }).catch((err) => { return handleError(err); });

    var followed = await Follow.countDocuments({ "followed": user_id }).exec().then((count) => {
            return count;
        })
        .catch((err) => { return handleError(err); });

    var publications = await Publication.countDocuments({'user': user_id}).exec().then((count)=>{
        // console.log(count);
            return count;}).catch((err)=>{
                return handleError(err);
            });
    
    return { 
        following: following, 
        followed: followed,
        publications: publications 
    }
}

// Editar un usuario
function updateUser(req, res){
    var userId = req.params.id;
    var update = req.body;

    // Borrar la propiedad password
    delete update.password;
    if (userId != req.user.sub) {
        return res.status(500).send({
            message: 'No tienes permiso de actualizar los datos de usuario'
        });
    }
    User.findByIdAndUpdate(userId, update, {new:true}, (err, userUpdated)=>{
        if (err) {
            return res.status(500).send({
                message: 'Error en la peticion'
            });
        }
        if (!userUpdated) {
            return res.status(404).send({
                message: 'No se ha podido actualizar el usuasrio'
            });
        }
        return res.status(200).send({
            message: 'Usuario actualizado',
            user: userUpdated
        });      
    });
}

// Function to upload an image
function uploadImage(req, res){
    var userId = req.params.id;

    if (req.files) {
        var file_path = req.files.image.path;
        var file_split = file_path.split('/');
        var file_name = file_split[2];
        var ext_split = file_name.split('\.');
        var file_ext = ext_split[1];

        if (userId != req.user.sub) {
            return removeFilesOfUploads(res, file_path, 'No tienes permiso para actualizar los datos de usuario');
        }

        if (file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif') {
            // Actualizar documento logueado
            User.findByIdAndUpdate(userId, {image:file_name}, {new:true}, (err, userUpdated)=>{
                if (err) {
                    return res.status(500).send({
                        message: 'Error en la peticion'
                    });
                }
                if (!userUpdated) {
                    return res.status(404).send({
                        message: 'No se ha podido actualizar el usuasrio'
                    });
                }
                return res.status(200).send({
                    message: 'Usuario actualizado',
                    user: userUpdated
                });                      
            });

        }
        else{
            return removeFilesOfUploads(res, file_path, 'Extension no valida');
        }
    }
    else{
        return res.status(200).send({
            message: 'No se han subido imagenes'
        });
    }
}

function removeFilesOfUploads(res, file_path, message){
    fs.unlink(file_path, (err)=>{
        return res.status(200).send({message: message})
    });
}

function getImageFile(req, res){
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exist)=>{
        if (exist) {
            res.sendFile(path.resolve(path_file));
        }else{
            res.status(200).send({message: 'No existe la imagen...'});
        }
    });
}


module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile,
    
}