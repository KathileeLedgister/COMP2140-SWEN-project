var express = require('express');
var router = express.Router();

var md5 = require('md5');
var bodyParser = require("body-parser");
var url = require('url');
var querystring = require('querystring');

var _get_start_of_calender = function () {
    //====================================================================================
    // custom processing
    let today = new Date();
    let d = today.getTime();

    var of_week = new Date();
    of_week.setTime(today.getTime() - today.getDay() * 86400000);

    // set the time to 7AM
    console.log(of_week.toString());
    var start_of_calender = new Date(of_week.getFullYear(), of_week.getMonth(), of_week.getDate(), 7);
    console.log(start_of_calender.toString());
    //====================================================================================
    return start_of_calender;
};

var _fetch_calendar = function (do_reload) {
    var start_of_calender = _get_start_of_calender();
    var data = {
        start_slot: start_of_calender.getTime()
    };

    console.log("Processing ...");

    var sql = `SELECT appointments.*, email, fullname, allergy, phone
                    FROM appointments INNER JOIN users ON 
                    appointments.a_uuid=users.id WHERE a_slot >= ?`;
    var params = [data.start_slot];

    return new Promise((resolve, reject) => {
        if (!do_reload) {
            resolve();
        } else {
            console.log("Reloading Calender. Processing ...");
            global._nailz_db.serialize(function () {
                global._nailz_db.all(sql, params, (err, rows) => {
                    if (err) {
                        global._calender_session = 0;
                        global._calender_appointments = [];
                        console.log("Reloading Calender. Failed", err);
                        reject();
                    } else {
                        global._calender_session = (new Date()).getTime();
                        global._calender_appointments = rows;

                        console.log("Calendar Apponitments : ", rows);
                        console.log("Reloading Calender. Completed");
                        resolve();
                    }
                });
            });
        }
    }).catch(() => {

    });

};


router.use(function timeLog(req, res, next) {
    console.log('Time: ', Date.now().toString());
    next();
});

