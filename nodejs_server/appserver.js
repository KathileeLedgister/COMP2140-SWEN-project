/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


var webpush = require('web-push');
// Create express app
var express = require("express");
var md5 = require('md5');
var bodyParser = require("body-parser");
var url = require('url');
var querystring = require('querystring');

global._nailz_db = require("./sys_init.js");
var app = express();

console.log("VAPID_PUBLIC_KEY: ", process.env.VAPID_PUBLIC_KEY);
console.log("VAPID_PRIVATE_KEY: ", process.env.VAPID_PRIVATE_KEY);

var VAPID_PUBLIC_KEY = 'BMYUON9Kr1deQlNRlqglOnnpkiPJg3eHytnLsTXNAsht-nL0ip37feleAQI13poWEebkwbiWPUyUhuE-sw4yXYU';
var VAPID_PRIVATE_KEY = 'WqrV5_9wcLz7Wtpbpz2qQsZVhnfZcGxtfx8pC3-L2ek';

// Set the keys used for encrypting the push messages.
webpush.setVapidDetails('mailto:vrlsoftwareg@gmail.com',
        (!process.env.VAPID_PUBLIC_KEY ? VAPID_PUBLIC_KEY : process.env.VAPID_PUBLIC_KEY),
        (!process.env.VAPID_PRIVATE_KEY ? VAPID_PRIVATE_KEY : process.env.VAPID_PRIVATE_KEY));

//========================================
//TEST SETUP
// ONE TEST DATABASE PER DEVELOPER
//const {db_kaleesia, db_tracey, db_neil, db_clarke, db_graham} = require("./sys_init_test.js");
//========================================
//========================================
// Initialize Developer modules
try {
    var _kaleesia = require("./src/kaleesia.js");
    //_kaleesia.init(app, _sys_funcs);
    console.log("Initialized Module kaleesia");
} catch (e) {
    console.log("Failed: Module kaleesia ==> ", e);
    _kaleesia = null;
}
try {
    var _tracey = require("./src/tracey.js");
    //_tracey.init(app, _sys_funcs);
    console.log("Initialized Module tracey");
} catch (e) {
    console.log("Failed: Module tracey ==> ", e);
    _tracey = null;
}
try {
    var _neil = require("./src/neil.js");
    //_neil.init(app, _sys_funcs);
    console.log("Initialized Module neil");
} catch (e) {
    console.log("Failed: Module neil ==> ", e);
    _neil = null;
}
try {
    var _clarke = require("./src/clarke.js");
    //_clarke.init(app, _sys_funcs);
    console.log("Initialized Module clarke");
} catch (e) {
    console.log("Failed: Module clarke ==> ", e);
    _clarke = null;
}
try {
    var _graham = require("./src/graham.js");
    //_graham.init(app, _sys_funcs);
    console.log("Initialized Module graham");
} catch (e) {
    console.log("Failed: Module graham ==> ", e);
    _graham = null;
}
//========================================

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(bodyParser.raw());

// Server port
var HTTP_PORT = 8001;
global._user_sesssions = [];
// the calender can be used based on match
global._calender_session = 0;
global._calender_appointments = [];


var HOUSE_KEEPING_TIMEOUT = 60 * 60 * 1000; /* every hour */
var HOUSE_DUTY_TIMEOUT = 60 * 1000; /* in seconds */
var _house_state = 0;

global.TIME_ZONE_OFFSET = 5 * 60 * 60 * 1000;
global._nailz_last_request = (new Date()).getTime();

// Global array collecting all active endpoints. In real world
// application one would use a database here.
global.subscriptions = {};

// How often (in seconds) should the server send a notification to the
// user.
const pushInterval = 10; //600


var _lazy_house_keeper = function () {
    //=====================================================
    // perform house keeping duties
    // in chinks of time
    // PERFORM : one duty then allow services
    // the perform a next
    //=====================================================
    switch (_house_state) {
        case 0:
            console.log("House Keeper: State [" + _house_state + "]");
            if (((new Date()).getTime() - global._nailz_last_request) < HOUSE_DUTY_TIMEOUT) {
                setTimeout(_lazy_house_keeper, HOUSE_DUTY_TIMEOUT);
                console.log("House Keeper: State [" + _house_state + "]. Put to Sleep ...");
                break;
            }
            /* perform duties */
            console.log("House Keeper: State [" + _house_state + "] Completed");

            _house_state++;
            setTimeout(_lazy_house_keeper, HOUSE_DUTY_TIMEOUT);
            break;
        case 1:
            console.log("House Keeper: State [" + _house_state + "]");
            if (((new Date()).getTime() - global._nailz_last_request) < HOUSE_DUTY_TIMEOUT) {
                setTimeout(_lazy_house_keeper, HOUSE_DUTY_TIMEOUT);
                console.log("House Keeper: State [" + _house_state + "]. Put to Sleep ...");
                break;
            }
            /* perform duties */
            console.log("House Keeper: State [" + _house_state + "] Completed");

            _house_state++;
            setTimeout(_lazy_house_keeper, HOUSE_DUTY_TIMEOUT);
            break;
        default:
            _house_state = 0;
            // we are done all duties
            setTimeout(_lazy_house_keeper, HOUSE_KEEPING_TIMEOUT);
            console.log("Lazy House Keeper: All Done. Waiting ...");
            break;
    }
};

