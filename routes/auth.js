var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var {to} = require('await-to-js');
const path = require('path');
const fs = require('fs');
// const user_path = path.join(__dirname, '..', 'data/user.json');
const stu_path = path.join(__dirname, '..', 'data/STUDENTS.json');
const utils = require('../data/utils');
const uuid = require('uuid');
const db = require('../data/mysql/index');
const { token } = require('morgan');



router.post('/signup', async (req, res) => {

    let {name, email, password} = req.body;

    if(!name || !email || !password){
        res.status(400).json({ "err": 'Please enter all 3 details of the user'});
    }

    // Checking if user has already signed up   
    let query = `SELECT count(*) as cnt FROM users where email= \'${email}\'`;

    let [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.status(400).json({err});
    }


    if(data[0].cnt > 0)
      return res.status(400).json({ "err": `A user with this email already exists !!` });
    
    const [tmp, encrypted_pass] = await to( utils.passwordHash(password));

    if(tmp)
        return res.status(400).json({ "err": "Error in encrypting password"});


    query = `INSERT INTO users(name, email, encrypted_pass, login_status) VALUES( \'${name}\', \'${email}\', \'${encrypted_pass}\', false )`;

    [err, data] = await to(db.executeQuery(query));
    if(err){
      return res.status(400).json({err});
    }
        
    return res.json({ "msg": "Successfully signed up !!" });

});



router.put('/login', async (req, res) => {

    let {email, password} = req.body;

    if(!email || !password){
        res.status(401).json({ "err": 'Please enter both details of the user: email, password'});
    }

    // Checking if user is signed up or not   
    let query = `SELECT *, count(*) as cnt FROM users where email= \'${email}\'`;

    let [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.status(400).json({err});
    }

    if(data[0].cnt == 0)
      return res.status(400).json({ "err": `User hasn't signed up !!` });

    if(data[0].login_status == true)
        return res.status(400).json({ "err": "User is already logged in !"});

    
    const newStudent = {
        "id": data[0].id,
        email,
        password
    } 
    

    // Checking password
    let [error, isValid] = await to( bcrypt.compare(password, data[0].encrypted_pass) );

    if(error){
        return res.status(400).json({ "error": "Some error occured in comparing password"});
    }

    if(!isValid){
        return res.status(400).json({ "error": "Incorrect Password !"});
    }
    

    

    console.log(newStudent);
    
    // Creating user's token

    jwt.sign( {newStudent}, 'secretkey', async (err, token) => {

        if(err)
            return res.status(400).json({ "err": "Error in assigning token" });

        // Updating login_status to true
        query = `UPDATE users SET login_status= true WHERE email= \'${email}\' `;

        [err, data] = await to(db.executeQuery(query));

        if(err){
        return res.status(400).json({"err": "Some error occured in logging in"});
        }

        return res.json({
            "accessToken" : token,
            "errorrr": err
        });
    }); 

    //

});





router.put('/logout',utils.verifyToken, async (req, res) => {

    let {email} = res.cur_user;
    //let {email} = req.body;

    // Updating login_status to false
    let query = `UPDATE users SET login_status= false WHERE email=\'${email}\' `;
    let [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.status(400).json({"err": "Some error occured in logging out"});
    }

    res.json({"msg": "Logged out succesfully !!"});
 
});



/* 
router.get('/try', utils.verifyToken, (req, res) => {
    res.json({"user": "user1"});
}); */


module.exports = router;
