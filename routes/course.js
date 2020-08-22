const express = require('express');
const router = express.Router();
const fs = require('fs')
const path = require('path');
const utils = require('../data/utils');
const db = require('../data/mysql/index');
const {to} = require('await-to-js');
const { admin_id } = require('../data/utils');


// GET all courses
router.get('/', async function(req, res, next) {

  let query = `SELECT * FROM courses`;

  let [err, data] = await to(db.executeQuery(query));

  if(err){
    return res.json({data:null, error: err});
  }

  return res.json({data, error: null});

});


// GET a course by id 
router.get('/:c_id', async (req, res, next) => {

    let query = `SELECT * FROM courses WHERE id= ${req.params.c_id}`;

    let [err, data] = await to(db.executeQuery( query ));

    if(err){
      return res.json({data: null, error: err});
    }


    query = `SELECT user_id FROM enrollment WHERE course_id= ${req.params.c_id}`;

    let enrolled_users;
    [err, enrolled_users] = await to(db.executeQuery( query ));
    

    let enrolled = [];
    enrolled_users.forEach( (enr) => enrolled.push(enr.user_id));
    data[0]["enrolled_users"] = enrolled;

    if(err){
      return res.json({data:null, error: err});
    }


    return res.json({ data, error: null });
});




// Add course
router.post( '/addcourse', utils.verifyToken, async (req, res) => {

    let {name, description, available_slots} = req.body;

    // Checking the user should be admin
    let token_user_id = res.cur_user.id;

    if( token_user_id != utils.admin_id)
        return res.json({ data: null, error: "Only admin can add a course!" });


    if( !name)
      return res.json({ data: null, error: 'Please provide name of the course'});

    if(!available_slots)
      return res.json({ data: null, error: 'Please provide available slots of the course'});

    available_slots = parseInt( available_slots );

    if( available_slots <= 0)
      return res.json({ data: null, error: 'Available slots should be positive'});



    let query = `INSERT INTO courses(name, description, available_slots) VALUES( \'${name}\', \'${description}\', ${available_slots})`;

    let [err, data] = await to(db.executeQuery(query));
    if(err){
      return res.json({ data:null, error: err});
    }
    
    return res.json({ data: "success", error: null });

});




// Delete course by id
router.delete( '/delete/:c_id', utils.verifyToken, async (req, res) => {

  // Checking the user should be admin
  let token_user_id = res.cur_user.id;

  if( token_user_id == utils.admin_id)
      return res.json({ data: null, error: "Only admin can delete a course!" });


  
  // Disenrolling the students of this course
  let query = `DELETE FROM enrollment WHERE course_id= ${req.params.c_id}`;

  let [err, data] = await to(db.executeQuery(query));

  if(err){
    return res.json({ data: null, error: "Error in deleting enrollment of students from course !"});
  }



  // Removing course
  query = `DELETE FROM courses WHERE id= ${req.params.c_id}`;

  [err, data] = await to(db.executeQuery(query));

  if(err){
    return res.json({ data: null, error: "No course exist with this id"});
  }


  return res.json({ data: "success", error });
});





// Enroll a student in course
router.put( '/:c_id/enroll', utils.verifyToken, async (req, res) => {

    const c_id = req.params.c_id;
    const u_id = req.body.user_id; 

    // Checking if student id is provided or not
    if(!u_id)
      return res.json({ data: null, error: "Please provide user's id to enroll !"});



    // Checking if user id is invalid    
    let query = `SELECT count(*) as cnt FROM users where id= ${u_id}`;

    let [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.json({data: null, error: err});
    }


    if(data[0].cnt == 0)
      return res.json({ data: null, error: `No user found with the id ${u_id}` });



    // Checking if course id is invalid or no avalaible slots left in course
    query = `SELECT count(*) as cnt, available_slots FROM courses where id= ${c_id}`;

    [err, data] = await to(db.executeQuery(query));
    if(err){
      return res.json({ data: null, error});
    }


    if(data[0].cnt == 0)
      return res.json({ data: null, error: `No course found with the id ${c_id}` });

    let avl = data[0].available_slots;
    if( avl <= 0)
      return res.json({ data: null, error: "No available slots left in this course"});

    avl = avl-1;



    // Checking if student is already registered in the course
    query = `SELECT COUNT(*) as cnt FROM enrollment WHERE course_id= ${c_id} AND user_id= ${u_id}`;
    
    [err, data] = await to(db.executeQuery(query));
    if(err){
      return res.json({ data: null, error: err });
    }

    if(data[0].cnt>0)
      return res.json({ data: null, error: "The student is already enrolled in the course!" });

    

    // Checking if the user wants to enroll themself or other or admin wants to do so
    let token_user_id = res.cur_user.id;
    //console.log(token_user_id);

    if( token_user_id != u_id && token_user_id != utils.admin_id)
        return res.json({ data:null, error: "User can't enroll anyone else !" });

    if(u_id == utils.admin_id)
      return res.json({ data: null, error: "Admin can't be enrolled !"});



    // Adding user to enrollment table with c_id
    query = `INSERT INTO enrollment(course_id, user_id) VALUES( ${c_id}, ${u_id})`;

    [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.json({ data: null, error: "Error in enrolling student in course"});
    }
    


    // Decrementing available slots in the course
    query = `update courses set available_slots= ${avl} where id= ${c_id}`;

    [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.json({ data: null, error: "Error in updating alloted_slots value"});
    }

    return res.json({ data: "User is succesfully enrolled !", error: null });

});






