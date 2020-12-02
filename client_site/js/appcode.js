/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
var _calender_session = 0;
var _start_of_cal = new Date();
var _start_of_week = new Date();
var _start_cal_local = new Date();
var __uuid = -1;
const CAL_H = 15;
var date_options = {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
var _calender_data = {};
var _current_week = 0;
const _MAX_MENU_OPTIONS = 3;
var _option_menu = 0;
var _g_errorModal = "#app-message";

function doSubscribeAction() {
    var sub_scribe = document.getElementById('app-subscribe');
    let action = sub_scribe.textContent;
    if (action === "Subscribe") {
        push_subscribe({userid: _userid});
    } else if (action === "Unsubscribe") {
        push_unsubscribe({userid: _userid});
    }
}
function setSubscribeButton() {
    var sub_scribe = document.getElementById('app-subscribe');
    sub_scribe.classList.add("app-visible");
    sub_scribe.classList.remove("app-hidden");

    //sub_scribe.onclick = push_subscribe;
    sub_scribe.textContent = 'Subscribe';
}

function setUnsubscribeButton() {
    var sub_scribe = document.getElementById('app-subscribe');
    sub_scribe.classList.add("app-visible");
    sub_scribe.classList.remove("app-hidden");

    //sub_scribe.onclick = push_unsubscribe;
    sub_scribe.textContent = 'Unsubscribe';
}

var showErrorModal = function (msg) {
    var delay = 10;
    $(_g_errorModal).removeClass("app-notice app-warning app-error");
    if (msg.toUpperCase().indexOf("ERROR:") > -1) {
        $(_g_errorModal).addClass("app-error");
        delay = 30;
    } else if (msg.toUpperCase().indexOf("WARNING:") > -1) {
        $(_g_errorModal).addClass("app-warning");
        delay = 30;
    } else {
        $(_g_errorModal).addClass("app-notice");
    }
    $(_g_errorModal).removeClass("app-hidden");
    $(_g_errorModal).on('hidden.bs.toast', function () {
        $(_g_errorModal).off('hidden.bs.toast');
        $(_g_errorModal).addClass("app-hidden");
    });

    $("#errormessage").html(msg);
    $(_g_errorModal).toast({delay: delay * 1000});
    $(_g_errorModal).toast("show");

    $(_g_errorModal).on("click", function (event) {
        $(_g_errorModal).off("click");
        $(_g_errorModal).toast('hide');
    });
};


$(_g_errorModal).on('shown.bs.toast', function () {
    //$('#errorModalCloseBtn').trigger('focus');
});

var _f_time_for_slot = function (theSlot, remote) {
    var s_id = theSlot.substr(theSlot.indexOf("-") + 1);
    var i_hour_off = parseInt(s_id.substr(0, s_id.indexOf("-") - 1));
    var s_apm = s_id.substr(s_id.indexOf("-") - 1, 1);
    i_hour_off += (s_apm === "P" ? 12 : 0);
    i_hour_off -= 7;
    var i_day = parseInt(s_id.substr(s_id.indexOf("-") + 1));
    var slot_date = new Date();
    slot_date.setTime(_start_of_week.getTime() + i_day * 86400000 + i_hour_off * 60 * 60 * 1000);
    if (remote) {
        var tm_offset = 60 * 1000 * _start_of_cal.getTimezoneOffset();
        slot_date.setTime(slot_date.getTime() - tm_offset);
    }
    //console.log(slot_date.toLocaleDateString("en-US", date_options));
    return slot_date;
};
var _f_slot_for_time = function (theTime) {
    // theTime : server fulltime
    var theSlot = "";
    var _tm_offset = 0;
    var _wk_offset = _start_of_week.getTime() - _start_cal_local.getTime();
    var w_day = _wk_offset ? 0 : (new Date()).getDay();
    do {
        if ((_tm_offset = (theTime - _start_of_cal.getTime())) > _wk_offset) {
            _tm_offset -= _wk_offset;
            var iday_off = Math.floor(_tm_offset / 86400000);
            if (iday_off < w_day || iday_off > 6) // not in this week
                break;
            var ihour_off = (_tm_offset - (iday_off * 86400000));
            var islot_off = Math.floor(ihour_off / (60 * 60 * 1000));

            var s_apm = (islot_off < 6 ? "A" : "P");
            theSlot = "tm-" + (islot_off < 6 ? islot_off + 7 : islot_off - 5) + s_apm + "-" + iday_off;
        }
    } while (false);

    return theSlot;
};

var _f_set_cal_week = function (offset) {
    var wk = 1;
    var stm = _start_cal_local.getTime();
    _start_of_week.setTime(_start_of_week.getTime() + offset * 7 * 86400000);
    var d_off = Math.floor((_start_of_week.getTime() - stm) / 86400000);
    if (d_off < 0) {
        _start_of_week.setTime(stm + 3 * 7 * 86400000);
        wk = 4;
    } else if (d_off > 21) {
        _start_of_week.setTime(stm);
        wk = 1;
    } else {
        wk = Math.floor(d_off / 7) + 1;
    }

    return wk;
};

var _f_show_cal_next = function (offset) {
    return new Promise((resolve, reject) => {
        // clear the calender
        var objs = document.querySelectorAll("td");
        var olen = objs.length;
        for (var k = 0; k < olen; k++) {
            objs[k].classList.remove("cal-no");
            objs[k].classList.remove("cal-navail");
            objs[k].classList.remove("cal-user-lock");
            objs[k].classList.remove("cal-other-lock");
        }

        var wk = _f_set_cal_week(offset);

        var w_day = (new Date()).getDay();
        if (wk === 1) {
            for (let j_off = 0; j_off < CAL_H; j_off++) {
                for (let i_off = 0; i_off < w_day; i_off++) {
                    $("#tm-" + (j_off < 6 ? (j_off + 7) + "A" : (j_off - 6) + "P") + "-" + i_off).addClass("cal-no");
                }
            }
        }

        $("#date-rng").html("Week : " + _start_of_week.toLocaleDateString("en-US", date_options));
        $("#cal-wk").html("" + wk);
        $("#cal-ft").html("" + wk);

        let theSlot = "";
        var olen = Object.keys(_calender_data).length;
        for (var k = 0; k < olen; k++) {
            theSlot = _f_slot_for_time(parseInt(_calender_data[k].a_slot));
            if (theSlot) {
                switch (_calender_data[k].a_status) {
                    case "N": // set by owner
                        $("#" + theSlot).addClass("cal-navail");
                        break;
                    case "U": // set by customer
                        if (_calender_data[k].a_uuid === __uuid)
                            $("#" + theSlot).addClass("cal-user-lock");
                        else
                            $("#" + theSlot).addClass("cal-other-lock");
                        break;
                    default:
                        $("#" + theSlot).addClass("cal-navail");
                        break;
                }
            }
        }
        _current_week = (wk - 1);

        resolve();
    });
};

var _f_refresh_cal = function () {
    // load the "calender.html" now
    return _f_gofetch("undefined", {
        pg_url: "api/r1/calender_all?" +
                "cal_session=" + _calender_session,
        pg_id: "general_refresh"

    }).then(rpJson => {
        // hide the PASSED columns
        _calender_session = rpJson.cal_session;
        _start_of_cal = new Date();
        _start_of_cal.setTime(parseInt(rpJson.start_of_cal));
        var tm_offset = 60 * 1000 * _start_of_cal.getTimezoneOffset();
        _start_cal_local = new Date();
        _start_cal_local.setTime(_start_of_cal.getTime() + tm_offset);
        _start_of_week = new Date();
        _start_of_week.setTime(_start_cal_local.getTime());

        _calender_data = rpJson.cal_block;

        _f_show_cal_next(_current_week);

        return Promise.resolve();
    }).catch(error => {
        $('#page-body').popover({
            animation: true,
            content: "Calender Refresh Failed",
            delay: {/*"show": 500,*/ "hide": 10 * 1000},
            placement: 'bottom',
            trigger: 'focus'
        });
        return Promise.reject(error);
    });
};

var _tc_skip = function (offset) {
    _clear_TC_back();
    _f_show_cal_next(offset).then(() => {
        var __r_00 = function () {
            /*
             * function feature in 
             * LIBRARY ==> app.fetch.min.js 
             * ====================================================
             * restarts the receiving of TOUCH gestures
             * */
            _set_TC_back(_tc_back);
        };
        setTimeout(__r_00, 250);
    });
};

var _tc_back = function (valx, valy) {
    if (Math.abs(valx * 10) > 2) {
        /*
         * function feature in 
         * LIBRARY ==> app.fetch.min.js 
         * ====================================================
         * blocks the receiving of TOUCH gestures
         * */
        var offset = 0;
        if (valx < 0) {
            offset = 1;
        } else {
            offset = -1;
        }

        _tc_skip(offset);
    }
};

_f_pre_submit = function (theObj, options) {
    //var thisFormObj = $("#main-form");
    switch (theObj) {
        case "app-signin":
            // reset user session
            _userid = "";
            _usersession = -1;
            _userlevel = 0;
            // user clicked the signin button
            break;
    }
    return Promise.resolve();
    //return Promise.reject();
};
_f_post_submit = function (theObj, options) {
    //var thisFormObj = $("#main-form");
    _clear_TC_back();
    switch (theObj) {
        case "app-subscribe":
        case "app-signup":
        case "app-signin":
            // user clicked the signin button
            var do_refresh = true;
            return new Promise((resolve, reject) => {
                resolve();
            }).then(() => {
                let sError = "";

                if (typeof options.rpJson.noaccount === "string") {
                    $("#main-form").removeClass("was-validated");
                    $("#signin-block").removeClass("app-visible").addClass("app-hidden");
                    $("#signup-block").addClass("app-visible").removeClass("app-hidden");
                    $("#fullname").attr("required", true);
                    $("#password").attr("required", true);
                    $("#app-signup").html("Sign Up");
                    sError = "Please Sign Up:<br><br>This UserID does NOT Exist !";
                    throw new TypeError(sError);
                } else if (typeof options.rpJson.updateaccount === "string") {
                    $("#main-form").removeClass("was-validated");
                    $("#signin-block").removeClass("app-visible").addClass("app-hidden");
                    $("#signup-block").addClass("app-visible").removeClass("app-hidden");
                    $("#fullname").attr("required", true);
                    $("#password").attr("required", true);
                    $("#app-signup").html("Update");
                    sError = "You may proceed to UPDATE your account!";
                    throw new TypeError(sError);
                } else {
                    if ($("#fullname").attr("required")) {
                        $("#signin-block").addClass("app-visible").removeClass("app-hidden");
                        $("#signup-block").removeClass("app-visible").addClass("app-hidden");
                        $("#fullname").attr("required", false);
                        $("#password").attr("required", false);
                    }
                }
                if (!options.rpJson
                        || typeof options.rpJson.userid === "undefined"
                        || typeof options.rpJson.session === "undefined"
                        || typeof options.rpJson.session !== "number"
                        || typeof options.rpJson.level === "undefined"
                        || typeof options.rpJson.level !== "number"
                        || options.rpJson.session < 1
                        || options.rpJson.level < 0
                        || options.rpJson.level > 9
                        ) {
                    sError = "Error: Login request FAILED";
                    throw new TypeError(sError);
                }

                _userid = options.rpJson.userid;
                _usersession = options.rpJson.session;
                _userlevel = options.rpJson.level;
                _calender_session = options.rpJson.cal_session;
                __uuid = options.rpJson.id;
                return Promise.resolve();
            }).catch(error => {
                showErrorModal(error.message);
                return Promise.reject(error);
            }).then(() => {
                if (theObj === "app-subscribe") {
                    doSubscribeAction();
                    do_refresh = false;
                    return Promise.resolve();
                }
                return _f_goload("undefined", {
                    pg_url: "pg/calender.html"
                });
            }).then(() => {
                //-----------------------------------------------------
                // upadte the calendar with the data
                // calJson
                if (do_refresh) {
                    _current_week = 0;
                    _f_refresh_cal().then(() => {
                        _set_TC_back(_tc_back);
                    });
                } else {
                    _set_TC_back(_tc_back);
                }
                //$("#cal-map").html(JSON.stringify(calJson));
                return Promise.resolve();
            }).catch(error => {
                //let _perror = "Error: Login request FAILED <br>" + error.message;
                //showErrorModal(_perror);
                return Promise.reject(error);
            });
            break;

        default:
            return Promise.resolve();
            break;
    }
};
$(document)
        .on("click", "button.app-submit", function (event) {
            //$(_g_errorModal).toast('hide');
            _submit_handler($(this).attr("id"), {event: event});
            return false;
        }).on("click", "#cal-wk, #cal-ft",
        function (event) {
            $(_g_errorModal).toast('hide');
            if ($(this).attr("id") === "cal-ft") {
                _f_refresh_cal().then(() => {
                    _tc_skip(0);
                });
            } else {
                _tc_skip(1);
            }
        }).on("click", "#cal-tab td:not(.cal-no)",
        function (event) {
            // a double click means toggle between
            // AVAILABLE and NOT AVAILABLE
            $(_g_errorModal).toast('hide');
            _clear_TC_back();

            var that = this;
            setTimeout(function () {
                var dblclick = parseInt($(that).data('ckdouble'), 10);
                if (dblclick > 0) {
                    $(that).data('ckdouble', dblclick - 1);
                } else {
                    {
                        let do_cmd = false;
                        let notify = "N";
                        let s_cmd = "";
                        if (_userlevel > 5) {
                            if (!$(that).hasClass("cal-navail") && !$(that).hasClass("cal-other-lock")) {
                                do_cmd = true;
                            }

                            if (do_cmd) {
                                do {
                                    var theSlot = $(that).attr("id");
                                    let slot_date = _f_time_for_slot(theSlot);

                                    if ($(that).hasClass("cal-user-lock")) {
                                        s_cmd = "D";
                                    } else {
                                        s_cmd = "A";
                                    }

                                    var menu_resolve = 0, menu_reject = 0;
                                    var menu_choice = "";

                                    var menu_prom = new Promise((resolve, reject) => {
                                        menu_resolve = resolve;
                                        menu_reject = reject;
                                    });
                                    if (s_cmd === 'D') {
                                        if (!$(that).hasClass("cal-user-lock-delrq")) {
                                            $(that).addClass("cal-user-lock-setrq");
                                            var __r_01 = function () {
                                                $(that).removeClass("cal-user-lock-setrq");
                                                $(that).addClass("cal-user-lock-delrq");
                                                var __r_02 = function () {
                                                    $(that).removeClass("cal-user-lock-delrq");
                                                };
                                                setTimeout(__r_02, 3000);
                                            };
                                            setTimeout(__r_01, 2000);
                                            do_cmd = false;
                                            break;
                                        } else {
                                            $(that).removeClass("cal-user-lock-delrq");
                                            $(that).removeClass("cal-user-lock-setrq");
                                        }
                                        menu_resolve();
                                    } else {
                                        $('#t-menu').toast({delay: 30 * 1000});
                                        $('#t-menu').removeClass("app-hidden");
                                        $('#t-menu').toast("show");

                                        $("#menu-options .app-menu-option").on("click", function (event) {
                                            menu_choice = $(this).attr("data-menu");
                                            if (!menu_choice)
                                                menu_choice = "";
                                            $("#menu-options .app-menu-option").off("click");
                                            $('#t-menu').toast('hide');
                                        });
                                        $('#t-menu').on('hidden.bs.toast', function () {
                                            if (menu_choice) {
                                                menu_resolve();
                                            } else {
                                                menu_reject(new Error("no choice"));
                                            }
                                            $('#t-menu').off('hidden.bs.toast');
                                            $('#t-menu').addClass("app-hidden");
                                        });
                                    }

                                    var d_offset = slot_date.getTime() - _start_cal_local.getTime();
                                    var slot_time = _start_of_cal.getTime() + d_offset;

                                    var say_nothing = false;
                                    return menu_prom.catch(error => {
                                        console.log("nothibg selected ...");
                                        say_nothing = true;
                                        return Promise.reject(new Error("nothing selected"));
                                    }).then(() => {
                                        return _f_gofetch("undefined", {
                                            pg_url: "api/r1/cal_set_avail?" +
                                                    /*"uuid=" + __uuid +*/ //sent by default
                                                    "status=" + s_cmd +
                                                    "&alergy=none" +
                                                    "&user_session=" + _usersession +
                                                    /*"&level=" + _userlevel +*/ //sent by default
                                                    "&slot=" + slot_time +
                                                    "&cal_session=" + _calender_session +
                                                    "&notify=" + notify +
                                                    "&service=" + menu_choice,
                                            // SEND DIRECT - DONT CACHE !!!!
                                            direct: '0'});
                                    }).then(calJson => {
                                        var olen = Object.keys(_calender_data).length;
                                        if (s_cmd === "D") {
                                            if (_userlevel < 6) {
                                                $(that).removeClass("cal-navail");
                                                $(that).removeClass("cal-other-lock");
                                            }
                                            $(that).removeClass("cal-user-lock");

                                            for (var k = 0; k < olen; k++) {
                                                if (_calender_data[k].a_slot === slot_time) {
                                                    _calender_data.splice(k, 1);
                                                    break;
                                                }
                                            }
                                        } else {
                                            if (_userlevel < 6) {
                                                $(that).addClass("cal-navail");
                                            } else {
                                                $(that).addClass("cal-user-lock");
                                            }

                                            _calender_data.splice(olen, 0, {
                                                a_slot: slot_time,
                                                a_uuid: __uuid,
                                                a_alergy: "none",
                                                a_status: "U"
                                            });
                                        }

                                        return Promise.resolve();
                                    }).catch(error => {
                                        if (!say_nothing) {
                                            return _f_refresh_cal();
                                        }
                                    }).finally(() => {
                                        _reset_TC_back(_tc_back);
                                    });
                                } while (false);
                            }

                            if (!do_cmd) {
                                _reset_TC_back(_tc_back);
                            }
                        } else if ($(that).hasClass("cal-user-lock")
                                || $(that).hasClass("cal-other-lock")) {

                            let tg_id = $(that).attr("id");
                            let slot_time = _f_time_for_slot(tg_id, true/*remote*/);
                            slot_time = slot_time.getTime();

                            var olen = Object.keys(_calender_data).length;
                            var idx = -1;
                            for (var k = 0; k < olen; k++) {
                                if (slot_time === _calender_data[k].a_slot) {
                                    idx = k;
                                    break;
                                }
                            }

                            if (idx >= 0) {
                                $("#detail-1").html("Service  : " + (_calender_data[idx].a_service ? _calender_data[idx].a_service.trim() : ""));
                                $("#detail-2").html("Full Name: " + (_calender_data[idx].fullname ? _calender_data[idx].fullname.trim() : ""));
                                $("#detail-3").html("Phone #  : " + (_calender_data[idx].phone ? _calender_data[idx].phone.trim() : ""));
                                $("#detail-4").html("@Email   : " + (_calender_data[idx].email ? _calender_data[idx].email.trim() : ""));
                                $("#detail-5").html("Allergy  : " + (_calender_data[idx].allergy ? _calender_data[idx].allergy.trim() : ""));

                                $('#d-menu').toast({delay: 30 * 1000});
                                $('#d-menu').removeClass("app-hidden");
                                $('#d-menu').toast("show");

                                $("#detail-list").on("click", function (event) {
                                    $("#detail-list").off("click");
                                    $('#d-menu').toast('hide');
                                });
                                $('#d-menu').on('hidden.bs.toast', function () {
                                    $('#d-menu').off('hidden.bs.toast');
                                    $('#d-menu').addClass("app-hidden");
                                });
                            } else {
                                showErrorModal("INFO: NO details available for this Appointment");
                            }
                        }
                    }
                }
            }, 250);

            return false;
        }).on("dblclick", "#cal-tab td:not(.cal-no)",
        function (event) {
            $(this).data('ckdouble', 2);
            $(_g_errorModal).toast('hide');
            // a double click means toggle between
            // AVAILABLE and NOT AVAILABLE
            _clear_TC_back();

            let do_cmd = false;
            let notify = "N";
            if (_userlevel <= 5) {
                /*if ($(this).hasClass("cal-navail") || $(this).hasClass("cal-other-lock")) {
                 do_cmd = false;
                 }*/
                if ($(this).hasClass("cal-user-lock") || $(this).hasClass("cal-other-lock")) {
                    notify = "Y";
                }
                do_cmd = true;
            }

            if (do_cmd) {
                var theSlot = $(this).attr("id");
                let slot_date = _f_time_for_slot(theSlot);
                var s_cmd = "A";

                if ($(this).hasClass("cal-navail")
                        || $(this).hasClass("cal-other-lock")
                        || $(this).hasClass("cal-user-lock")) {
                    s_cmd = "D";
                }

                var d_offset = slot_date.getTime() - _start_cal_local.getTime();
                var slot_time = _start_of_cal.getTime() + d_offset;
                return _f_gofetch("undefined", {
                    pg_url: "api/r1/cal_set_avail?" +
                            /*"uuid=" + __uuid +*/ //sent by default
                            "status=" + s_cmd +
                            "&alergy=none" +
                            "&user_session=" + _usersession +
                            /*"&level=" + _userlevel +*/ //sent by default
                            "&slot=" + slot_time +
                            "&cal_session=" + _calender_session +
                            "&notify=" + notify +
                            "&service=",
                    // SEND DIRECT - DONT CACHE !!!!
                    direct: '0'
                }).then(calJson => {
                    var olen = Object.keys(_calender_data).length;
                    if (s_cmd === "D") {
                        $(this).removeClass("cal-navail");
                        $(this).removeClass("cal-other-lock");
                        $(this).removeClass("cal-user-lock");

                        for (var k = 0; k < olen; k++) {
                            if (_calender_data[k].a_slot === slot_time) {
                                _calender_data.splice(k, 1);
                                break;
                            }
                        }
                    } else {
                        $(this).addClass("cal-navail");

                        _calender_data.splice(olen, 0, {
                            a_slot: slot_time,
                            a_uuid: __uuid,
                            a_alergy: "none",
                            a_status: "N"
                        });
                    }
                    return Promise.resolve();
                }).catch(error => {
                    return _f_refresh_cal();
                }).finally(() => {
                    _reset_TC_back(_tc_back);
                });
            } else {
                _reset_TC_back(_tc_back);
            }
            return false;
        });

