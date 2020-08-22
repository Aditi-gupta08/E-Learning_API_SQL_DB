const mysql = require('mysql');
const { resolve } = require('path');

const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'Aditi@08',
    database : 'devsnest'
  });

const connectDB = () => {
    return new Promise( (resolve, reject) => {
           
        connection.connect( (err, res) => {
            if(err) {
                //console.log( "Error in connecting to mysql");
                //console.log(err);
                return reject( new Error("Error in connecting to mysql"));
            }
            return resolve(true);
        });
    });
};


const executeQuery = (query) => {
    return new Promise( async (resolve, reject) => {
        await connection.query(query, function (err, results, fields) {
            if (err) {
                console.log("Error", err);
                //return reject(new Error("Error in executing query"));
                return reject(err);
            }
            else{
                //console.log('The solution is: ', results);
                return resolve(results);
            }

            
        });
    });
    
};

module.exports = {
    connectDB,
    executeQuery
};