// Start server
app.listen(HTTP_PORT, () => {
    console.log("Server running on port %PORT%".replace("%PORT%", HTTP_PORT));

    /* run on startup */
    setTimeout(_lazy_house_keeper, HOUSE_DUTY_TIMEOUT);
    console.log("Initialized House Keeper. Waiting ...");


});

// Root endpoint
app.get("/", (req, res, next) => {
    _last_request = (new Date()).getTime();
    res.json({"Nailz Application Service .. Submit Your Query": "Ok"});
});

if (_kaleesia)
    app.use('/r1', _kaleesia);
if (_clarke)
    app.use('/r2', _clarke);
if (_graham)
    app.use('/r3', _graham);
if (_neil)
    app.use('/r4', _neil);
if (_tracey)
    app.use('/r5', _tracey);

//============================================================================
// Insert here other API endpoints
// for "GET" retrieve query parameters with ::: req.query.<field name>
// for "POST" retrieve data parameters with ::: req.body.<field name>
//============================================================================

// Send notification to the push service. Remove the subscription from the
// `subscriptions` array if the  push service responds with an error.
// Subscription has been cancelled or expired.
function sendNotification(sub_package) {
    webpush.sendNotification(sub_package.subscription, sub_package.payload, {TTL: 200}).then(
            function () {
                console.log('Push Application Server - Notification sent to ' + sub_package.subscription.endpoint);
                delete global.subscriptions[sub_package.subscription.endpoint];
            }).catch(
            function () {
                console.log('ERROR in sending Notification, endpoint removed ' + sub_package.subscription.endpoint);
                delete global.subscriptions[sub_package.subscription.endpoint];
            });
}

// In real world application is sent only if an event occured.
// To simulate it, server is sending a notification every `pushInterval` seconds
// to each registered endpoint.
setInterval(function () {
    Object.values(global.subscriptions).forEach(sendNotification);
}, pushInterval * 1000);

app.get("/vapidPublicKey", function (req, res) {
    res.send((!process.env.VAPID_PUBLIC_KEY ? VAPID_PUBLIC_KEY : process.env.VAPID_PUBLIC_KEY));
});

// Register a subscription by adding it to the `subscriptions` array.
app.post("/register", function (req, res) {
    console.log("REGISTER:: --");
    console.log(req.body);
    var subscription = req.body.subscription;
    var json_s = JSON.stringify(req.body.subscription);

    var sql = `UPDATE users set subscription = ? WHERE userid=?`;
    params = [json_s, req.body.options.userid];
    global._nailz_db.run(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        console.log("REGISTERED SUBSCRIPTION:: --");
        rdata = {
            "message": "success"
        };
        console.log(rdata);

        res.json(rdata);

        if (!global.subscriptions[subscription.endpoint]) {
            console.log('Subscription registered ' + subscription.endpoint);
            global.subscriptions[subscription.endpoint] = {
                subscription: subscription,
                payload: "Your Subscription has been Activated"
            };
        }
        return;
    });
});

// Unregister a subscription by removing it from the `subscriptions` array
app.post("/unregister", function (req, res) {
    var subscription = req.body.subscription;

    var sql = `UPDATE users set subscription = ? WHERE userid=?`;
    params = ["", req.body.options.userid];
    global._nailz_db.run(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({"error": err.message});
            return;
        }
        console.log("UNREGISTERED SUBSCRIPTION:: --");
        rdata = {
            "message": "success"
        };
        console.log(rdata);

        res.json(rdata);

        if (global.subscriptions[subscription.endpoint]) {
            console.log('Subscription unregistered ' + subscription.endpoint);
            delete global.subscriptions[subscription.endpoint];
        }
        return;
    });
});

//---------------------------------------------------------
// THIS MUST BE LAST
// Default response for any other request
app.use(function (req, res) {
    console.log("Nailz Application Server received UNSUPPORTED request");
    res.status(404).end();
});

