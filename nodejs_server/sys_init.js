/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

//const webPush = require('web-push');

var sqlite3 = require('sqlite3').verbose();
var md5 = require('md5');

/*if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log("You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY "+
    "environment variables. You can use the following ones:");
  console.log(webPush.generateVAPIDKeys());
}*/

const DBSOURCE = "./db/nailz.db";
let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        // Cannot open database
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        db.serialize(function () {
            db.run(`CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userid text NOT NULL UNIQUE, 
            email text, 
            password text,
            level INTEGER,
            fullname text,
            allergy text,
            notify text,
            subscription text,
            phone
            )`, (err) => {
                if (err) {
                    // Table already created
                    console.log("Database [nailz.users] Found and Initialized. Ready ...", err);
                    db.all(`select * from users`,[], (err, rows) => {console.log(rows);});
                } else {
                    // Table just created, creating some rows
                    var insert = `INSERT INTO users (userid, email, password, 
                                    level, fullname, allergy, notify, subscription, 
                                    phone) VALUES (?,?,?,?,?,?,?,?,?)`;
                    db.run(insert, ["admin", "admin@nailz.com", "password", 0, "", "","","",""]);
                    db.run(insert, ["manager", "manager@nailz.com", "password", 1, "", "","","",""]);

                    console.log("Database Table [nailz.users] Created and Initialized. Ready ...");
                }
            });

            db.run(`CREATE TABLE appointments (
            a_slot INTEGER NOT NULL PRIMARY KEY,
            a_uuid INTEGER NOT NULL, 
            a_service text,
            a_status text)`, (err) => {
                if (err) {
                    // Table already created
                    console.log("Database [nailz.appointments] Found and Initialized. Ready ...", err);
                    db.all(`select * from appointments`,[], (err, rows) => {console.log(rows);});
                } else {
                    console.log("Database [nailz.appointments] Created and Initialized. Ready ...");
                }
            });
        });
    }
});


module.exports = db;
