const express = require('express');
const router = express.Router();
const path = require('path');
const utils = require('../data/utils');
const fs = require('fs');
const stu_path = path.join(__dirname, '..', 'data/STUDENTS.json');
const uuid = require('uuid');
const db = require('../data/mysql/index');
const {to} = require('await-to-js');

// GET all users 
router.get( '/', async (req, res) => {
  let query = 'SELECT * FROM users;';

  let [err, data] = await to(db.executeQuery(query));

  if(err){
    return res.status(400).json({err});
  }
  
  return res.json({ 'data': data});
});


// GET user by id
router.get( '/:u_id', async (req, res) => {
  let query = `SELECT * FROM users where id= ${req.params.u_id};`;

  let [err, data] = await to(db.executeQuery(query));

  if(err){
    return res.status(400).json({err});
  }
  
  return res.json({ 'data': data});
});




// Delete user
router.delete( '/:u_id', utils.verifyToken, async (req, res) => {

  let u_id = req.params.u_id;


  // Only user itself of admin can delete 
  let token_user_id = res.cur_user.id;


  if( token_user_id != u_id && token_user_id != utils.admin_id)
      return res.status(403).json({ "err": "User can't delete anyone else!" });

  if(u_id == utils.admin_id)
      return res.status(403).json({ "err": "Admin can't be deleted !"});


  // Incrementing available slots of the courses in which student was enrolled
  let query = `update courses set available_slots = available_slots + 1 where id in (select course_id from enrollment where user_id= ${u_id})`;

  let [err, data] = await to(db.executeQuery(query));
  if(err){
    return res.status(400).json({ "err": "Error in deleting user's enrollment! "});
  }


  // Removing user from enrollment table
  query = `delete from enrollment where user_id= ${u_id}`;

  [err, data] = await to(db.executeQuery(query));
  if(err){
    return res.status(400).json({ "err": "Error in deleting student's enrollment" });
  }


  // Removing user from users table
  query = `delete from users where id= ${u_id}`;

  [err, data] = await to(db.executeQuery(query));
  if(err){
    return res.status(400).json({ "err": "No user exist with this id" });
  }
  
  
  return res.json({ 'message': "success"});
}); 




module.exports = router;