// Deregister a student from a course
router.put( '/:c_id/disenroll', utils.verifyToken, async (req, res) => {

    const c_id = req.params.c_id;
    const u_id = req.body.user_id; 

    // Checking if student id is provided or not
    if(!u_id)
      res.json({ data: null, error: "Please provide user's id to disenroll !"});



    // Checking if user id is invalid    
    let query = `SELECT count(*) as cnt FROM users where id= ${u_id}`;

    let [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.json({ data: null, error: err});
    }


    if(data[0].cnt == 0)
      return res.json({ data: null, error: `No user found with the id ${u_id}` });



    // Checking if course id is invalid and calculating avalaible slots in course
    query = `SELECT count(*) as cnt, available_slots FROM courses where id= ${c_id}`;

    [err, data] = await to(db.executeQuery(query));
    if(err){
      return res.json({ data: null, error: err});
    }


    if(data[0].cnt == 0)
      return res.json({ data: null, error: `No course found with the id ${c_id}` });

    let avl = data[0].available_slots;
    avl = avl+1;



    // Checking if student is not registered in the course
    query = `SELECT COUNT(*) as cnt FROM enrollment WHERE course_id= ${c_id} AND user_id= ${u_id}`;
    
    [err, data] = await to(db.executeQuery(query));
    if(err){
      return res.json({ data: null, error: err});
    }

    if(data[0].cnt==0)
      return res.json({ data: null, error: "The student is not enrolled in the course!" });


    // Checking if the user wants to disenroll themself or other or admin wantgs to disenroll
    let token_user_id = res.cur_user.id;
    if( token_user_id != u_id && token_user_id != utils.admin_id)
        return res.json({ data: null, error: "User can't disenroll anyone else !" });



    // Removing user to enrollment table with c_id
    query = `DELETE FROM enrollment WHERE course_id= ${c_id} AND user_id= ${u_id};`;

    [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.json({ data: null, error: "Error in disenrolling user from course"});
    }
    


    // Decrementing available slots in the course
    query = `UPDATE courses SET available_slots= ${avl} WHERE id= ${c_id}`;

    [err, data] = await to(db.executeQuery(query));

    if(err){
      return res.json({ data: null, error: "Error in updating alloted_slots value"});
    }

    return res.json({ data: "User is succesfully disenrolled from the course!", error: null });

});
 



/* 
// Enroll a student into a course
router.put( '/:c_id/enroll', utils.verifyToken, (req, res) => {

  let {student_id} = req.body;
  
  try{

        let COURSES = JSON.parse(fs.readFileSync(cour_path));
        let STUDENTS = JSON.parse(fs.readFileSync(stu_path));

        var c_id = req.params.c_id;
        const c_found = COURSES.some( course => course.id === parseInt(req.params.c_id));

        // Check if that course do not exist
        if( !c_found)
            throw {error: `No course found with the id ${c_id}`};


        var choosed_course = COURSES.filter( course => course.id === parseInt(c_id));
        choosed_course = choosed_course[0];
        var enrolled = choosed_course.enrolledStudents;
            
        // Check available slots in that course
        if( choosed_course["availableSlots"] <= 0)
          throw {error: 'No available slots left in this course'};


        if( !student_id)
            throw {error: 'Please provide a student id to enroll in the course.'};
            
        // Check if the student with that id is present or not
        const s_found = STUDENTS.find( stud => stud.id === parseInt(student_id));

        if( !s_found)
        {
            throw {error: `No student with the id ${student_id} is present`};
        }  


        // Check if student is already enrolled in the course or not 
        var ind = enrolled.indexOf(parseInt(student_id));

        if( ind !=-1)
          throw {error: "Student is already registered!" } ;
        else
        {
          if(res.cur_user.email != s_found.email)
              res.status(400).json({"err": "Students can only enroll themselves !" });

          choosed_course.availableSlots-=1;
          enrolled.push( student_id );
          fs.writeFileSync(cour_path, JSON.stringify(COURSES, null, 2));

          res.send( {success: true});
        }
  } 

  catch(error) {
    res.status(400).json( error );
  }

});
 

// Deregister a student from a course
router.put( '/:c_id/deregister', utils.verifyToken, (req, res) => {

  let {student_id} = req.body;

  try {
      let c_id = req.params.c_id;

      let COURSES = JSON.parse(fs.readFileSync(cour_path));
      let STUDENTS = JSON.parse(fs.readFileSync(stu_path));

      const c_found = COURSES.some( course => course.id === parseInt(req.params.c_id));

      // Check if that course do not exist
      if( !c_found)
      { 
        throw {error: `No course found with the id ${c_id}`};
      }


      var choosed_course = COURSES.filter( course => course.id === parseInt(c_id));
      choosed_course = choosed_course[0];
      var enrolled = choosed_course.enrolledStudents;


      if( !student_id)
          throw {error: 'Please provide a student id to deregister from the course.'};
          
      // Check if the student with that id is present or not
      const s_found = STUDENTS.find( stud => stud.id === parseInt(student_id));

      if( !s_found)
      {
        throw {error: `No student with the id ${student_id} is present`};
      }  

      // Check if student is already enrolled in the course or not 

      var ind = enrolled.indexOf(parseInt(student_id));

      if( ind==-1)
        throw {error: `Student wasn't registered in this course`} ;
      else
      {
        if(res.cur_user.email != s_found.email)
          res.status(400).json({"err": "Students can only deregister themselves !" });

        choosed_course.availableSlots+=1;
        enrolled.splice(ind, 1);
        fs.writeFileSync(cour_path, JSON.stringify(COURSES, null, 2));

        res.send( {success: true});
      }
  }
  catch(error)
  {
    res.status(400).json( error );
  }


});

*/


module.exports = router;
