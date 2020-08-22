var express = require('express');
var jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
//const user_path = path.join(__dirname, '/user.json');
const stu_path = path.join(__dirname, '..', 'data/STUDENTS.json');
var {to} = require('await-to-js');
var bcrypt = require('bcrypt');
const db = require('../data/mysql/index');


// Verify token (middleware function)
const verifyToken = (req, res, next) => {

    /* let STUDENTS = JSON.parse(fs.readFileSync( stu_path));

    if( STUDENTS.length == 0)
        return res.status(400).json( {"err": "User is not logged in"}); */


    // Get auth header value
    const bearerHeader = req.headers['authorization'];
  
    // Check if bearer is undefined
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
  
        req.token = bearerToken;

        jwt.verify( req.token, 'secretkey', async (error, authData) => {
            if(error) {
                return res.status(400).json({ "error": "Not verified successfully"}); 
            } 
            
            //console.log(authData);
            let email = authData.newStudent.email;
                
            // Checking if user exist and is logged in or not  
            let query = `SELECT *, count(*) as cnt FROM users where email= \'${email}\'`;

            let [err, data] = await to(db.executeQuery(query));

            if(err){
            return res.status(400).json({err});
            }

            if(data[0].cnt == 0)
            return res.status(400).json({ "err": `User hasn't signed up !!` });

            if(data[0].login_status == false)
                return res.status(400).json({ "err": "User is not logged in !"});

                /* let s_found = STUDENTS.find( stud => stud.email == authData.newStudent.email);
    
                if( !s_found)
                    return res.status(400).json({ "err": "The student is not signed up !!"});

                if(s_found.login_status == false)
                    return res.status(400).json({ "err": "The student is not logged in !!"}); */

            //console.log(authData);
            res.cur_user = authData.newStudent; 
            next();
            
        })
        
    } else {
      res.status(400).json({error: 'Token not found'});
    } 
} 


const passwordHash = async (password) => {
    const saltRounds = 10;
    const [err, encrypted_pass ] = await to( bcrypt.hash(password, saltRounds));

    if(err)
    {
        return res.send( {"msg": "Error while generating password hash"});
    }

    //console.log(encrypted_pass);
    return encrypted_pass;
};


const admin_id = 10;

module.exports = {
    verifyToken,
    passwordHash,
    admin_id
};