var _signup_signin = (req, res, next) => {
    global._nailz_last_request = (new Date()).getTime();
    // TESTING 123
    console.log("PARAMS:: --");
    console.log(req.body);

    var errors = [];
    //============================================
    // custom
    if (!req.body.password) {
        //errors.push("No password specified");
    }
    if (!req.body.userid) {
        errors.push("No userid specified");
    }
    if (!req.body.fullname) {
        if (req.body._app_submitter === "signup") {
            errors.push("No fullname specified");
        }
    }
    if (!req.body.email) {
    }
    if (!req.body.allergy) {
    }
    if (!req.body.notify) {
        //errors.push("No [cal_session] specified");
    }
    //============================================
    if (errors.length) {
        console.log(errors.join(","));
        res.status(400).json({"error": errors.join(",")});
        return;
    }

    var data = {
        userid: req.body.userid.trim().toLowerCase(),
        password: /*md5(*/req.body.password.trim(), /*)*/
        level: 9,
        subscription: ""
    };

    if (req.body._app_submitter === "app-signup") {
        data['email'] = req.body.email.trim();
        data['fullname'] = req.body.fullname.trim();
        data['allergy'] = req.body.allergy.trim();
        data['notify'] = req.body.notify.trim();
        data['phone'] = req.body.phone.trim();
    }

    console.log("Processing ...");

    //global._nailz_db.each(sql,params, (err, rows) => {
    global._nailz_db.serialize(function () {
        var sql = "";
        var params = [];
        var rdata = {"error": "Database Query Failed"};
        var bupdate = false;

        new Promise((resolve, reject) => {
            if (req.body._app_submitter === "app-signin") {
                resolve();
                return;
            }
            sql = "SELECT * FROM users WHERE userid = ?";
            params = [data.userid];
            global._nailz_db.all(sql, params, (err, rows) => {
                if (err) {
                    res.status(400).json({"error": err.message});
                    reject();
                    return;
                }
                console.log("USERID ROWS:: --");
                console.log(rows);
                if (rows.length === 1 && rows[0].password === data.password) {
                    bupdate = true;
                    resolve();
                    return;
                } else if (rows.length === 0) {
                    resolve();
                    return;
                }
                res.status(400).json({"error": "Account already exists. Try another UserID"});
                reject();
                return;
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                if (req.body._app_submitter === "app-signin") {
                    resolve();
                    return;
                }
                //return new Promise((resolve, reject) => {});
                if (bupdate) {
                    sql = `UPDATE users set email = ?, password = ?, fullname = ?,
                            allergy=?, phone=? WHERE userid=?`;
                    params = [data.email, data.password, data.fullname, data.allergy, data.phone, data.userid];
                    console.log("UPDATE ROWS:: --");
                } else {
                    sql = "INSERT INTO users (userid, email, password, level, fullname, allergy, notify, subscription, phone) VALUES (?,?,?,?,?,?,?,?,?)";
                    params = [data.userid, data.email, data.password, data.level, data.fullname, data.allergy, data.notify, data.subscription, data.phone];
                    console.log("INSERT ROWS:: --");
                }
                global._nailz_db.run(sql, params, (err, rows) => {
                    if (err) {
                        res.status(400).json({"error": err.message});
                        reject();
                        return;
                    }
                    console.log("RESULT ROWS:: --");
                    rdata = {
                        "message": "success"
                    };
                    console.log("UPDATE RETURNS:: --");
                    console.log(rdata);

                    resolve();
                    return;
                });
            }).catch(()=>{
                return Promise.reject();
            });
        }).then(() => {
            return new Promise((resolve, reject) => {
                sql = "SELECT * FROM users WHERE userid = ?";
                params = [data.userid];
                global._nailz_db.all(sql, params, (err, rows) => {
                    console.log("USERID SElECT:: --");
                    if (err) {
                        console.log("Error:", err);
                        res.status(400).json({"error": err.message});
                        reject();
                        return;
                    }
                    console.log("USERID ROWS:: --");
                    console.log(rows);
                    if (rows.length > 1) {
                        res.status(400).json({"error": "Unable to login user. Check [userid or password]"});
                        reject();
                        return;
                    }
                    if (rows.length === 0) {
                        console.log("No account was found for this user");
                        rdata = {"noaccount": "No account was found for this user"};
                        res.json(rdata);
                        reject();
                        return;
                    }
                    if(rows.length===1 && !data.password){
                        console.log("You may now update YOUR Account");
                        rdata = {"updateaccount": "You may now update YOUR Account"};
                        res.json(rdata);
                        reject();
                        return;
                    }
                    resolve();
                    return;
                });
            }).catch(()=>{
                return Promise.reject();
            });
        }).then(() => {
            //return new Promise((resolve, reject) => {});
            sql = "SELECT * FROM users WHERE userid = ? AND password = ?";
            params = [data.userid, data.password];

            global._nailz_db.all(sql, params, (err, rows) => {
                if (err) {
                    res.status(400).json({"error": err.message});
                    return Promise.reject();
                }
                console.log("ROWS:: --");
                console.log(rows);
                if (rows.length !== 1) {
                    res.status(400).json({"error": "Unable to login user. invalid [userid or password]"});
                    return Promise.reject();
                }

                var olen = Object.keys(rows).length;
                var user_session = (new Date()).getTime();
                var start_of_calender = _get_start_of_calender();

                for (var k = 0; k < olen; k++) {
                    console.log(rows[k].id);
                    //====================================================================================
                    // custom processing
                    global._user_sesssions["U" + rows[k].userid] = {id: rows[k].id, session: user_session, level: rows[k].level};

                    //====================================================================================

                    rdata = {
                        "message": "success",
                        "start_of_calender": start_of_calender.getTime(),
                        "cal_session": global._calender_session,
                        "session": user_session,
                        "id": rows[k].id,
                        "userid": rows[k].userid,
                        "level": rows[k].level
                    };
                }
                console.log("RETURNS:: --");
                console.log(rdata);

                res.json(rdata);
            });
        }).catch(() => {

        });
    });
};

//router.get("/signin", (req, res, next) => {
router.post("/signin", (req, res, next) => {
    _signup_signin(req, res, next);
});

router.post("/signup", (req, res, next) => {
    _signup_signin(req, res, next);
});

router.get("/cal_set_avail", (req, res, next) => {
    global._nailz_last_request = (new Date()).getTime();
    // TESTING 123
    console.log("PARAMS:: --");
    console.log(req.query);
    var errors = [];
    //============================================
    // custom
    if (!req.query.uuid) {
        errors.push("No user KEYID specified");
    }
    if (!req.query.status) {
        errors.push("No operation specified");
    }
    if (!req.query.user_session) {
        errors.push("No [user_session] specified");
    }
    if (!req.query.level) {
        errors.push("No [user_level] specified");
    }
    if (!req.query.slot) {
        errors.push("No [Time Slot] specified");
    }
    if (!req.query.cal_session) {
        errors.push("No [cal_session] specified");
    }
    if (!req.query.alergy) {
        errors.push("No [cal_session] specified");
    }
    if (!req.query.notify) {
//errors.push("No [cal_session] specified");
    }
//============================================
    if (errors.length) {
        console.log(errors.join(","));
        res.status(400).json({"error": errors.join(",")});
        return;
    }

    var data = {
        a_slot: req.query.slot.trim(),
        a_uuid: req.query.uuid.trim(),
        a_service: req.query.service.trim(),
        a_status: req.query.status.trim(),
        a_notify: req.query.notify.trim()
    };
    console.log("Processing ...");
    var sql;
    var params;
    var customer_uuid = -1;
    //global._nailz_db.each(sql,params, (err, rows) => {
    global._nailz_db.serialize(function () {
        new Promise((resolve, reject) => {
            if (data.a_notify !== "Y") {
                return resolve();
            } else {
                sql = "SELECT a_uuid FROM appointments WHERE a_slot = ?";
                params = [data.a_slot];
                global._nailz_db.all(sql, params, (err, rows) => {
                    if (err) {
                        console.log("cal_get_customer: query error :", err);
                        res.status(400).json({"error": err.message});
                        return reject();
                    }

                    if (rows.length < 1) {
                        console.log("Customer for this appointment NOT found");
                        res.status(400).json({"error": "Customer for this appointment NOT found"});
                        return reject();
                    }
                    customer_uuid = rows[0].a_uuid;
                    console.log("Found Customer to be NOTIFIED ...", customer_uuid);
                    return resolve();
                });
            }
        }).then(() => {
            return new Promise((resolve, reject) => {
                if (req.query.status === "A") {
                    sql = "INSERT INTO appointments (a_slot, a_uuid, a_service, a_status) VALUES (?,?,?,?)";
                    if (!req.query.level || req.query.level > 5) {
                        data.a_status = "U"; //  used - regular customer
                    } else {
                        data.a_status = "N"; //  NOT available
                    }
                    params = [data.a_slot, data.a_uuid, data.a_service, data.a_status];
                } else {
                    if (parseInt(req.query.level) < 6) {
                        sql = "DELETE FROM appointments WHERE a_slot = ?";
                        params = [data.a_slot];
                    } else {
                        sql = "DELETE FROM appointments WHERE a_slot = ? and a_uuid = ?";
                        params = [data.a_slot, data.a_uuid];
                    }
                }
                global._nailz_db.run(sql, params, (err, rows) => {
                    if (err) {
                        console.log("cal_set_avail: query error :", err);
                        res.status(400).json({"error": err.message});
                        return reject();
                    }

                    global._calender_session = (new Date()).getTime();
                    if (data.a_notify !== "Y") {
                        rdata = {
                            "message": "success"
                        };
                        res.json(rdata);
                        return reject();
                    } else {
                        console.log("Logged NOTIFICATION request ...");
                        return resolve();
                    }
                });
            });
        }).then(() => {
            var sql = `SELECT userid, subscription FROM users WHERE id=?`;
            params = [customer_uuid];
            global._nailz_db.all(sql, params, (err, rows) => {
                if (err) {
                    res.status(400).json({"error": err.message});
                    return;
                }
                console.log("LOADING REGISTERED SUBSCRIPTION:: --", rows);
                if (rows.length > 0 && rows[0].subscription) {
                    let subscription = JSON.parse(rows[0].subscription);
                    if (!global.subscriptions[subscription.endpoint]) {
                        console.log('Subscription Re-Loaded ' + subscription.endpoint);
                        let sdate = new Date();
                        sdate.setTime(parseInt(data.a_slot) /*+ global.TIME_ZONE_OFFSET*/);
                        //let date_options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric'};
                        //_start_of_week.toLocaleDateString("en-US", date_options)

                        //let str1 = sdate.toUTCString();
                        //str1 = str1.substr(0, str1.lastIndexOf(":"));

                        let str1 = sdate.toDateString() + " " + (sdate.getHours() +
                                (sdate.getHours() > 12 ? -12 : 0)) + ":" +
                                sdate.getMinutes() + " " +
                                (sdate.getHours() > 12 ? "PM" : "AM");

                        let message = "Your Nailz Appointment @ [" + str1 + "] Has been Cancelled";
                        console.log("Cancel Appointment Date", message);
                        global.subscriptions[subscription.endpoint] = {subscription: subscription, payload: message};
                    }
                    console.log("ADDED SUBSCRIPTION:: --");
                }

                rdata = {
                    "message": "success"
                };
                console.log(rdata);
                res.json(rdata);
                return;
            });
        }).catch(() => {

        });
    });
});
router.get("/calender_all", (req, res, next) => {
    global._nailz_last_request = (new Date()).getTime();
    // TESTING 123
    console.log("PARAMS:: --");
    console.log(req.query);
    var errors = [];
    //============================================
    // custom
    if (!req.query.pg_id) {
        //errors.push("No user KEYID specified");
    }
    if (!req.query.cal_session) {
        errors.push("No [calender_session] specified");
    }
    //============================================
    if (errors.length) {
        console.log(errors.join(","));
        res.status(400).json({"error": errors.join(",")});
        return;
    }

    console.log("Processing ...");
    var do_reload = false;
    if (global._calender_session === 0
            || req.query.cal_session !== global._calender_session) {
        do_reload = true;
    }

    _fetch_calendar(do_reload)
            .catch(error => {

            })
            .finally(() => {
                var start_of_calender = _get_start_of_calender();
                res.json({cal_session: global._calender_session,
                    start_of_cal: start_of_calender.getTime(),
                    cal_block: global._calender_appointments});
            });
});
////app.get("/signin", (req, res, next) => {
//    console.log(req.query);

module.exports = router;
